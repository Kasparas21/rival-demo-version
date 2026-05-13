import type { ScrapedAdForActivityScore } from "../types";

export function formatSophisticationScore(distinctFormats: number): number {
  if (distinctFormats <= 1) return 15;
  if (distinctFormats === 2) return 30;
  if (distinctFormats === 3) return 50;
  if (distinctFormats === 4) return 70;
  if (distinctFormats === 5) return 85;
  return 100;
}

export function computeFormatSophistication(ads: ScrapedAdForActivityScore[]): {
  score: number;
  formatsUsed: number;
} {
  const set = new Set<string>();
  for (const a of ads) {
    const f = a.format.trim().toLowerCase();
    if (f) set.add(f);
  }
  const formatsUsed = set.size;
  return { score: formatSophisticationScore(formatsUsed), formatsUsed };
}
