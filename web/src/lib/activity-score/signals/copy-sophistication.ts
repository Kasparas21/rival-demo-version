import type { ScrapedAdForActivityScore } from "../types";

function lengthBucketScore(avgLen: number): number {
  if (avgLen < 30) return 15;
  if (avgLen < 100) return 40;
  if (avgLen < 300) return 70;
  return 85;
}

export function computeCopySophistication(ads: ScrapedAdForActivityScore[]): {
  score: number;
  avgCopyLength: number;
  identicalTextRatio: number;
  distinctTextRatio: number;
} {
  const n = ads.length;
  if (n === 0) {
    return { score: 15, avgCopyLength: 0, identicalTextRatio: 0, distinctTextRatio: 0 };
  }
  let lenSum = 0;
  const textCounts = new Map<string, number>();
  for (const a of ads) {
    const t = a.ad_text.replace(/\s+/g, " ").trim();
    lenSum += t.length;
    const key = t.toLowerCase().slice(0, 500);
    textCounts.set(key, (textCounts.get(key) ?? 0) + 1);
  }
  const avgCopyLength = lenSum / n;
  let maxDup = 0;
  for (const c of textCounts.values()) maxDup = Math.max(maxDup, c);
  const identicalTextRatio = maxDup / n;
  const distinctTextRatio = textCounts.size / n;

  let score = lengthBucketScore(avgCopyLength);
  if (identicalTextRatio > 0.5) score -= 10;
  if (distinctTextRatio > 0.7) score += 10;
  score = Math.max(0, Math.min(100, score));

  return { score, avgCopyLength, identicalTextRatio, distinctTextRatio };
}
