import type { InitialScrapePlatform } from "./constants";
import {
  FULL_SWEEP_ADS_PER_PLATFORM,
  GOOGLE_ADS_LIBRARY_MAX_ITEMS,
} from "./constants";
import {
  scrapeLimitForClassification,
  type PlatformClassification,
} from "./platform-prioritization";

const FULL_SWEEP_PLATFORMS = new Set<InitialScrapePlatform>(["meta", "google", "tiktok"]);

/** Ads requested per scheduled refresh — matches `buildParallelScrapeScalars` caps shown in the UI. */
export function scheduledAdsPerRefreshForPlatform(
  platform: InitialScrapePlatform,
  classification: PlatformClassification,
  opts?: { isInactiveProbe?: boolean },
): number {
  const isInactiveProbe = classification === "INACTIVE" || Boolean(opts?.isInactiveProbe);
  if (!isInactiveProbe && FULL_SWEEP_PLATFORMS.has(platform)) {
    if (platform === "google") return GOOGLE_ADS_LIBRARY_MAX_ITEMS;
    return FULL_SWEEP_ADS_PER_PLATFORM;
  }
  return scrapeLimitForClassification(classification, opts);
}
