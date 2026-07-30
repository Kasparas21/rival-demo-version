import { landingPageKeyFromAd } from "@/lib/landing-pages/count-unique-landing-pages";
import type { Json } from "@/lib/supabase/types";

import type { DiscoveryMarketStats } from "./types";

const WEEK_MS = 7 * 86_400_000;

export type DiscoveryMarketStatsAd = {
  competitor_id: string;
  competitor_name: string;
  platform?: string;
  format: string;
  first_seen_at: string;
  last_seen_at: string;
  is_killed: boolean;
  impressions_index: number | null;
  is_ultimate_winner: boolean;
  raw_payload?: Json;
};

function isVideoFormat(format: string | null | undefined): boolean {
  const f = (format ?? "").trim().toLowerCase();
  return f.includes("video") || f === "reel" || f === "carousel_video";
}

function parseMs(iso: string): number | null {
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

export function computeDiscoveryMarketStats(
  ads: DiscoveryMarketStatsAd[],
  nowMs = Date.now(),
): DiscoveryMarketStats {
  const empty: DiscoveryMarketStats = {
    total_ads: 0,
    active_ads: 0,
    retired_ads: 0,
    competitors_tracked: 0,
    new_this_week: 0,
    new_last_week: 0,
    new_week_over_week_delta: 0,
    new_week_over_week_pct: null,
    retired_this_week: 0,
    net_change_this_week: 0,
    ultimate_winners: 0,
    video_percent: 0,
    top_competitor_name: null,
    top_competitor_ad_count: 0,
    avg_impressions_index: null,
    hottest_competitor_name: null,
    hottest_competitor_new_this_week: 0,
    unique_landing_pages: 0,
  };

  if (!ads.length) return empty;

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

  const adsByCompetitor = new Map<string, { name: string; count: number }>();
  const launchesThisWeekByCompetitor = new Map<string, { name: string; count: number }>();
  const landingPageKeys = new Set<string>();

  for (const ad of ads) {
    if (ad.is_killed) retiredAds += 1;
    else activeAds += 1;

    if (ad.is_ultimate_winner) ultimateWinners += 1;
    if (isVideoFormat(ad.format)) videoCount += 1;

    if (ad.impressions_index != null && Number.isFinite(ad.impressions_index)) {
      impressionsSum += ad.impressions_index;
      impressionsCount += 1;
    }

    const comp = adsByCompetitor.get(ad.competitor_id) ?? {
      name: ad.competitor_name,
      count: 0,
    };
    comp.count += 1;
    adsByCompetitor.set(ad.competitor_id, comp);

    const firstMs = parseMs(ad.first_seen_at);
    if (firstMs != null) {
      if (firstMs >= thisWeekStart && firstMs <= nowMs) {
        newThisWeek += 1;
        const hot = launchesThisWeekByCompetitor.get(ad.competitor_id) ?? {
          name: ad.competitor_name,
          count: 0,
        };
        hot.count += 1;
        launchesThisWeekByCompetitor.set(ad.competitor_id, hot);
      } else if (firstMs >= lastWeekStart && firstMs < thisWeekStart) {
        newLastWeek += 1;
      }
    }

    if (ad.is_killed) {
      const lastMs = parseMs(ad.last_seen_at);
      if (lastMs != null && lastMs >= thisWeekStart && lastMs <= nowMs) {
        retiredThisWeek += 1;
      }
    }

    const lpKey = landingPageKeyFromAd({
      platform: ad.platform ?? "meta",
      raw_payload: ad.raw_payload ?? null,
    });
    if (lpKey) landingPageKeys.add(lpKey);
  }

  let topCompetitorName: string | null = null;
  let topCompetitorCount = 0;
  for (const { name, count } of adsByCompetitor.values()) {
    if (count > topCompetitorCount) {
      topCompetitorCount = count;
      topCompetitorName = name;
    }
  }

  let hottestName: string | null = null;
  let hottestCount = 0;
  for (const { name, count } of launchesThisWeekByCompetitor.values()) {
    if (count > hottestCount) {
      hottestCount = count;
      hottestName = name;
    }
  }

  const wowDelta = newThisWeek - newLastWeek;
  const wowPct =
    newLastWeek > 0 ? Math.round((wowDelta / newLastWeek) * 100) : newThisWeek > 0 ? 100 : null;

  return {
    total_ads: ads.length,
    active_ads: activeAds,
    retired_ads: retiredAds,
    competitors_tracked: adsByCompetitor.size,
    new_this_week: newThisWeek,
    new_last_week: newLastWeek,
    new_week_over_week_delta: wowDelta,
    new_week_over_week_pct: wowPct,
    retired_this_week: retiredThisWeek,
    net_change_this_week: newThisWeek - retiredThisWeek,
    ultimate_winners: ultimateWinners,
    video_percent: Math.round((videoCount / ads.length) * 100),
    top_competitor_name: topCompetitorName,
    top_competitor_ad_count: topCompetitorCount,
    avg_impressions_index:
      impressionsCount > 0 ? Math.round((impressionsSum / impressionsCount) * 10) / 10 : null,
    hottest_competitor_name: hottestName,
    hottest_competitor_new_this_week: hottestCount,
    unique_landing_pages: landingPageKeys.size,
  };
}
