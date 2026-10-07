/**
 * Spend from real delivery data. Meta publishes, for ads delivered in the EU, how many people each ad
 * reached (`eu_total_reach`) and how that splits by country. We price that reach per country:
 *
 *   ad spend over its life ≈ Σ_country reach_c × frequency × CPM_c / 1000
 *   monthly spend          ≈ that × 30 / days the ad has been running
 *
 * Frequency (views per person) and CPM (price per 1,000 views) are benchmarks, so the result is a
 * low–high range. Ads without reach data fall back to the ad-count model in `adBenchmarks.ts`.
 */

export type EurRange = { low: number; high: number };

/** Lifetime views per person reached on Meta (typical 1.3–2.2). */
export const META_FREQUENCY: EurRange = { low: 1.3, high: 2.2 };

/** Meta CPM benchmarks in EUR per 1,000 impressions, by ISO country code. */
const CPM_BY_COUNTRY_GROUP: Array<{ countries: string[]; cpm: EurRange }> = [
  { countries: ["LT", "LV", "EE"], cpm: { low: 1.5, high: 4 } },
  { countries: ["PL", "CZ", "SK", "HU", "RO", "BG", "HR", "SI", "GR", "PT", "CY", "MT"], cpm: { low: 2, high: 5 } },
  { countries: ["ES", "IT"], cpm: { low: 3, high: 7 } },
  { countries: ["DE", "FR", "NL", "BE", "AT", "IE", "LU"], cpm: { low: 5, high: 11 } },
  { countries: ["SE", "DK", "FI", "NO", "IS"], cpm: { low: 5, high: 11 } },
  { countries: ["CH", "LI"], cpm: { low: 8, high: 15 } },
  { countries: ["GB"], cpm: { low: 6, high: 12 } },
  { countries: ["US", "CA", "AU", "NZ"], cpm: { low: 8, high: 16 } },
];

/** Used when the country is unknown or outside the table. */
export const DEFAULT_META_CPM: EurRange = { low: 3, high: 9 };

const CPM_BY_COUNTRY = new Map<string, EurRange>(
  CPM_BY_COUNTRY_GROUP.flatMap(({ countries, cpm }) => countries.map((c) => [c, cpm] as const)),
);

export function metaCpmForCountry(country: string | null | undefined): EurRange {
  return CPM_BY_COUNTRY.get((country ?? "").trim().toUpperCase()) ?? DEFAULT_META_CPM;
}

/** Brand-new ads get a floor so two days of reach isn't multiplied by 15 into a monthly figure. */
const MIN_RUN_DAYS = 7;

function obj(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function num(v: unknown): number {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * People reached per country for a Meta ad, from the scraped EU transparency block, or null when the
 * ad has no reach data (not delivered in the EU, or the scrape didn't include it).
 * The country split comes from the age/gender breakdown and is scaled to `eu_total_reach`.
 */
export function metaReachByCountry(rawPayload: unknown): Map<string, number> | null {
  const root = obj(rawPayload);
  if (!root) return null;
  const eu = obj(obj(root.transparency_by_location)?.eu_transparency);
  const total = num(eu?.eu_total_reach);
  if (total <= 0) return null;

  const breakdown = eu?.age_country_gender_reach_breakdown ?? root.age_country_gender_reach_breakdown;
  const byCountry = new Map<string, number>();
  if (Array.isArray(breakdown)) {
    for (const entry of breakdown) {
      const e = obj(entry);
      const country = typeof e?.country === "string" ? e.country.trim().toUpperCase() : "";
      if (!country || !Array.isArray(e?.age_gender_breakdowns)) continue;
      let sum = 0;
      for (const b of e.age_gender_breakdowns) {
        const r = obj(b);
        sum += num(r?.male) + num(r?.female) + num(r?.unknown);
      }
      if (sum > 0) byCountry.set(country, (byCountry.get(country) ?? 0) + sum);
    }
  }

  const split = [...byCountry.values()].reduce((s, n) => s + n, 0);
  if (split <= 0) return new Map([["", total]]);
  const scale = total / split;
  return new Map([...byCountry].map(([c, n]) => [c, n * scale]));
}

/** Monthly spend range (EUR) for one ad from its reach, or null when it has no reach data. */
export function metaAdMonthlySpendFromReach(
  ad: { raw_payload?: unknown; first_seen_at: string },
  nowMs: number = Date.now(),
): EurRange | null {
  const reach = metaReachByCountry(ad.raw_payload);
  if (!reach) return null;
  const startMs = Date.parse(ad.first_seen_at);
  const days = Number.isFinite(startMs) ? Math.max(MIN_RUN_DAYS, (nowMs - startMs) / 86_400_000) : 30;
  let low = 0;
  let high = 0;
  for (const [country, people] of reach) {
    const cpm = metaCpmForCountry(country);
    low += (people * META_FREQUENCY.low * cpm.low) / 1000;
    high += (people * META_FREQUENCY.high * cpm.high) / 1000;
  }
  const toMonth = 30 / days;
  return { low: low * toMonth, high: high * toMonth };
}

export type PlatformSpend = {
  low: number;
  mid: number;
  high: number;
  /** Ads priced from their real reach. */
  reachBasedAds: number;
  /** Ads in the estimate. */
  totalAds: number;
  /** Each ad's share, so funnel cells can add up to the platform total. */
  perAd: Map<string, EurRange>;
};

function median(vals: number[]): number {
  const s = [...vals].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)] ?? 0;
}

/**
 * Spend for one platform's running ads: real reach where Meta publishes it. Meta ads without reach
 * are priced at the median of this competitor's own reach-priced ads (when there are at least 5);
 * otherwise, and on every other platform, `fallback(count)` supplies the ad-count estimate (linear
 * in count, so each ad gets an equal share).
 */
export function estimatePlatformSpend(
  platform: string,
  ads: Array<{ id: string; raw_payload?: unknown; first_seen_at: string }>,
  fallback: (adsWithoutReach: number) => { low: number; high: number },
  nowMs: number = Date.now(),
): PlatformSpend {
  const perAd = new Map<string, EurRange>();
  const withoutReach: string[] = [];
  for (const ad of ads) {
    const r = platform === "meta" ? metaAdMonthlySpendFromReach(ad, nowMs) : null;
    if (r) perAd.set(ad.id, r);
    else withoutReach.push(ad.id);
  }
  const reachBasedAds = perAd.size;

  if (withoutReach.length > 0) {
    let each: EurRange;
    if (reachBasedAds >= 5) {
      const priced = [...perAd.values()];
      each = { low: median(priced.map((r) => r.low)), high: median(priced.map((r) => r.high)) };
    } else {
      const fb = fallback(withoutReach.length);
      each = { low: fb.low / withoutReach.length, high: fb.high / withoutReach.length };
    }
    for (const id of withoutReach) perAd.set(id, each);
  }

  let low = 0;
  let high = 0;
  for (const r of perAd.values()) {
    low += r.low;
    high += r.high;
  }
  return {
    low: Math.round(low),
    mid: Math.round((low + high) / 2),
    high: Math.round(high),
    reachBasedAds,
    totalAds: ads.length,
    perAd,
  };
}

/** Sum of the given ads' shares, rounded like the platform totals. */
export function sumAdSpend(perAd: Map<string, EurRange>, adIds: string[]): { low: number; mid: number; high: number } {
  let low = 0;
  let high = 0;
  for (const id of adIds) {
    const r = perAd.get(id);
    if (!r) continue;
    low += r.low;
    high += r.high;
  }
  return { low: Math.round(low), mid: Math.round((low + high) / 2), high: Math.round(high) };
}
