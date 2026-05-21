import type { AdsLibraryPlatform } from "@/lib/ad-library/api-types";
import { MANUAL_REFRESH_ADS_PER_PLATFORM } from "@/lib/ad-library/constants";
import { msToUtcYmd } from "@/lib/ad-library/scheduled-scrape-date-window";

export type ManualRefreshDateWindow = {
  startYmd: string;
  endYmd: string;
};

/** UTC calendar window for manual refresh: ads active today (start = end = today). */
export function computeManualRefreshTodayWindow(nowMs = Date.now()): ManualRefreshDateWindow {
  const today = msToUtcYmd(nowMs);
  return { startYmd: today, endYmd: today };
}

/** TikTok library search works better with a rolling window than a single UTC day. */
export function computeManualRefreshTikTokWindow(nowMs = Date.now()): ManualRefreshDateWindow {
  const endYmd = msToUtcYmd(nowMs);
  const start = new Date(nowMs);
  start.setUTCDate(start.getUTCDate() - 30);
  return { startYmd: msToUtcYmd(start.getTime()), endYmd };
}

export type ManualRefreshScrapeParams = {
  metaStatus: "ACTIVE";
  metaStartDate: string;
  metaEndDate: string;
  linkedinDateRange: string;
  tiktokStartDate: string;
  tiktokEndDate: string;
  microsoftStartDate: string;
  microsoftEndDate: string;
  pinterestStartDate: string;
  pinterestEndDate: string;
  snapchatStartDate: string;
  snapchatEndDate: string;
};

/** Platform date/status fields for Pro manual refresh (active today). */
export function buildManualRefreshScrapeParams(
  window: ManualRefreshDateWindow = computeManualRefreshTodayWindow(),
): ManualRefreshScrapeParams {
  const { startYmd, endYmd } = window;
  const tiktokWindow = computeManualRefreshTikTokWindow(Date.parse(`${endYmd}T12:00:00.000Z`));
  return {
    metaStatus: "ACTIVE",
    metaStartDate: startYmd,
    metaEndDate: endYmd,
    linkedinDateRange: "past-day",
    tiktokStartDate: tiktokWindow.startYmd,
    tiktokEndDate: tiktokWindow.endYmd,
    microsoftStartDate: startYmd,
    microsoftEndDate: endYmd,
    pinterestStartDate: startYmd,
    pinterestEndDate: endYmd,
    snapchatStartDate: startYmd,
    snapchatEndDate: endYmd,
  };
}

/** POST `/api/ads/library` fields for a single-platform Pro manual refresh. */
export function buildManualRefreshLibraryBodyForPlatform(
  platform: AdsLibraryPlatform,
  adsPerPlatform = MANUAL_REFRESH_ADS_PER_PLATFORM,
): Record<string, unknown> {
  const cap = Math.max(1, adsPerPlatform);
  const dateParams = buildManualRefreshScrapeParams();

  const base: Record<string, unknown> = {
    intent: "manual",
    metaStatus: dateParams.metaStatus,
  };

  switch (platform) {
    case "meta":
      return {
        ...base,
        metaMaxAds: cap,
        metaStartDate: dateParams.metaStartDate,
        metaEndDate: dateParams.metaEndDate,
        metaSortBy: "impressions_desc",
      };
    case "google":
      return {
        ...base,
        googleResultsLimit: cap,
        filterGoogleActiveToday: true,
      };
    case "linkedin":
      return { ...base, linkedinMaxAds: cap, linkedinDateRange: dateParams.linkedinDateRange };
    case "tiktok":
      return {
        ...base,
        tiktokMaxAds: cap,
        tiktokStartDate: dateParams.tiktokStartDate,
        tiktokEndDate: dateParams.tiktokEndDate,
      };
    case "microsoft":
      return {
        ...base,
        microsoftMaxSearchResults: Math.max(24, Math.min(cap, 1000)),
        microsoftStartDate: dateParams.microsoftStartDate,
        microsoftEndDate: dateParams.microsoftEndDate,
      };
    case "pinterest":
      return {
        ...base,
        pinterestMaxResults: Math.max(1, Math.min(cap, 1000)),
        pinterestStartDate: dateParams.pinterestStartDate,
        pinterestEndDate: dateParams.pinterestEndDate,
      };
    case "snapchat":
      return {
        ...base,
        snapchatMaxItems: Math.max(10, Math.min(cap, 10000)),
        snapchatStartDate: dateParams.snapchatStartDate,
        snapchatEndDate: dateParams.snapchatEndDate,
      };
    default:
      return base;
  }
}
