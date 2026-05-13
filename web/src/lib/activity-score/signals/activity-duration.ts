import type { ScrapedAdForActivityScore } from "../types";

export function activityDurationScore(monthsActive: number): number {
  if (monthsActive < 1) return 10;
  if (monthsActive < 4) return 30;
  if (monthsActive < 13) return 55;
  return 85;
}

export function computeActivityDuration(
  ads: ScrapedAdForActivityScore[],
  now: Date
): {
  score: number;
  monthsActive: number;
  cappedByTracking: boolean;
} {
  let minMs = now.getTime();
  for (const a of ads) {
    const t = Date.parse(a.first_seen_at);
    if (!Number.isNaN(t)) minMs = Math.min(minMs, t);
  }
  const msDay = 86400000;
  const days = (now.getTime() - minMs) / msDay;
  const monthsActive = days / 30;
  const cappedByTracking = days < 14;
  return {
    score: activityDurationScore(monthsActive),
    monthsActive,
    cappedByTracking,
  };
}
