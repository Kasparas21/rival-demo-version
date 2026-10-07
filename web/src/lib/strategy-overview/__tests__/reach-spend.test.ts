import { describe, expect, it } from "vitest";

import {
  DEFAULT_META_CPM,
  estimatePlatformSpend,
  META_FREQUENCY,
  metaAdMonthlySpendFromReach,
  metaCpmForCountry,
  metaReachByCountry,
  sumAdSpend,
} from "@/lib/strategy-overview/reach-spend";

const NOW = Date.parse("2026-10-07T00:00:00Z");
const daysAgo = (d: number) => new Date(NOW - d * 86_400_000).toISOString();

/** Shape of a real scraped Meta ad (EU transparency block). */
function metaPayload(total: number, breakdown: Array<{ country: string; people: number }>) {
  return {
    transparency_by_location: {
      eu_transparency: {
        eu_total_reach: total,
        age_country_gender_reach_breakdown: breakdown.map(({ country, people }) => ({
          country,
          age_gender_breakdowns: [
            { age_range: "25-34", male: Math.floor(people / 2), female: Math.ceil(people / 2), unknown: null },
          ],
        })),
      },
    },
  };
}

describe("metaReachByCountry", () => {
  it("splits total reach by the country breakdown", () => {
    const r = metaReachByCountry(metaPayload(3000, [{ country: "LT", people: 1000 }, { country: "de", people: 500 }]));
    expect(r?.get("LT")).toBeCloseTo(2000);
    expect(r?.get("DE")).toBeCloseTo(1000);
  });

  it("keeps the total when there is no breakdown", () => {
    const r = metaReachByCountry({ transparency_by_location: { eu_transparency: { eu_total_reach: 2643 } } });
    expect([...(r?.values() ?? [])]).toEqual([2643]);
  });

  it("is null without reach data", () => {
    expect(metaReachByCountry({ impressionsIndex: -1 })).toBeNull();
    expect(metaReachByCountry(null)).toBeNull();
  });
});

describe("metaAdMonthlySpendFromReach", () => {
  it("prices reach per country and scales to a month", () => {
    const ad = { raw_payload: metaPayload(10_000, [{ country: "LT", people: 10_000 }]), first_seen_at: daysAgo(60) };
    const r = metaAdMonthlySpendFromReach(ad, NOW)!;
    const lt = metaCpmForCountry("LT");
    expect(r.low).toBeCloseTo(((10_000 * META_FREQUENCY.low * lt.low) / 1000) * (30 / 60));
    expect(r.high).toBeCloseTo(((10_000 * META_FREQUENCY.high * lt.high) / 1000) * (30 / 60));
  });

  it("prices a German view higher than a Lithuanian one", () => {
    const lt = metaAdMonthlySpendFromReach({ raw_payload: metaPayload(5000, [{ country: "LT", people: 5000 }]), first_seen_at: daysAgo(30) }, NOW)!;
    const de = metaAdMonthlySpendFromReach({ raw_payload: metaPayload(5000, [{ country: "DE", people: 5000 }]), first_seen_at: daysAgo(30) }, NOW)!;
    expect(de.low).toBeGreaterThan(lt.low);
  });

  it("doesn't blow up two days of reach into a huge monthly figure", () => {
    const two = metaAdMonthlySpendFromReach({ raw_payload: metaPayload(7000, []), first_seen_at: daysAgo(2) }, NOW)!;
    const seven = metaAdMonthlySpendFromReach({ raw_payload: metaPayload(7000, []), first_seen_at: daysAgo(7) }, NOW)!;
    expect(two.low).toBeCloseTo(seven.low);
    expect(two.low).toBeCloseTo((7000 * META_FREQUENCY.low * DEFAULT_META_CPM.low) / 1000 * (30 / 7));
  });
});

describe("estimatePlatformSpend", () => {
  const fallback = (n: number) => ({ low: n * 100, high: n * 300 });

  it("uses reach where it exists and the fallback elsewhere", () => {
    const ads = [
      { id: "a", raw_payload: metaPayload(10_000, [{ country: "LT", people: 10_000 }]), first_seen_at: daysAgo(30) },
      { id: "b", raw_payload: {}, first_seen_at: daysAgo(30) },
    ];
    const s = estimatePlatformSpend("meta", ads, fallback, NOW);
    expect(s.reachBasedAds).toBe(1);
    expect(s.totalAds).toBe(2);
    const a = metaAdMonthlySpendFromReach(ads[0]!, NOW)!;
    expect(s.low).toBe(Math.round(a.low + 100));
  });

  it("prices Meta ads without reach at the median of the competitor's own priced ads once there are 5", () => {
    const priced = [1, 2, 3, 4, 5].map((i) => ({
      id: `p${i}`,
      raw_payload: metaPayload(i * 1000, [{ country: "LT", people: i * 1000 }]),
      first_seen_at: daysAgo(30),
    }));
    const s = estimatePlatformSpend("meta", [...priced, { id: "x", raw_payload: {}, first_seen_at: daysAgo(30) }], fallback, NOW);
    expect(s.perAd.get("x")).toEqual(s.perAd.get("p3"));
  });

  it("never reads reach on other platforms", () => {
    const s = estimatePlatformSpend(
      "google",
      [{ id: "g", raw_payload: metaPayload(10_000, []), first_seen_at: daysAgo(30) }],
      fallback,
      NOW,
    );
    expect(s.reachBasedAds).toBe(0);
    expect([s.low, s.high]).toEqual([100, 300]);
  });

  it("lets cells add up to the platform total", () => {
    const ads = ["a", "b", "c"].map((id) => ({ id, raw_payload: {}, first_seen_at: daysAgo(30) }));
    const s = estimatePlatformSpend("tiktok", ads, fallback, NOW);
    const parts = [sumAdSpend(s.perAd, ["a"]), sumAdSpend(s.perAd, ["b", "c"])];
    expect(parts[0]!.low + parts[1]!.low).toBe(s.low);
  });
});
