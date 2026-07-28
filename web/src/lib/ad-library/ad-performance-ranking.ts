/**
 * Meta ad performance ranking: impressions index (library band) + runtime days.
 * Used by Ads Library, Timeline, and MCP tools.
 */

import { computeMetaAdRunDays } from "@/lib/ad-library/count-active-ads";
import type { MetaAdCard } from "@/lib/ad-library/normalize";

export type AdPerformanceSort =
  | "newest"
  | "oldest"
  | "longest_running"
  | "impressions"
  | "ultimate_winner";

/** Meta library band threshold for the “ultimate winner” tier (high impressions + long run). */
export const ULTIMATE_WINNER_MIN_IMPRESSIONS_INDEX = 2;

/** Minimum days live to qualify alongside a decent impression band. */
export const ULTIMATE_WINNER_MIN_DAYS_RUNNING = 21;

/** Top impression band can qualify with a shorter (but still proven) runtime. */
export const ULTIMATE_WINNER_HIGH_BAND_MIN_INDEX = 4;
export const ULTIMATE_WINNER_HIGH_BAND_MIN_DAYS = 14;

/**
 * When Meta omits reach (common for smaller EU / local advertisers), a long runtime
 * alone still signals the creative worked — use this as the fallback threshold.
 */
export const ULTIMATE_WINNER_RUNTIME_ONLY_MIN_DAYS = 42;

/** Score weight for runtime-only winners (between impression band 1 and 2). */
const RUNTIME_ONLY_SCORE_MULTIPLIER = 1.75;

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

  return null;
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

  const card = args.raw_payload as MetaAdCard;
  if (card.startedAt == null || !Number.isFinite(card.startedAt)) {
    return dbDays;
  }

  const metaDays = computeMetaAdRunDays(card, args.scrapeAtMs, nowMs);
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
