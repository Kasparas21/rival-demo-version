import type { InitialScrapePlatform } from "./constants";
import {
  computeScheduledScrapeDateWindow,
  type ScheduledScrapeDateWindow,
} from "./scheduled-scrape-date-window";
import {
  refreshIntervalDaysForClassification,
  scrapeLimitForClassification,
  type PlatformClassification,
} from "./platform-prioritization";

export type PlatformScheduleDebug = {
  platform: InitialScrapePlatform;
  classification: PlatformClassification;
  activeAdCount: number;
  refreshIntervalDays: number;
  adsPerRefresh: number;
  lastScrapeAt: string | null;
  nextScrapeAt: string | null;
  nextScrapeWindow: ScheduledScrapeDateWindow;
};

export function buildPlatformScheduleDebug(params: {
  platform: InitialScrapePlatform;
  classification: PlatformClassification;
  activeAdCount: number;
  lastScrapeAt: string | null;
  nextScrapeAt: string | null;
  nowMs?: number;
}): PlatformScheduleDebug {
  const classification = params.classification;
  const isInactiveProbe = classification === "INACTIVE";
  const lastScrapeAt = params.lastScrapeAt;
  const nowMs = params.nowMs ?? Date.now();

  const nextScrapeWindow =
    lastScrapeAt != null
      ? computeScheduledScrapeDateWindow(lastScrapeAt, nowMs)
      : {
          startYmd: new Date(nowMs).toISOString().slice(0, 10),
          endYmd: new Date(nowMs).toISOString().slice(0, 10),
        };

  return {
    platform: params.platform,
    classification,
    activeAdCount: params.activeAdCount,
    refreshIntervalDays: refreshIntervalDaysForClassification(params.platform, classification),
    adsPerRefresh: scrapeLimitForClassification(classification, {
      isInactiveProbe: isInactiveProbe,
    }),
    lastScrapeAt,
    nextScrapeAt: params.nextScrapeAt,
    nextScrapeWindow,
  };
}
