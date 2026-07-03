import { buildScheduledScrapeLimits } from "@/lib/ad-library/build-scheduled-scrape-params";
import type { InitialScrapePlatform } from "@/lib/ad-library/constants";
import type { PlatformClassification } from "@/lib/ad-library/platform-prioritization";
import {
  computeScheduledScrapeDateWindow,
  linkedinDateRangeForWindow,
} from "@/lib/ad-library/scheduled-scrape-date-window";

export type ParallelScrapeScalars = {
  metaMaxAds: number;
  metaStartDate: string;
  metaEndDate: string;
  googleResultsLimit: number;
  linkedinMaxAds: number;
  linkedinDateRange: string;
  tiktokMaxAds: number;
  tiktokStartDate: string;
  tiktokEndDate: string;
  pinterestMaxResults: number;
  pinterestStartDate: string;
  pinterestEndDate: string;
  snapchatMaxItems: number;
  snapchatStartDate: string;
  snapchatEndDate: string;
  microsoftMaxSearchResults: number;
  microsoftStartDate: string;
  microsoftEndDate: string;
};

/** Per-platform limits and date windows for one parallel scheduled scrape call. */
export function buildParallelScrapeScalars(
  platformsToScrape: InitialScrapePlatform[],
  classificationByPlatform: Map<string, PlatformClassification>,
  lastScrapeByPlatform: Map<InitialScrapePlatform, string | null>,
  firstScrapeAt: string | null,
  nowStamp: string,
  nowMs: number,
): ParallelScrapeScalars {
  const defaultLim = buildScheduledScrapeLimits("SECONDARY");
  const defaultWindow = computeScheduledScrapeDateWindow(firstScrapeAt ?? nowStamp, nowMs);
  const defaultLinkedinRange = linkedinDateRangeForWindow(defaultWindow, { inactiveProbe: false });

  const scalars: ParallelScrapeScalars = {
    metaMaxAds: defaultLim.metaMaxAds,
    metaStartDate: defaultWindow.startYmd,
    metaEndDate: defaultWindow.endYmd,
    googleResultsLimit: defaultLim.googleResultsLimit,
    linkedinMaxAds: defaultLim.linkedinMaxAds,
    linkedinDateRange: defaultLinkedinRange,
    tiktokMaxAds: defaultLim.tiktokMaxAds,
    tiktokStartDate: defaultWindow.startYmd,
    tiktokEndDate: defaultWindow.endYmd,
    pinterestMaxResults: defaultLim.pinterestMaxResults,
    pinterestStartDate: defaultWindow.startYmd,
    pinterestEndDate: defaultWindow.endYmd,
    snapchatMaxItems: defaultLim.snapchatMaxItems,
    snapchatStartDate: defaultWindow.startYmd,
    snapchatEndDate: defaultWindow.endYmd,
    microsoftMaxSearchResults: Math.max(24, defaultLim.metaMaxAds, 1000),
    microsoftStartDate: defaultWindow.startYmd,
    microsoftEndDate: defaultWindow.endYmd,
  };

  for (const platform of platformsToScrape) {
    const classification = classificationByPlatform.get(platform) ?? "SECONDARY";
    const isInactiveProbe = classification === "INACTIVE";
    const lim = buildScheduledScrapeLimits(classification, { isInactiveProbe });
    const lastScrapeAt = lastScrapeByPlatform.get(platform) ?? firstScrapeAt ?? nowStamp;
    const dateWindow = computeScheduledScrapeDateWindow(lastScrapeAt, nowMs);

    switch (platform) {
      case "meta":
        scalars.metaMaxAds = lim.metaMaxAds;
        scalars.metaStartDate = dateWindow.startYmd;
        scalars.metaEndDate = dateWindow.endYmd;
        break;
      case "google":
        scalars.googleResultsLimit = lim.googleResultsLimit;
        break;
      case "linkedin":
        scalars.linkedinMaxAds = lim.linkedinMaxAds;
        scalars.linkedinDateRange = linkedinDateRangeForWindow(dateWindow, {
          inactiveProbe: isInactiveProbe,
        });
        break;
      case "tiktok":
        scalars.tiktokMaxAds = lim.tiktokMaxAds;
        scalars.tiktokStartDate = dateWindow.startYmd;
        scalars.tiktokEndDate = dateWindow.endYmd;
        break;
      case "pinterest":
        scalars.pinterestMaxResults = lim.pinterestMaxResults;
        scalars.pinterestStartDate = dateWindow.startYmd;
        scalars.pinterestEndDate = dateWindow.endYmd;
        break;
      case "snapchat":
        scalars.snapchatMaxItems = lim.snapchatMaxItems;
        scalars.snapchatStartDate = dateWindow.startYmd;
        scalars.snapchatEndDate = dateWindow.endYmd;
        break;
      default:
        break;
    }
  }

  return scalars;
}
