export type ThreatScoreFactors = {
  days_running?: number;
  /** Delivery band from `extractImpressionsIndex` (Meta EU reach: 3 ≈ 10K people, 4 ≈ 100K); null when unknown. */
  reach_index?: number | null;
  platform_count?: number;
  is_new_angle?: boolean;
};

/**
 * Ad threat 0–10, built up from evidence instead of starting at 5: the old formula put 90% of
 * "new winning ad" signals at 9–10, so the score said nothing.
 *
 * - runtime (up to 3): 7+ days 1, 14+ days 2, 30+ days 3
 * - reach (up to 4): band 2 → 1, 3 → 2, 4 → 3, 5+ → 4; without published reach, 42+ days running → 2
 * - platforms (up to 2): 2 → 1, 3+ → 2
 * - a new angle for this competitor: 1
 */
export function calculateThreatScore(factors: ThreatScoreFactors): number {
  const days = factors.days_running ?? 0;
  let score = days >= 30 ? 3 : days >= 14 ? 2 : days >= 7 ? 1 : 0;

  const reach = factors.reach_index;
  if (reach != null && Number.isFinite(reach)) {
    score += reach >= 5 ? 4 : reach >= 4 ? 3 : reach >= 3 ? 2 : reach >= 2 ? 1 : 0;
  } else if (days >= 42) {
    score += 2;
  }

  const platforms = factors.platform_count ?? 1;
  score += platforms >= 3 ? 2 : platforms >= 2 ? 1 : 0;

  if (factors.is_new_angle) score += 1;

  return Math.min(score, 10);
}
