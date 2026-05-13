import type { ScrapedAdForActivityScore } from "../types";

export function productCountScore(productCount: number): number {
  if (productCount <= 2) return 15;
  if (productCount <= 5) return 35;
  if (productCount <= 15) return 60;
  return 90;
}

/** Crude proxy when Haiku is unavailable; paired with a −20 penalty at merge time. */
export function computeProductDepthHeuristic(ads: ScrapedAdForActivityScore[]): {
  score: number;
  distinctPrefixes: number;
} {
  const prefixes = new Set<string>();
  for (const a of ads) {
    const words = a.ad_text
      .trim()
      .toLowerCase()
      .split(/\W+/)
      .filter(Boolean)
      .slice(0, 3);
    if (words.length) prefixes.add(words.join(" "));
  }
  const distinctPrefixes = prefixes.size;
  return { score: productCountScore(Math.max(1, distinctPrefixes)), distinctPrefixes };
}
