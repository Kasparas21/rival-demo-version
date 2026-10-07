/**
 * Activity tiers describe how active and sophisticated the running ads are, not budget size; the
 * spend estimate lives in the strategy payload. Size words ("SMB", "Mid-market") sat next to a €845/mo
 * estimate and read as a second, contradicting spend figure.
 */
export const ACTIVITY_TIER_LABELS: Record<1 | 2 | 3 | 4 | 5 | 6, string> = {
  1: "Minimal activity",
  2: "Light activity",
  3: "Moderate activity",
  4: "Active",
  5: "Very active",
  6: "Top tier",
};

/** `spendMin`/`spendMax` are legacy columns still written to the DB; nothing shows them. */
export function tierFromScore(score: number): {
  tier: 1 | 2 | 3 | 4 | 5 | 6;
  label: string;
  spendMin: number;
  spendMax: number | null;
} {
  const s = Math.max(0, Math.min(100, Math.round(score)));
  if (s <= 15) {
    return { tier: 1, label: ACTIVITY_TIER_LABELS[1], spendMin: 0, spendMax: 500 };
  }
  if (s <= 30) {
    return { tier: 2, label: ACTIVITY_TIER_LABELS[2], spendMin: 500, spendMax: 3_000 };
  }
  if (s <= 50) {
    return { tier: 3, label: ACTIVITY_TIER_LABELS[3], spendMin: 3_000, spendMax: 15_000 };
  }
  if (s <= 70) {
    return { tier: 4, label: ACTIVITY_TIER_LABELS[4], spendMin: 15_000, spendMax: 75_000 };
  }
  if (s <= 87) {
    return { tier: 5, label: ACTIVITY_TIER_LABELS[5], spendMin: 75_000, spendMax: 500_000 };
  }
  return { tier: 6, label: ACTIVITY_TIER_LABELS[6], spendMin: 500_000, spendMax: null };
}
