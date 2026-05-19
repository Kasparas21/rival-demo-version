import type { AdsLibraryPlatform } from "@/lib/ad-library/api-types";
import { REFRESH_ADS_PER_PLATFORM } from "@/lib/ad-library/constants";

/** Upper-bound estimate of ads that will be counted toward monthly cap before a scrape runs. */
export function estimateAdsForPlatforms(
  platforms: Iterable<AdsLibraryPlatform>,
  perPlatformCaps: Partial<Record<AdsLibraryPlatform, number>>,
): number {
  let total = 0;
  for (const p of platforms) {
    total += perPlatformCaps[p] ?? REFRESH_ADS_PER_PLATFORM;
  }
  return total;
}
