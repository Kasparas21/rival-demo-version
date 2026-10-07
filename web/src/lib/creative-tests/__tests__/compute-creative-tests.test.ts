import { describe, it, expect } from "vitest";

import {
  ALL_KILLED_FAST_THRESHOLD_DAYS,
  computeCreativeTestsData,
  extractLaunchDate,
  launchDateKeyForAd,
  medianLifespanDaysFloat,
} from "../compute-creative-tests";

describe("extractLaunchDate", () => {
  it("handles ISO format with T separator", () => {
    expect(extractLaunchDate("2026-05-10T21:00:00+00:00")).toBe("2026-05-10");
  });

  it("handles Postgres format with space separator", () => {
    expect(extractLaunchDate("2026-05-10 21:00:00+00")).toBe("2026-05-10");
  });

  it("handles date-only format", () => {
    expect(extractLaunchDate("2026-05-10")).toBe("2026-05-10");
  });
});

const USER = "user-1";
const COMP = "comp-1";

function ad(p: {
  id: string;
  platform: string;
  first: string;
  last: string;
  aiLaunch?: string | null;
  text?: string;
  angle?: string | null;
  active?: boolean;
  reach?: number;
}): Parameters<typeof computeCreativeTestsData>[0]["ads"][0] {
  return {
    id: p.id,
    platform: p.platform,
    first_seen_at: p.first,
    last_seen_at: p.last,
    ai_extracted_launch_date: p.aiLaunch ?? null,
    ad_creative_url: null,
    ad_text: p.text ?? "The Penny Clog went viral the day it hit our site",
    ai_extracted_angle: p.angle ?? null,
    format: "image",
    ...(p.active != null ? { is_active: p.active } : {}),
    ...(p.reach != null ? { reach: p.reach } : {}),
  };
}

describe("computeCreativeTestsData", () => {
  const scrapeIso = "2030-06-15T12:00:00.000Z";
  /** Everything strictly before this is "killed" */
  const killedCutoff = "2030-06-14T12:00:00.000Z";

  it("groups variants launched within 3 days on one platform; leaves later launches out", () => {
    const tests = computeCreativeTestsData({
      userId: USER,
      competitorId: COMP,
      lastScrapedAtIso: scrapeIso,
      ads: [
        ad({ id: "a", platform: "meta", first: "2030-01-01T08:00:00.000Z", last: killedCutoff }),
        ad({ id: "b", platform: "meta", first: "2030-01-01T10:00:00.000Z", last: killedCutoff }),
        ad({ id: "c", platform: "meta", first: "2030-01-02T10:00:00.000Z", last: killedCutoff }),
        ad({ id: "late", platform: "meta", first: "2030-01-10T10:00:00.000Z", last: killedCutoff }),
      ],
    });
    expect(tests).toHaveLength(1);
    expect(tests[0]!.launch_date).toBe("2030-01-01");
    expect(tests[0]!.ad_ids.sort()).toEqual(["a", "b", "c"]);
  });

  it("groups ads when first_seen uses Postgres space-separated timestamps", () => {
    const tests = computeCreativeTestsData({
      userId: USER,
      competitorId: COMP,
      lastScrapedAtIso: scrapeIso,
      ads: [
        ad({ id: "a", platform: "meta", first: "2030-01-01 08:00:00+00", last: killedCutoff }),
        ad({ id: "b", platform: "meta", first: "2030-01-01 10:00:00+00", last: killedCutoff }),
      ],
    });
    expect(tests).toHaveLength(1);
    expect(tests[0]!.launch_date).toBe("2030-01-01");
    expect(tests[0]!.ad_count).toBe(2);
  });

  it("classifies winner_identified when one clear max meets 2× median and ≥14d and all killed", () => {
    const tests = computeCreativeTestsData({
      userId: USER,
      competitorId: COMP,
      lastScrapedAtIso: scrapeIso,
      ads: [
        ad({ id: "short1", platform: "meta", first: "2030-01-01T00:00:00.000Z", last: "2030-01-15T00:00:00.000Z" }),
        ad({ id: "short2", platform: "meta", first: "2030-01-01T00:00:00.000Z", last: "2030-01-15T00:00:00.000Z" }),
        ad({
          id: "winner",
          platform: "meta",
          first: "2030-01-01T00:00:00.000Z",
          last: "2030-02-20T00:00:00.000Z",
        }),
      ],
    });
    expect(tests).toHaveLength(1);
    const t = tests[0]!;
    expect(t.test_status).toBe("winner_identified");
    expect(t.winner_ad_id).toBe("winner");
    expect(t.winner_lifespan_days).toBeGreaterThanOrEqual(14);
  });

  it("names the one variant left running after the others stopped", () => {
    const tests = computeCreativeTestsData({
      userId: USER,
      competitorId: COMP,
      lastScrapedAtIso: scrapeIso,
      ads: [
        ad({ id: "dead", platform: "meta", first: "2030-01-01T00:00:00.000Z", last: "2030-06-01T00:00:00.000Z" }),
        ad({
          id: "live",
          platform: "meta",
          first: "2030-01-01T00:00:00.000Z",
          last: "2030-06-14T20:00:00.000Z",
        }),
      ],
    });
    expect(tests[0]!.test_status).toBe("winner_identified");
    expect(tests[0]!.winner_ad_id).toBe("live");
  });

  it("waits when the others stopped only a day before the survivor's last sighting", () => {
    const tests = computeCreativeTestsData({
      userId: USER,
      competitorId: COMP,
      lastScrapedAtIso: scrapeIso,
      ads: [
        ad({ id: "a", platform: "meta", first: "2030-04-01T00:00:00.000Z", last: "2030-06-14T00:00:00.000Z", active: false }),
        ad({ id: "b", platform: "meta", first: "2030-04-01T00:00:00.000Z", last: "2030-06-15T00:00:00.000Z", active: true }),
      ],
    });
    expect(tests[0]!.test_status).toBe("running");
    expect(tests[0]!.winner_ad_id).toBeNull();
  });

  it("is running while several variants are still live", () => {
    const tests = computeCreativeTestsData({
      userId: USER,
      competitorId: COMP,
      lastScrapedAtIso: scrapeIso,
      ads: [
        ad({ id: "a", platform: "meta", first: "2030-05-01T00:00:00.000Z", last: "2030-06-15T00:00:00.000Z", active: true }),
        ad({ id: "b", platform: "meta", first: "2030-05-01T00:00:00.000Z", last: "2030-06-15T00:00:00.000Z", active: true }),
        ad({ id: "c", platform: "meta", first: "2030-05-01T00:00:00.000Z", last: "2030-05-05T00:00:00.000Z", active: false }),
      ],
    });
    expect(tests[0]!.test_status).toBe("running");
  });

  it("lets a 3× reach lead pick the winner among live variants", () => {
    const tests = computeCreativeTestsData({
      userId: USER,
      competitorId: COMP,
      lastScrapedAtIso: scrapeIso,
      ads: [
        ad({ id: "a", platform: "meta", first: "2030-05-01T00:00:00.000Z", last: "2030-06-15T00:00:00.000Z", active: true, reach: 30_000 }),
        ad({ id: "b", platform: "meta", first: "2030-05-01T00:00:00.000Z", last: "2030-06-15T00:00:00.000Z", active: true, reach: 4_000 }),
      ],
    });
    expect(tests[0]!.winner_ad_id).toBe("a");
  });

  it("doesn't call different ads launched the same day a test", () => {
    const tests = computeCreativeTestsData({
      userId: USER,
      competitorId: COMP,
      lastScrapedAtIso: scrapeIso,
      ads: [
        ad({ id: "a", platform: "meta", first: "2030-01-01T00:00:00.000Z", last: killedCutoff, text: "Fall boots are back in three new colors" }),
        ad({ id: "b", platform: "meta", first: "2030-01-01T00:00:00.000Z", last: killedCutoff, text: "Free shipping on every order this weekend only" }),
      ],
    });
    expect(tests).toHaveLength(0);
  });

  it("skips bulk launches bigger than a test", () => {
    const ads = Array.from({ length: 12 }, (_, i) =>
      ad({ id: `bulk${i}`, platform: "meta", first: "2030-01-01T00:00:00.000Z", last: killedCutoff }),
    );
    expect(computeCreativeTestsData({ userId: USER, competitorId: COMP, lastScrapedAtIso: scrapeIso, ads })).toHaveLength(0);
  });

  it("ignores Google rows that only carry placeholder text", () => {
    const placeholder = "Allbirds Inc — allbirds.com\n\nImage · Shown 2026-01-01 → 2026-10-06\n\n2026-01-01 – 2026-10-06\n\nAllbirds Inc";
    const tests = computeCreativeTestsData({
      userId: USER,
      competitorId: COMP,
      lastScrapedAtIso: scrapeIso,
      ads: [
        ad({ id: "g1", platform: "google", first: "2030-01-01T00:00:00.000Z", last: killedCutoff, text: placeholder }),
        ad({ id: "g2", platform: "google", first: "2030-01-01T00:00:00.000Z", last: killedCutoff, text: placeholder }),
      ],
    });
    expect(tests).toHaveLength(0);
  });

  it("classifies all_killed_fast when max lifespan < 7 days", () => {
    const tests = computeCreativeTestsData({
      userId: USER,
      competitorId: COMP,
      lastScrapedAtIso: scrapeIso,
      ads: [
        ad({ id: "a", platform: "meta", first: "2030-01-01T00:00:00.000Z", last: "2030-01-04T00:00:00.000Z" }),
        ad({ id: "b", platform: "meta", first: "2030-01-01T00:00:00.000Z", last: "2030-01-06T00:00:00.000Z" }),
      ],
    });
    expect(tests[0]!.test_status).toBe("all_killed_fast");
    expect(tests[0]!.max_lifespan_days).toBeLessThan(ALL_KILLED_FAST_THRESHOLD_DAYS);
  });

  it("classifies no_clear_winner when all killed, not fast-fail, but no 2× median winner", () => {
    const tests = computeCreativeTestsData({
      userId: USER,
      competitorId: COMP,
      lastScrapedAtIso: scrapeIso,
      ads: [
        ad({
          id: "a",
          platform: "meta",
          first: "2030-01-01T00:00:00.000Z",
          last: "2030-01-25T00:00:00.000Z",
        }),
        ad({
          id: "b",
          platform: "meta",
          first: "2030-01-01T00:00:00.000Z",
          last: "2030-01-27T00:00:00.000Z",
        }),
      ],
    });
    expect(tests[0]!.test_status).toBe("no_clear_winner");
    expect(tests[0]!.winner_ad_id).toBeNull();
  });

  it("uses ai_extracted_launch_date when available for grouping", () => {
    const tests = computeCreativeTestsData({
      userId: USER,
      competitorId: COMP,
      lastScrapedAtIso: scrapeIso,
      ads: [
        ad({
          id: "a",
          platform: "meta",
          first: "2030-01-10T00:00:00.000Z",
          last: killedCutoff,
          aiLaunch: "2030-01-01T00:00:00.000Z",
        }),
        ad({
          id: "b",
          platform: "meta",
          first: "2030-01-01T00:00:00.000Z",
          last: killedCutoff,
          aiLaunch: null,
        }),
      ],
    });
    expect(tests).toHaveLength(1);
    expect(tests[0]!.launch_date).toBe("2030-01-01");
  });

  it("is no_clear_winner when two ads tie for max lifespan and both meet spread (ambiguous winner)", () => {
    const tests = computeCreativeTestsData({
      userId: USER,
      competitorId: COMP,
      lastScrapedAtIso: scrapeIso,
      ads: [
        ad({ id: "a", platform: "meta", first: "2030-01-01T00:00:00.000Z", last: "2030-01-01T00:00:00.000Z" }),
        ad({ id: "b", platform: "meta", first: "2030-01-01T00:00:00.000Z", last: "2030-01-01T00:00:00.000Z" }),
        ad({ id: "c", platform: "meta", first: "2030-01-01T00:00:00.000Z", last: "2030-01-26T00:00:00.000Z" }),
        ad({ id: "d", platform: "meta", first: "2030-01-01T00:00:00.000Z", last: "2030-01-26T00:00:00.000Z" }),
      ],
    });
    expect(tests[0]!.test_status).toBe("no_clear_winner");
  });
});

describe("launchDateKeyForAd", () => {
  it("prefers ai_extracted_launch_date", () => {
    expect(
      launchDateKeyForAd({
        ai_extracted_launch_date: "2030-01-01T00:00:00.000Z",
        first_seen_at: "2030-01-15T00:00:00.000Z",
      }),
    ).toBe("2030-01-01");
  });
});

describe("medianLifespanDaysFloat", () => {
  it("averages two middle values when length is even", () => {
    expect(medianLifespanDaysFloat([7, 30])).toBe(18.5);
  });
});
