import type { StrategyPlatform } from "@/lib/strategy-overview/payload-types";

/** Rough EUR CPM bands (low, high) for display estimation — not financial advice. */
export const PLATFORM_CPM_EUR_RANGE: Record<
  StrategyPlatform,
  { low: number; high: number; impressionsPerAdPerMonth: number }
> = {
  meta: { low: 4, high: 14, impressionsPerAdPerMonth: 8000 },
  google: { low: 3, high: 12, impressionsPerAdPerMonth: 6000 },
  youtube: { low: 4, high: 15, impressionsPerAdPerMonth: 7000 },
  tiktok: { low: 5, high: 18, impressionsPerAdPerMonth: 12000 },
  linkedin: { low: 8, high: 35, impressionsPerAdPerMonth: 3000 },
  pinterest: { low: 4, high: 14, impressionsPerAdPerMonth: 5000 },
  snapchat: { low: 3, high: 12, impressionsPerAdPerMonth: 6000 },
  microsoft: { low: 4, high: 14, impressionsPerAdPerMonth: 4000 },
  reddit: { low: 2, high: 10, impressionsPerAdPerMonth: 4000 },
};

const DEFAULT =
  PLATFORM_CPM_EUR_RANGE.meta;

export function getBenchmark(platform: string): (typeof PLATFORM_CPM_EUR_RANGE)[StrategyPlatform] {
  const p = platform.toLowerCase() as StrategyPlatform;
  if (p in PLATFORM_CPM_EUR_RANGE) return PLATFORM_CPM_EUR_RANGE[p];
  return DEFAULT;
}

/**
 * Active-days proxy from first/last seen — caps how long we assume each ad ran.
 */
export function activeDays(firstSeenIso: string, lastSeenIso: string): number {
  const a = Date.parse(firstSeenIso);
  const b = Date.parse(lastSeenIso);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 30;
  const d = Math.max(1, Math.round((b - a) / 86400000) + 1);
  return Math.min(d, 365);
}

/**
 * Estimated monthly spend (EUR) from ad footprint, active-day proxy, and brand scale.
 * Brand scale stretches implied impressions — larger observed programs map to higher delivery per ad.
 */
export function estimateMonthlySpendEur(params: {
  platform: string;
  adCount: number;
  avgActiveDays: number;
  /** 0.5 (micro/local) – 5.0 (enterprise); from deriveBrandScale. */
  brandScaleScore: number;
}): { low: number; mid: number; high: number } {
  const bench = getBenchmark(params.platform);
  const clampedDays = Math.min(params.avgActiveDays, 180);
  const freq = Math.min(1.2, 0.35 + (clampedDays / 180) * 0.85);
  const baseImpressions = bench.impressionsPerAdPerMonth * freq * params.adCount;
  const scaledImpressions = baseImpressions * params.brandScaleScore;
  const low = (scaledImpressions / 1000) * bench.low;
  const high = (scaledImpressions / 1000) * bench.high;
  const mid = (low + high) / 2;
  return { low: Math.round(low), high: Math.round(high), mid: Math.round(mid) };
}
