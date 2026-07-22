import type { AdsCacheHydrateClientMeta } from "@/lib/ad-library/ads-cache-hydrate-meta";
import type { AdsLibraryPlatform, AdsLibraryResponse } from "./api-types";

/** Client-safe helpers — keep out of `persist-scraped-ads.ts` (server-only side effects). */

export function platformScrapeSucceeded(out: AdsLibraryResponse, p: AdsLibraryPlatform): boolean {
  switch (p) {
    case "meta":
      return out.meta.error == null;
    case "google":
      return out.google.error == null;
    case "linkedin":
      return out.linkedin.error == null;
    case "tiktok":
      return out.tiktok.error == null;
    case "microsoft":
      return out.microsoft.error == null;
    case "pinterest":
      return out.pinterest.error == null;
    case "snapchat":
      return out.snapchat.error == null;
    default:
      return false;
  }
}

export function countLibraryAdsForPlatform(platform: AdsLibraryPlatform, out: AdsLibraryResponse): number {
  switch (platform) {
    case "meta":
      return out.meta.ads?.length ?? 0;
    case "google":
      return out.google.rows?.length ?? 0;
    case "linkedin":
      return out.linkedin.ads?.length ?? 0;
    case "tiktok":
      return out.tiktok.ads?.length ?? 0;
    case "microsoft":
      return out.microsoft.ads?.length ?? 0;
    case "pinterest":
      return out.pinterest.ads?.length ?? 0;
    case "snapchat":
      return out.snapchat.ads?.length ?? 0;
    default:
      return 0;
  }
}

/**
 * True when a cached/library response is missing creatives for platforms the user expects.
 * Uses hydrate metadata when present so a meta-only session cache is not treated as complete
 * after Google/LinkedIn rows land in `ads_cache`.
 */
export function adsLibraryResponseMissingExpectedPlatforms(
  response: AdsLibraryResponse,
  expectedPlatforms: readonly AdsLibraryPlatform[],
  hydrateMeta?: AdsCacheHydrateClientMeta | null,
): boolean {
  const expected = expectedPlatforms.filter(Boolean);
  if (expected.length === 0) return false;

  if (hydrateMeta?.platforms?.length) {
    for (const row of hydrateMeta.platforms) {
      const platform = row.platform as AdsLibraryPlatform;
      if (!expected.includes(platform)) continue;
      if (countLibraryAdsForPlatform(platform, response) === 0) return true;
    }
    return false;
  }

  return expected.some((platform) => countLibraryAdsForPlatform(platform, response) === 0);
}

/** True when this platform has creatives to show (failed/empty scrapes stay off until the user enables them). */
export function platformHasScrapedLibraryData(
  platform: AdsLibraryPlatform,
  out: AdsLibraryResponse | null,
  opts?: { activeAdCount?: number },
): boolean {
  if (out) {
    if (!platformScrapeSucceeded(out, platform)) return false;
    return countLibraryAdsForPlatform(platform, out) > 0;
  }

  /** While cache hydrates, use tracking active count as a best-effort hint. */
  return (opts?.activeAdCount ?? 0) > 0;
}
