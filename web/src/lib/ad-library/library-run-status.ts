import type { AdsLibraryPlatform } from "./ads-library-platform";
import {
  computeGoogleAdRunDays,
  computeMetaAdRunDays,
  computeTikTokAdRunDays,
  isGoogleAdKilled,
  isMetaAdKilled,
  isTikTokAdKilled,
} from "./count-active-ads";
import type { GoogleAdRow, MetaAdCard, TikTokAdCard } from "./normalize";

export type LibraryRunStatus = {
  isRunning: boolean;
};

export function libraryRunStatusFromScrapedRow(
  isRunning: boolean
): LibraryRunStatus {
  return { isRunning };
}

export function isLibraryAdKilled(
  platform: AdsLibraryPlatform,
  ad: unknown,
  runStatus?: LibraryRunStatus,
  scrapeAtMs?: number,
  nowMs = Date.now()
): boolean {
  if (runStatus != null) return !runStatus.isRunning;
  if (platform === "meta") return isMetaAdKilled(ad as MetaAdCard, scrapeAtMs, nowMs);
  if (platform === "tiktok") return isTikTokAdKilled(ad as TikTokAdCard, nowMs);
  if (platform === "google" || platform === "youtube") {
    return isGoogleAdKilled(ad as GoogleAdRow, nowMs);
  }
  return false;
}

export function computeLibraryAdRunDays(
  platform: AdsLibraryPlatform,
  ad: unknown,
  runStatus?: LibraryRunStatus,
  scrapeAtMs?: number,
  nowMs = Date.now()
): number {
  if (runStatus?.isRunning && platform === "meta") {
    return computeMetaAdRunDays(
      { ...(ad as MetaAdCard), isActive: true, endedAt: undefined },
      scrapeAtMs,
      nowMs
    );
  }
  if (runStatus?.isRunning && platform === "tiktok") {
    return computeTikTokAdRunDays({ ...(ad as TikTokAdCard), flightEndMs: undefined }, nowMs);
  }
  if (runStatus?.isRunning && (platform === "google" || platform === "youtube")) {
    return computeGoogleAdRunDays(ad as GoogleAdRow, nowMs, true);
  }
  if (platform === "meta") return computeMetaAdRunDays(ad as MetaAdCard, scrapeAtMs, nowMs);
  if (platform === "tiktok") return computeTikTokAdRunDays(ad as TikTokAdCard, nowMs);
  if (platform === "google" || platform === "youtube") {
    return computeGoogleAdRunDays(ad as GoogleAdRow, nowMs);
  }
  return 0;
}
