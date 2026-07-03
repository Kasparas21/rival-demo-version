export type ThreatScoreFactors = {
  days_running?: number;
  platform_count?: number;
  is_new_angle?: boolean;
  is_trend?: boolean;
  baseline_avg_duration?: number;
};

/** Score 1–10 per RIVAL_AGENT_SPEC §4. */
export function calculateThreatScore(factors: ThreatScoreFactors): number {
  let score = 5;

  const days = factors.days_running ?? 0;
  if (days >= 14) score += 3;
  else if (days >= 7) score += 2;
  else if (days >= 5) score += 1;

  const platforms = factors.platform_count ?? 1;
  if (platforms >= 3) score += 2;
  else if (platforms >= 2) score += 1;

  if (factors.is_new_angle) score += 1;
  if (factors.is_trend) score += 2;

  const baselineAvg = factors.baseline_avg_duration ?? 5;
  if (days > baselineAvg * 2) score += 1;

  return Math.min(score, 10);
}
