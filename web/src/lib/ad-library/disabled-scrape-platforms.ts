import type { AdsLibraryResponse } from "@/lib/ad-library/api-types";
import type { AdsLibraryPlatform } from "@/lib/ad-library/ads-library-platform";

/**
 * Platforms still shown in the UI but excluded from Apify / scheduled scrapes.
 * Meta + Google remain the supported paid-media sources.
 */
export const SCRAPE_DISABLED_PLATFORMS = [
  "linkedin",
  "tiktok",
  "pinterest",
  "snapchat",
] as const satisfies readonly AdsLibraryPlatform[];

export const SCRAPE_DISABLED_PLATFORM_MESSAGE = "Scraping for this platform is not available yet.";

const DISABLED_SET = new Set<string>(SCRAPE_DISABLED_PLATFORMS);

export function isScrapeEnabledForPlatform(platform: AdsLibraryPlatform): boolean {
  return !DISABLED_SET.has(platform);
}

export function stripDisabledPlatformsFromScrapeSet(
  platforms: Set<AdsLibraryPlatform>,
): Set<AdsLibraryPlatform> {
  const next = new Set(platforms);
  for (const platform of SCRAPE_DISABLED_PLATFORMS) {
    next.delete(platform);
  }
  return next;
}

export function applyDisabledScrapePlatformErrors(
  out: AdsLibraryResponse,
  platformsRequested: Set<AdsLibraryPlatform>,
): void {
  for (const platform of SCRAPE_DISABLED_PLATFORMS) {
    if (!platformsRequested.has(platform)) continue;
    switch (platform) {
      case "linkedin":
        out.linkedin = { ads: [], error: SCRAPE_DISABLED_PLATFORM_MESSAGE };
        break;
      case "tiktok":
        out.tiktok = { ads: [], error: SCRAPE_DISABLED_PLATFORM_MESSAGE };
        break;
      case "pinterest":
        out.pinterest = { ads: [], error: SCRAPE_DISABLED_PLATFORM_MESSAGE };
        break;
      case "snapchat":
        out.snapchat = { ads: [], error: SCRAPE_DISABLED_PLATFORM_MESSAGE };
        break;
      default:
        break;
    }
  }
}

/** Remove disabled platforms from the scrape queue; optionally stamp API errors when requested. */
export function prepareAdsLibraryScrapePlatforms(args: {
  platformsRequested: Set<AdsLibraryPlatform>;
  platformsNeedingScrape: Set<AdsLibraryPlatform>;
  out?: AdsLibraryResponse;
}): Set<AdsLibraryPlatform> {
  if (args.out) {
    applyDisabledScrapePlatformErrors(args.out, args.platformsRequested);
  }
  return stripDisabledPlatformsFromScrapeSet(args.platformsNeedingScrape);
}
