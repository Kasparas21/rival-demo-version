/** How long a platform's scraped ads are considered fresh in `ads_cache` (server). */
export const ADS_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Platforms we cache. Must match AdsLibraryPlatform values. */
export const CACHEABLE_PLATFORMS = [
  "meta",
  "google",
  "linkedin",
  "tiktok",
  "pinterest",
  "snapchat",
] as const;

export type CacheablePlatform = (typeof CACHEABLE_PLATFORMS)[number];
