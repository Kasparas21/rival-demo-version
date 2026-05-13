import type { ScrapedAdForActivityScore } from "../types";

export function refreshScoreFromNewPerWeek(newPerWeek: number): number {
  if (newPerWeek < 1) return 10;
  if (newPerWeek < 4) return 30;
  if (newPerWeek < 11) return 55;
  if (newPerWeek < 26) return 80;
  return 100;
}

export function computeRefreshVelocity(
  ads: ScrapedAdForActivityScore[],
  now: Date
): {
  score: number;
  newAdsInWindow: number;
  newPerWeek: number;
  trackingDays: number;
  windowDays: number;
  proratedNote: string | null;
} {
  const msDay = 86400000;
  let minMs = now.getTime();
  for (const a of ads) {
    const t = Date.parse(a.first_seen_at);
    if (!Number.isNaN(t)) minMs = Math.min(minMs, t);
  }
  const trackingDays = Math.max(1, (now.getTime() - minMs) / msDay);
  const windowStart = new Date(Math.max(minMs, now.getTime() - 30 * msDay));
  const windowDays = Math.max(0.25, (now.getTime() - windowStart.getTime()) / msDay);

  let newAdsInWindow = 0;
  for (const a of ads) {
    const t = Date.parse(a.first_seen_at);
    if (!Number.isNaN(t) && t >= windowStart.getTime()) newAdsInWindow += 1;
  }

  const newPerWeek = newAdsInWindow / (windowDays / 7);
  const proratedNote =
    trackingDays < 30
      ? "Refresh velocity may improve as tracking history grows beyond 30 days."
      : null;

  return {
    score: refreshScoreFromNewPerWeek(newPerWeek),
    newAdsInWindow,
    newPerWeek,
    trackingDays,
    windowDays,
    proratedNote,
  };
}
