import type { NormalizedAdForStrategy } from "@/lib/strategy-overview-types";

/**
 * Deterministic hash of the normalized ads array.
 * Used to detect if ads have changed since the last cached strategy overview.
 * Not cryptographic — just a stable fingerprint for cache invalidation.
 */
export function hashNormalizedAds(ads: NormalizedAdForStrategy[]): string {
  if (ads.length === 0) return "empty";
  const str = ads
    .map((a) => `${a.platform}|${a.headline}|${a.cta}|${a.format}`)
    .sort()
    .join("||");
  // djb2 hash
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}
