import type { StrategyPlatform } from "@/lib/strategy-overview/payload-types";

/** Minimal ad shape for brand-scale heuristics (compatible with ScrapedAdInput). */
export type BrandScaleAdInput = {
  platform: string;
  first_seen_at: string;
  last_seen_at: string;
};

export function normalizePlatform(p: string): StrategyPlatform {
  const x = p.toLowerCase().trim();
  if (
    x === "meta" ||
    x === "google" ||
    x === "linkedin" ||
    x === "tiktok" ||
    x === "microsoft" ||
    x === "pinterest" ||
    x === "snapchat" ||
    x === "youtube" ||
    x === "reddit"
  ) {
    return x;
  }
  return "meta";
}

export function deriveBrandScale(
  ads: BrandScaleAdInput[],
  byPlatform: Map<StrategyPlatform, BrandScaleAdInput[]>
): number {
  if (ads.length === 0 || byPlatform.size === 0) return 0.5;

  const platformCount = byPlatform.size;
  const platformDiversity = Math.min(1.0, platformCount / 6);

  const oldestAd = ads.reduce((min, a) =>
    new Date(a.first_seen_at).getTime() < new Date(min.first_seen_at).getTime() ? a : min
  );
  const observationMonths = Math.max(
    1,
    (Date.now() - new Date(oldestAd.first_seen_at).getTime()) / (1000 * 60 * 60 * 24 * 30)
  );
  const adsPerMonth = ads.length / observationMonths;
  const creativeVelocity = Math.min(1.0, adsPerMonth / 30);

  const platformAdCounts = [...byPlatform.values()].map((list) => list.length);
  const maxConcurrentOnAnyPlatform = Math.max(...platformAdCounts);
  const concurrentScale = Math.min(1.0, maxConcurrentOnAnyPlatform / 50);

  const avgActiveDays =
    ads.reduce((sum, a) => {
      const start = new Date(a.first_seen_at).getTime();
      const end = new Date(a.last_seen_at).getTime();
      if (!Number.isFinite(start) || !Number.isFinite(end)) return sum + 30;
      const days = Math.max(1, (end - start) / (1000 * 60 * 60 * 24) + 1);
      return sum + Math.min(days, 365);
    }, 0) / ads.length;
  const longevity = Math.min(1.0, avgActiveDays / 90);

  const compositeScore =
    platformDiversity * 0.3 + creativeVelocity * 0.3 + concurrentScale * 0.25 + longevity * 0.15;

  return 0.5 + compositeScore * 4.5;
}
