/**
 * Meta ad performance ranking: delivery band + runtime days.
 * Used by Ads Library, Timeline, Discovery and MCP tools.
 *
 * The band is Meta's `impressions_index` when the scrape has one (in practice it never does: -1 or 0 on
 * every ad), otherwise derived from the EU reach Meta publishes: log10(people reached) − 1, so
 * 1K people ≈ 2, 10K ≈ 3, 100K ≈ 4, 1M ≈ 5.
 */

import { computeMetaAdRunDays, hydrateMetaAdCardForLibrary } from "@/lib/ad-library/count-active-ads";
import type { MetaAdCard } from "@/lib/ad-library/normalize";
import { metaReachByCountry } from "@/lib/strategy-overview/reach-spend";

export type AdPerformanceSort =
  | "newest"
  | "oldest"
  | "longest_running"
  | "impressions"
  | "ultimate_winner";

/** Band threshold for the “ultimate winner” tier with a long run: 3 ≈ 10K people reached. */
export const ULTIMATE_WINNER_MIN_IMPRESSIONS_INDEX = 3;

/** Minimum days live to qualify alongside a decent impression band. */
export const ULTIMATE_WINNER_MIN_DAYS_RUNNING = 21;

/** Top band (4 ≈ 100K people reached) qualifies with a shorter (but still proven) runtime. */
export const ULTIMATE_WINNER_HIGH_BAND_MIN_INDEX = 4;
export const ULTIMATE_WINNER_HIGH_BAND_MIN_DAYS = 14;

/**
 * When Meta omits reach (common for smaller EU / local advertisers), a long runtime
 * alone still signals the creative worked — use this as the fallback threshold.
 */
export const ULTIMATE_WINNER_RUNTIME_ONLY_MIN_DAYS = 42;

/** Score weight for runtime-only winners (between impression band 1 and 2). */
const RUNTIME_ONLY_SCORE_MULTIPLIER = 1.75;

/** Approximate people reached for a band, for labels ("~12K reached"). */
export function formatReachFromIndex(index: number): string {
  const people = 10 ** (index + 1);
  if (people >= 1_000_000) return `~${(people / 1_000_000).toFixed(1)}M reached`;
  if (people >= 1_000) return `~${Math.round(people / 1_000)}K reached`;
  return `~${Math.round(people)} reached`;
}

/** Band from Meta's published EU reach (see file comment), or null when the ad has none. */
export function metaReachIndex(rawPayload: unknown): number | null {
  const byCountry = metaReachByCountry(rawPayload);
  if (!byCountry) return null;
  const people = [...byCountry.values()].reduce((s, n) => s + n, 0);
  if (people < 1) return null;
  return Math.max(0.1, Math.round((Math.log10(people) - 1) * 10) / 10);
}

export function extractImpressionsIndex(rawPayload: unknown): number | null {
  if (!rawPayload || typeof rawPayload !== "object" || Array.isArray(rawPayload)) return null;
  const p = rawPayload as Record<string, unknown>;

  const direct = p.impressionsIndex ?? p.impressions_index;
  if (typeof direct === "number" && Number.isFinite(direct) && direct > 0) {
    return direct;
  }

  const nested = p.impressions_with_index ?? p.impressionsWithIndex;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    const idx = (nested as Record<string, unknown>).impressions_index
      ?? (nested as Record<string, unknown>).impressionsIndex;
    if (typeof idx === "number" && Number.isFinite(idx) && idx > 0) {
      return idx;
    }
  }

  return metaReachIndex(rawPayload);
}

/**
 * Combines Meta impression band with runtime (log-scaled weeks).
 * Ads without an impressions index score 0.
 */
export function computeUltimateWinnerScore(impressionsIndex: number | null, daysRunning: number): number {
  const days = Math.max(0, daysRunning);
  if (impressionsIndex != null && Number.isFinite(impressionsIndex) && impressionsIndex > 0) {
    return impressionsIndex * Math.log1p(days / 7);
  }
  if (days >= ULTIMATE_WINNER_RUNTIME_ONLY_MIN_DAYS) {
    return RUNTIME_ONLY_SCORE_MULTIPLIER * Math.log1p(days / 7);
  }
  return 0;
}

export function qualifiesAsUltimateWinner(
  impressionsIndex: number | null,
  daysRunning: number,
): boolean {
  const days = Math.max(0, daysRunning);

  if (impressionsIndex != null && Number.isFinite(impressionsIndex)) {
    if (impressionsIndex >= ULTIMATE_WINNER_HIGH_BAND_MIN_INDEX && days >= ULTIMATE_WINNER_HIGH_BAND_MIN_DAYS) {
      return true;
    }
    return (
      impressionsIndex >= ULTIMATE_WINNER_MIN_IMPRESSIONS_INDEX &&
      days >= ULTIMATE_WINNER_MIN_DAYS_RUNNING
    );
  }

  return days >= ULTIMATE_WINNER_RUNTIME_ONLY_MIN_DAYS;
}

/**
 * Prefer Meta library start/end dates from `raw_payload` when present — scraped_ads
 * first_seen_at can reflect when we first discovered the ad, not when it launched.
 */
export function resolveScrapedAdRunDays(args: {
  platform: string;
  first_seen_at: string;
  last_seen_at: string;
  is_killed: boolean;
  raw_payload: unknown;
  scrapeAtMs?: number;
  nowMs?: number;
}): number {
  const nowMs = args.nowMs ?? Date.now();
  const startMs = new Date(args.first_seen_at).getTime();
  const endMs = args.is_killed ? new Date(args.last_seen_at).getTime() : nowMs;
  const dbDays = Math.max(0, Math.floor((endMs - startMs) / 86_400_000));

  const platform = args.platform.trim().toLowerCase();
  if (platform !== "meta" || !args.raw_payload || typeof args.raw_payload !== "object") {
    return dbDays;
  }

  const raw = args.raw_payload as Record<string, unknown>;
  let card = args.raw_payload as MetaAdCard;
  const legacyStart = raw.start_date ?? raw.startDate;
  if (
    (card.startedAt == null || !Number.isFinite(card.startedAt)) &&
    typeof legacyStart === "number" &&
    Number.isFinite(legacyStart)
  ) {
    card = { ...card, startedAt: legacyStart };
  }

  if (card.startedAt == null || !Number.isFinite(card.startedAt)) {
    return dbDays;
  }

  const adScrapeAtMs = new Date(args.last_seen_at).getTime();
  const scrapeAtMs =
    Number.isFinite(adScrapeAtMs) && adScrapeAtMs > 0
      ? adScrapeAtMs
      : args.scrapeAtMs ?? nowMs;

  const hydrated = hydrateMetaAdCardForLibrary(card, scrapeAtMs);
  const metaCard = args.is_killed
    ? hydrated
    : { ...hydrated, isActive: true, endedAt: undefined };

  const metaDays = computeMetaAdRunDays(metaCard, scrapeAtMs, nowMs);
  return Math.max(dbDays, metaDays);
}

/** Used by Discovery “Ultimate winners” tab — strict winners plus long-run performers. */
export function passesUltimateWinnersFeedFilter(
  impressionsIndex: number | null,
  daysRunning: number,
): boolean {
  if (qualifiesAsUltimateWinner(impressionsIndex, daysRunning)) return true;
  if (daysRunning < ULTIMATE_WINNER_MIN_DAYS_RUNNING) return false;
  return computeUltimateWinnerScore(impressionsIndex, daysRunning) > 0;
}

export function compareAdsByPerformanceSort<T extends { first_seen_at: string; last_seen_at: string }>(
  a: T,
  b: T,
  sort: AdPerformanceSort,
  opts: {
    impressionsIndexFor: (row: T) => number | null;
    daysRunningFor: (row: T) => number;
    newestMsFor?: (row: T) => number;
  },
): number {
  const daysA = opts.daysRunningFor(a);
  const daysB = opts.daysRunningFor(b);
  const impA = opts.impressionsIndexFor(a);
  const impB = opts.impressionsIndexFor(b);

  switch (sort) {
    case "oldest":
      return new Date(a.first_seen_at).getTime() - new Date(b.first_seen_at).getTime();
    case "longest_running":
      return daysB - daysA;
    case "impressions": {
      const iA = impA ?? -1;
      const iB = impB ?? -1;
      if (iB !== iA) return iB - iA;
      return daysB - daysA;
    }
    case "ultimate_winner": {
      const sA = computeUltimateWinnerScore(impA, daysA);
      const sB = computeUltimateWinnerScore(impB, daysB);
      if (sB !== sA) return sB - sA;
      return daysB - daysA;
    }
    case "newest":
    default: {
      const newestA = opts.newestMsFor?.(a) ?? new Date(a.first_seen_at).getTime();
      const newestB = opts.newestMsFor?.(b) ?? new Date(b.first_seen_at).getTime();
      return newestB - newestA;
    }
  }
}

export function sortAdsByPerformanceSort<T extends { first_seen_at: string; last_seen_at: string }>(
  ads: T[],
  sort: AdPerformanceSort,
  opts: {
    impressionsIndexFor: (row: T) => number | null;
    daysRunningFor: (row: T) => number;
    newestMsFor?: (row: T) => number;
  },
): T[] {
  return [...ads].sort((a, b) => compareAdsByPerformanceSort(a, b, sort, opts));
}
