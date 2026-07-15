import type { TimelineAd } from "@/components/competitor/tests-timeline/timeline-types";

import type {
  DemoAd,
  DemoCreativeTest,
  DemoCreativeTestAd,
  DemoCreativeTestStatus,
} from "@/lib/demo/dashboard-demo-data";
import { frozenAdToDemoAd } from "@/lib/demo/demo-frozen-ads-payload";
import {
  FROZEN_AD_BY_ID,
  FROZEN_CREATIVE_TESTS,
  FROZEN_TIMELINE_ADS,
  type FrozenScrapedAd,
} from "@/lib/demo/frozen/frozen-adidas-com-ads";

const DAY_MS = 24 * 60 * 60 * 1000;
const DEMO_NOW_MS = Date.parse("2026-07-15T12:00:00.000Z");

function isoFromMs(ms: number): string {
  return new Date(ms).toISOString();
}

function inferFunnel(angle: string | null | undefined): DemoAd["funnel"] {
  const a = (angle ?? "").toLowerCase();
  if (a.includes("discount") || a.includes("outlet") || a.includes("sale") || a.includes("rabatt")) {
    return "bottom";
  }
  if (a.includes("product") || a.includes("quality") || a.includes("shop")) return "middle";
  return "top";
}

function inferAngleLabel(angle: string | null | undefined): string {
  const a = (angle ?? "").toLowerCase();
  if (a.includes("discount") || a.includes("outlet") || a.includes("sale") || a.includes("rabatt")) {
    return "Discount urgency";
  }
  if (a.includes("product") || a.includes("quality") || a.includes("shop")) return "Product push";
  return "Brand awareness";
}

function frozenToTimelineAd(
  ad: FrozenScrapedAd,
  opts: { durationDays: number; endedDaysAgo?: number; killed?: boolean; winner?: boolean },
): TimelineAd {
  const endedDaysAgo = opts.endedDaysAgo ?? 0;
  const lastMs = DEMO_NOW_MS - endedDaysAgo * DAY_MS;
  const firstMs = lastMs - opts.durationDays * DAY_MS;
  const url = ad.frozen_creative_url;
  return {
    id: ad.id,
    platform: ad.platform,
    ad_creative_url: url,
    archived_creative_url: url,
    ad_text: ad.ad_text,
    ai_extracted_angle: ad.ai_extracted_angle,
    first_seen_at: isoFromMs(firstMs),
    last_seen_at: isoFromMs(lastMs),
    format: ad.format,
    is_winner: Boolean(opts.winner),
    is_killed: Boolean(opts.killed),
  };
}

/** Google + Meta bars with varied lifespans (not uniform 7-day windows). */
const TIMELINE_SPECS: { id: string; durationDays: number; endedDaysAgo?: number; killed?: boolean; winner?: boolean }[] =
  [
    { id: "722a2218-8662-443f-8d27-18995208ea0c", durationDays: 54, winner: true },
    { id: "3f000293-b8de-4e88-831b-d9a8b8fd9499", durationDays: 4, endedDaysAgo: 18, killed: true },
    { id: "bea8ebee-4e35-4427-9705-41f185c4ce77", durationDays: 26, endedDaysAgo: 2 },
    { id: "8fc2818b-9416-4f8e-94a1-c6d93b3b2b5b", durationDays: 93, winner: true },
    { id: "e1a57570-6cbd-4f6c-8ad1-061dc051b7bf", durationDays: 11, endedDaysAgo: 6 },
    { id: "eed8280f-6999-419f-ad7a-75a8b7522105", durationDays: 3, endedDaysAgo: 24, killed: true },
    { id: "657e3604-275b-4384-b187-9d943342f7fb", durationDays: 41, endedDaysAgo: 1 },
    { id: "030395e4-882e-4aeb-a533-0add5a9a6716", durationDays: 19 },
    { id: "6cf3d059-d0b1-490d-ad01-c80a42e7655f", durationDays: 37, winner: true },
    { id: "a1f8a56d-2085-4d04-929c-46f4388e3b3a", durationDays: 8, endedDaysAgo: 9, killed: true },
    { id: "43ea76a7-9142-440d-955d-92ea45a32df5", durationDays: 22, endedDaysAgo: 3 },
    { id: "97a65ab6-1e40-49bc-b700-d795909fe114", durationDays: 68, winner: true },
  ];

export function buildPresentedFrozenTimelineAds(): TimelineAd[] {
  const rows: TimelineAd[] = [];
  for (const spec of TIMELINE_SPECS) {
    const ad = FROZEN_AD_BY_ID[spec.id];
    if (!ad) continue;
    rows.push(frozenToTimelineAd(ad, spec));
  }
  if (!rows.length) return FROZEN_TIMELINE_ADS;
  return rows;
}

function stretchTestAd(ad: DemoCreativeTestAd, lifespanDays: number, stillRunning: boolean): DemoCreativeTestAd {
  const lastMs = stillRunning ? DEMO_NOW_MS : DEMO_NOW_MS - 5 * DAY_MS;
  const firstMs = lastMs - lifespanDays * DAY_MS;
  return {
    ...ad,
    first_seen_at: isoFromMs(firstMs),
    last_seen_at: isoFromMs(lastMs),
  };
}

function testAdFromFrozen(ad: FrozenScrapedAd): DemoCreativeTestAd {
  return {
    id: ad.id,
    platform: ad.platform,
    format: ad.format,
    ad_text: ad.ad_text,
    ai_extracted_angle: ad.ai_extracted_angle,
    first_seen_at: ad.first_seen_at,
    last_seen_at: ad.last_seen_at,
    ad_creative_url: ad.frozen_creative_url,
    archived_creative_url: ad.frozen_creative_url,
  };
}

function buildSyntheticCreativeTest(opts: {
  id: string;
  launchDate: string;
  platform: string;
  status: DemoCreativeTestStatus;
  adIds: string[];
  lifespans: number[];
  stillRunning: boolean[];
  winnerAdId?: string | null;
}): DemoCreativeTest | null {
  const ads: DemoCreativeTestAd[] = [];
  for (let i = 0; i < opts.adIds.length; i++) {
    const frozen = FROZEN_AD_BY_ID[opts.adIds[i]!];
    if (!frozen) continue;
    ads.push(
      stretchTestAd(
        testAdFromFrozen(frozen),
        opts.lifespans[i] ?? 10,
        opts.stillRunning[i] ?? false,
      ),
    );
  }
  if (ads.length < 2) return null;
  const lifespans = ads.map((a) =>
    Math.max(1, Math.floor((Date.parse(a.last_seen_at) - Date.parse(a.first_seen_at)) / DAY_MS)),
  );
  lifespans.sort((a, b) => a - b);
  const median = lifespans[Math.floor(lifespans.length / 2)] ?? 0;
  const max = lifespans[lifespans.length - 1] ?? 0;
  const winnerLifespan = opts.winnerAdId
    ? lifespans[ads.findIndex((a) => a.id === opts.winnerAdId)] ?? null
    : null;

  return {
    id: opts.id,
    launch_date: opts.launchDate,
    platform: opts.platform,
    ad_ids: ads.map((a) => a.id),
    winner_ad_id: opts.winnerAdId ?? null,
    test_status: opts.status,
    median_lifespan_days: median,
    max_lifespan_days: max,
    winner_lifespan_days: winnerLifespan,
    ad_count: ads.length,
    ads,
  };
}

function presentBaseCreativeTest(test: DemoCreativeTest): DemoCreativeTest {
  const lifespanPatterns =
    test.test_status === "all_killed_fast"
      ? [3, 4, 2]
      : test.test_status === "winner_identified"
        ? [34, 12, 8]
        : [18, 11, 24, 9];
  const stillRunning =
    test.test_status === "running"
      ? test.ads.map((_, i) => i < 2)
      : test.ads.map(() => false);

  const ads = test.ads.map((ad, i) =>
    stretchTestAd(ad, lifespanPatterns[i] ?? 14, stillRunning[i] ?? false),
  );
  const lifespans = ads.map((a) =>
    Math.max(1, Math.floor((Date.parse(a.last_seen_at) - Date.parse(a.first_seen_at)) / DAY_MS)),
  );
  lifespans.sort((a, b) => a - b);

  return {
    ...test,
    ads,
    median_lifespan_days: lifespans[Math.floor(lifespans.length / 2)] ?? test.median_lifespan_days,
    max_lifespan_days: lifespans[lifespans.length - 1] ?? test.max_lifespan_days,
  };
}

export function buildPresentedFrozenCreativeTests(): DemoCreativeTest[] {
  const base = FROZEN_CREATIVE_TESTS.map(presentBaseCreativeTest);

  const extras = [
    buildSyntheticCreativeTest({
      id: "demo-ct-adidas-winner",
      launchDate: "2026-05-18",
      platform: "meta",
      status: "winner_identified",
      adIds: ["6cf3d059-d0b1-490d-ad01-c80a42e7655f", "030395e4-882e-4aeb-a533-0add5a9a6716", "85928b31-ebe1-4554-9a7d-32d65c2e88de"],
      lifespans: [42, 19, 11],
      stillRunning: [true, false, false],
      winnerAdId: "6cf3d059-d0b1-490d-ad01-c80a42e7655f",
    }),
    buildSyntheticCreativeTest({
      id: "demo-ct-adidas-fast-kill",
      launchDate: "2026-06-08",
      platform: "meta",
      status: "all_killed_fast",
      adIds: ["ccdeb672-c043-43ce-8a8c-c65c520a6f3c", "15b383cd-693e-40ba-8c4b-791490003dd0"],
      lifespans: [3, 2],
      stillRunning: [false, false],
    }),
    buildSyntheticCreativeTest({
      id: "demo-ct-adidas-running",
      launchDate: "2026-07-02",
      platform: "meta",
      status: "running",
      adIds: ["a1f8a56d-2085-4d04-929c-46f4388e3b3a", "3eb15684-aa0c-4141-949e-d047241f432b", "23a038b8-e7f2-4d5b-8043-94f1ce066f89"],
      lifespans: [13, 13, 9],
      stillRunning: [true, true, false],
    }),
  ].filter((t): t is DemoCreativeTest => t != null);

  return [...extras, ...base];
}

const COPY_VAULT_LIFESPANS: Record<string, number> = {
  "6cf3d059-d0b1-490d-ad01-c80a42e7655f": 56,
  "97a65ab6-1e40-49bc-b700-d795909fe114": 74,
  "8fc2818b-9416-4f8e-94a1-c6d93b3b2b5b": 91,
  "722a2218-8662-443f-8d27-18995208ea0c": 54,
  "43ea76a7-9142-440d-955d-92ea45a32df5": 41,
  "030395e4-882e-4aeb-a533-0add5a9a6716": 24,
  "bea8ebee-4e35-4427-9705-41f185c4ce77": 26,
  "657e3604-275b-4384-b187-9d943342f7fb": 38,
  "684df3bf-b1fa-4e79-ae73-86313303d5f8": 31,
  "785fd861-4989-4ef2-b57c-ef403c80be96": 29,
  "5cd5a4ec-d624-4e6e-b0eb-9125ae40816b": 27,
  "ae489d43-7d3d-4b5b-a22c-c3db3dc0f329": 22,
  "a1f8a56d-2085-4d04-929c-46f4388e3b3a": 18,
  "21041028-07ed-4087-a71b-3b70cc94c402": 16,
  "85928b31-ebe1-4554-9a7d-32d65c2e88de": 14,
  "3eb15684-aa0c-4141-949e-d047241f432b": 12,
  "eed8280f-6999-419f-ad7a-75a8b7522105": 3,
  "3f000293-b8de-4e88-831b-d9a8b8fd9499": 4,
};

export function buildFrozenCopyVaultAds(domain = "competitor-a.com"): DemoAd[] {
  return Object.values(FROZEN_AD_BY_ID)
    .map((ad) => {
      const demo = frozenAdToDemoAd(ad, domain);
      const lifespan = COPY_VAULT_LIFESPANS[ad.id] ?? demo.lifespanDays ?? demo.activeDays;
      return {
        ...demo,
        lifespanDays: lifespan,
        activeDays: lifespan,
        funnel: inferFunnel(ad.ai_extracted_angle),
        angle: inferAngleLabel(ad.ai_extracted_angle),
      };
    })
    .sort((a, b) => (b.lifespanDays ?? 0) - (a.lifespanDays ?? 0));
}

export function buildPresentedFrozenTimelineDateRange(): { earliest: string; latest: string } {
  const ads = buildPresentedFrozenTimelineAds();
  const times = ads.flatMap((ad) => [Date.parse(ad.first_seen_at), Date.parse(ad.last_seen_at)]).filter(Number.isFinite);
  if (!times.length) {
    return { earliest: "2026-03-01T00:00:00.000Z", latest: "2026-07-15T12:00:00.000Z" };
  }
  return {
    earliest: new Date(Math.min(...times)).toISOString(),
    latest: new Date(Math.max(...times)).toISOString(),
  };
}
