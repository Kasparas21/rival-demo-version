export function tierFromScore(score: number): {
  tier: 1 | 2 | 3 | 4 | 5 | 6;
  label: string;
  spendMin: number;
  spendMax: number | null;
} {
  const s = Math.max(0, Math.min(100, Math.round(score)));
  if (s <= 15) {
    return { tier: 1, label: "Hobbyist", spendMin: 0, spendMax: 500 };
  }
  if (s <= 30) {
    return { tier: 2, label: "Small business", spendMin: 500, spendMax: 3_000 };
  }
  if (s <= 50) {
    return { tier: 3, label: "SMB", spendMin: 3_000, spendMax: 15_000 };
  }
  if (s <= 70) {
    return { tier: 4, label: "Mid-market", spendMin: 15_000, spendMax: 75_000 };
  }
  if (s <= 87) {
    return { tier: 5, label: "Enterprise", spendMin: 75_000, spendMax: 500_000 };
  }
  return { tier: 6, label: "Global brand", spendMin: 500_000, spendMax: null };
}
