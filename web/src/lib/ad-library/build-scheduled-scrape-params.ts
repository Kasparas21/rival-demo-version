import type { InitialScrapePlatform } from "./constants";
import {
  scrapeLimitForClassification,
  type PlatformClassification,
} from "./platform-prioritization";

export type ScheduledScrapeLimits = {
  metaMaxAds: number;
  googleResultsLimit: number;
  linkedinMaxAds: number;
  tiktokMaxAds: number;
  pinterestMaxResults: number;
  snapchatMaxItems: number;
  isInactiveProbe: boolean;
};

export function buildScheduledScrapeLimits(
  classification: PlatformClassification,
  opts?: { isInactiveProbe?: boolean }
): ScheduledScrapeLimits {
  const limit = scrapeLimitForClassification(classification, opts);
  return {
    metaMaxAds: limit,
    googleResultsLimit: limit,
    linkedinMaxAds: limit,
    tiktokMaxAds: limit,
    pinterestMaxResults: limit,
    snapchatMaxItems: Math.max(10, limit),
    isInactiveProbe: classification === "INACTIVE" || Boolean(opts?.isInactiveProbe),
  };
}

export function scheduledLimitsForPlatform(
  platform: InitialScrapePlatform,
  classification: PlatformClassification
): number {
  const all = buildScheduledScrapeLimits(classification);
  switch (platform) {
    case "meta":
      return all.metaMaxAds;
    case "google":
      return all.googleResultsLimit;
    case "linkedin":
      return all.linkedinMaxAds;
    case "tiktok":
      return all.tiktokMaxAds;
    case "pinterest":
      return all.pinterestMaxResults;
    case "snapchat":
      return all.snapchatMaxItems;
    default:
      return all.metaMaxAds;
  }
}
