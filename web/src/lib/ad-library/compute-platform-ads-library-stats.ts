import {
  extractImpressionsIndex,
  qualifiesAsUltimateWinner,
} from "@/lib/ad-library/ad-performance-ranking";
import type { AdsLibraryPlatform } from "@/lib/ad-library/ads-library-platform";
import {
  computeAdRunDays,
  googleRowLastShownYmd,
  isAdKilledForLibraryCard,
} from "@/lib/ad-library/count-active-ads";
import type {
  GoogleAdRow,
  LinkedInAdCard,
  MetaAdCard,
  PinterestAdCard,
  SnapchatAdCard,
  TikTokAdCard,
} from "@/lib/ad-library/normalize";

const WEEK_MS = 7 * 86_400_000;
const DAY_MS = 86_400_000;

export type PlatformAdsLibraryStats = {
  total_ads: number;
  active_ads: number;
  retired_ads: number;
  active_percent: number;
  new_this_week: number;
  new_last_week: number;
  new_week_over_week_delta: number;
  new_week_over_week_pct: number | null;
  retired_this_week: number;
  net_change_this_week: number;
  video_percent: number;
  image_percent: number;
  ultimate_winners: number;
  avg_impressions_index: number | null;
  impressions_coverage_percent: number;
  median_days_running: number;
  avg_days_running: number;
  longest_running_days: number;
  youtube_count: number;
  text_ad_count: number;
};

type NormalizedStatsAd = {
  firstSeenMs: number | null;
  lastSeenMs: number | null;
  isKilled: boolean;
  isVideo: boolean;
  isText: boolean;
  isYoutube: boolean;
  impressionsIndex: number | null;
  isUltimateWinner: boolean;
  daysRunning: number;
};

function metaTimestampToMs(ts: number): number {
  return ts > 1e12 ? ts : ts * 1000;
}

function ymdToMs(ymd: string | null | undefined): number | null {
  const t = ymd?.trim();
  if (!t) return null;
  const parsed = Date.parse(`${t.slice(0, 10)}T12:00:00`);
  return Number.isFinite(parsed) ? parsed : null;
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]!
    : Math.round((sorted[mid - 1]! + sorted[mid]!) / 2);
}

function isPlatformAdVideo(platform: AdsLibraryPlatform, ad: unknown): boolean {
  if (!ad || typeof ad !== "object") return false;
  switch (platform) {
    case "meta":
      return Boolean((ad as MetaAdCard).isVideo);
    case "google": {
      const row = ad as GoogleAdRow;
      if (row.type === "youtube") return true;
      return (row.format ?? "").toLowerCase().includes("video");
    }
    case "tiktok":
      return Boolean((ad as TikTokAdCard).videoUrl?.trim());
    case "linkedin":
      return Boolean((ad as LinkedInAdCard).videoUrl?.trim());
    case "pinterest":
      return Boolean((ad as PinterestAdCard).videoUrl?.trim());
    case "snapchat":
      return Boolean((ad as SnapchatAdCard).videoUrl?.trim());
    default:
      return false;
  }
}

function firstSeenMsForAd(platform: AdsLibraryPlatform, ad: unknown): number | null {
  if (!ad || typeof ad !== "object") return null;
  switch (platform) {
    case "meta": {
      const card = ad as MetaAdCard;
      if (card.startedAt != null && Number.isFinite(card.startedAt)) {
        return metaTimestampToMs(card.startedAt);
      }
      return null;
    }
    case "google": {
      const row = ad as GoogleAdRow;
      return ymdToMs(row.firstShown) ?? ymdToMs(googleRowLastShownYmd(row));
    }
    case "linkedin": {
      const card = ad as LinkedInAdCard;
      return ymdToMs(card.publicationStart);
    }
    case "tiktok": {
      const card = ad as TikTokAdCard;
      return card.flightStartMs ?? null;
    }
  }
  return null;
}

function lastSeenMsForAd(
  platform: AdsLibraryPlatform,
  ad: unknown,
  killed: boolean,
  nowMs: number,
): number | null {
  if (!ad || typeof ad !== "object") return null;
  switch (platform) {
    case "meta": {
      const card = ad as MetaAdCard;
      if (killed && card.endedAt != null && Number.isFinite(card.endedAt) && card.endedAt > 0) {
        return metaTimestampToMs(card.endedAt);
      }
      return nowMs;
    }
    case "google": {
      const row = ad as GoogleAdRow;
      return ymdToMs(row.lastShown) ?? ymdToMs(googleRowLastShownYmd(row)) ?? nowMs;
    }
    case "linkedin": {
      const card = ad as LinkedInAdCard;
      return ymdToMs(card.publicationEnd) ?? nowMs;
    }
    case "tiktok": {
      const card = ad as TikTokAdCard;
      if (killed && card.flightEndMs != null) return card.flightEndMs;
      return nowMs;
    }
    case "pinterest":
    case "snapchat":
      return nowMs;
    default:
      return nowMs;
  }
}

function normalizeAdForStats(
  platform: AdsLibraryPlatform,
  ad: unknown,
  scrapeAtMs: number | null,
  nowMs: number,
): NormalizedStatsAd | null {
  if (!ad || typeof ad !== "object") return null;

  const killed = isAdKilledForLibraryCard(platform, ad, scrapeAtMs ?? undefined, nowMs);
  const firstSeenMs = firstSeenMsForAd(platform, ad);
  const lastSeenMs = lastSeenMsForAd(platform, ad, killed, nowMs);
  const spanDays =
    firstSeenMs != null && lastSeenMs != null
      ? Math.max(0, Math.floor((lastSeenMs - firstSeenMs) / DAY_MS))
      : 0;
  const daysRunning = Math.max(
    computeAdRunDays(platform, ad, scrapeAtMs ?? undefined, nowMs),
    spanDays,
  );
  const isVideo = isPlatformAdVideo(platform, ad);

  let impressionsIndex: number | null = null;
  if (platform === "meta") {
    const card = ad as MetaAdCard;
    impressionsIndex = card.impressionsIndex ?? extractImpressionsIndex(card);
  }

  let isText = false;
  let isYoutube = false;
  if (platform === "google") {
    const row = ad as GoogleAdRow;
    isYoutube = row.type === "youtube";
    isText =
      row.type === "google" &&
      !isVideo &&
      (row.format ?? "").toLowerCase().includes("text");
  }

  return {
    firstSeenMs,
    lastSeenMs,
    isKilled: killed,
    isVideo,
    isText,
    isYoutube,
    impressionsIndex,
    isUltimateWinner: qualifiesAsUltimateWinner(impressionsIndex, daysRunning),
    daysRunning,
  };
}

const EMPTY_STATS: PlatformAdsLibraryStats = {
  total_ads: 0,
  active_ads: 0,
  retired_ads: 0,
  active_percent: 0,
  new_this_week: 0,
  new_last_week: 0,
  new_week_over_week_delta: 0,
  new_week_over_week_pct: null,
  retired_this_week: 0,
  net_change_this_week: 0,
  video_percent: 0,
  image_percent: 0,
  ultimate_winners: 0,
  avg_impressions_index: null,
  impressions_coverage_percent: 0,
  median_days_running: 0,
  avg_days_running: 0,
  longest_running_days: 0,
  youtube_count: 0,
  text_ad_count: 0,
};

export function computePlatformAdsLibraryStats(
  platform: AdsLibraryPlatform,
  ads: unknown[],
  scrapeAtMs?: number | null,
  nowMs = Date.now(),
): PlatformAdsLibraryStats {
  if (!ads.length) return EMPTY_STATS;

  const thisWeekStart = nowMs - WEEK_MS;
  const lastWeekStart = nowMs - 2 * WEEK_MS;

  let activeAds = 0;
  let retiredAds = 0;
  let newThisWeek = 0;
  let newLastWeek = 0;
  let retiredThisWeek = 0;
  let ultimateWinners = 0;
  let videoCount = 0;
  let impressionsSum = 0;
  let impressionsCount = 0;
  let youtubeCount = 0;
  let textAdCount = 0;
  const daysRunningValues: number[] = [];

  for (const ad of ads) {
    const normalized = normalizeAdForStats(platform, ad, scrapeAtMs ?? null, nowMs);
    if (!normalized) continue;

    if (normalized.isKilled) retiredAds += 1;
    else activeAds += 1;

    if (normalized.isUltimateWinner) ultimateWinners += 1;
    if (normalized.isVideo) videoCount += 1;
    if (normalized.isYoutube) youtubeCount += 1;
    if (normalized.isText) textAdCount += 1;

    if (normalized.impressionsIndex != null && Number.isFinite(normalized.impressionsIndex)) {
      impressionsSum += normalized.impressionsIndex;
      impressionsCount += 1;
    }

    if (normalized.daysRunning > 0) {
      daysRunningValues.push(normalized.daysRunning);
    }

    const firstMs = normalized.firstSeenMs;
    if (firstMs != null) {
      if (firstMs >= thisWeekStart && firstMs <= nowMs) {
        newThisWeek += 1;
      } else if (firstMs >= lastWeekStart && firstMs < thisWeekStart) {
        newLastWeek += 1;
      }
    }

    if (normalized.isKilled) {
      const lastMs = normalized.lastSeenMs;
      if (lastMs != null && lastMs >= thisWeekStart && lastMs <= nowMs) {
        retiredThisWeek += 1;
      }
    }
  }

  const total = ads.length;
  const wowDelta = newThisWeek - newLastWeek;
  const wowPct =
    newLastWeek > 0 ? Math.round((wowDelta / newLastWeek) * 100) : newThisWeek > 0 ? 100 : null;

  const avgDays =
    daysRunningValues.length > 0
      ? Math.round(
          daysRunningValues.reduce((sum, d) => sum + d, 0) / daysRunningValues.length,
        )
      : 0;

  const imageCount = total - videoCount;

  return {
    total_ads: total,
    active_ads: activeAds,
    retired_ads: retiredAds,
    active_percent: Math.round((activeAds / total) * 100),
    new_this_week: newThisWeek,
    new_last_week: newLastWeek,
    new_week_over_week_delta: wowDelta,
    new_week_over_week_pct: wowPct,
    retired_this_week: retiredThisWeek,
    net_change_this_week: newThisWeek - retiredThisWeek,
    video_percent: Math.round((videoCount / total) * 100),
    image_percent: Math.round((imageCount / total) * 100),
    ultimate_winners: ultimateWinners,
    avg_impressions_index:
      impressionsCount > 0 ? Math.round((impressionsSum / impressionsCount) * 10) / 10 : null,
    impressions_coverage_percent: Math.round((impressionsCount / total) * 100),
    median_days_running: median(daysRunningValues),
    avg_days_running: avgDays,
    longest_running_days: daysRunningValues.length > 0 ? Math.max(...daysRunningValues) : 0,
    youtube_count: youtubeCount,
    text_ad_count: textAdCount,
  };
}
