import type { AdsLibraryResponse } from "@/lib/ad-library/api-types";
import type { AdsLibraryPlatform } from "@/lib/ad-library/ads-library-platform";

/**
 * Ad platforms an admin can switch on or off per account (`admin_enabled_ad_platforms` on the billing row).
 * Anything not listed here (e.g. `microsoft`) is not governed by the switch.
 */
export const TOGGLEABLE_AD_PLATFORMS = [
  "meta",
  "google",
  "tiktok",
  "linkedin",
  "pinterest",
  "snapchat",
] as const satisfies readonly AdsLibraryPlatform[];

export type ToggleableAdPlatform = (typeof TOGGLEABLE_AD_PLATFORMS)[number];

/** Every account starts with these; an admin switches the rest on per account. */
export const DEFAULT_ENABLED_AD_PLATFORMS: readonly ToggleableAdPlatform[] = ["meta", "google"];

export const SCRAPE_DISABLED_PLATFORM_MESSAGE = "This platform isn't switched on for your account yet.";

const TOGGLEABLE_SET = new Set<string>(TOGGLEABLE_AD_PLATFORMS);

/** Parses a stored list; null when it isn't a usable list (callers fall back to the defaults). */
export function normalizeEnabledAdPlatforms(value: unknown): ToggleableAdPlatform[] | null {
  if (!Array.isArray(value)) return null;
  const picked = TOGGLEABLE_AD_PLATFORMS.filter((p) => value.includes(p));
  return picked;
}

export function isScrapeEnabledForPlatform(
  platform: AdsLibraryPlatform | string,
  enabled: readonly string[] = DEFAULT_ENABLED_AD_PLATFORMS,
): boolean {
  if (!TOGGLEABLE_SET.has(platform)) return true;
  return enabled.includes(platform);
}

export function stripDisabledPlatformsFromScrapeSet(
  platforms: Set<AdsLibraryPlatform>,
  enabled: readonly string[] = DEFAULT_ENABLED_AD_PLATFORMS,
): Set<AdsLibraryPlatform> {
  return new Set([...platforms].filter((p) => isScrapeEnabledForPlatform(p, enabled)));
}

export function applyDisabledScrapePlatformErrors(
  out: AdsLibraryResponse,
  platformsRequested: Set<AdsLibraryPlatform>,
  enabled: readonly string[] = DEFAULT_ENABLED_AD_PLATFORMS,
): void {
  for (const platform of TOGGLEABLE_AD_PLATFORMS) {
    if (!platformsRequested.has(platform) || isScrapeEnabledForPlatform(platform, enabled)) continue;
    if (platform === "google") {
      out.google = { rows: [], error: SCRAPE_DISABLED_PLATFORM_MESSAGE };
    } else {
      out[platform] = { ads: [], error: SCRAPE_DISABLED_PLATFORM_MESSAGE };
    }
  }
}

/** Remove switched-off platforms from the scrape queue; optionally stamp API errors when requested. */
export function prepareAdsLibraryScrapePlatforms(args: {
  platformsRequested: Set<AdsLibraryPlatform>;
  platformsNeedingScrape: Set<AdsLibraryPlatform>;
  enabled?: readonly string[];
  out?: AdsLibraryResponse;
}): Set<AdsLibraryPlatform> {
  if (args.out) {
    applyDisabledScrapePlatformErrors(args.out, args.platformsRequested, args.enabled);
  }
  return stripDisabledPlatformsFromScrapeSet(args.platformsNeedingScrape, args.enabled);
}
