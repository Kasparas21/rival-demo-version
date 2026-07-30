import type { SupabaseClient } from "@supabase/supabase-js";

import {
  extractImpressionsIndex,
  qualifiesAsUltimateWinner,
  resolveScrapedAdRunDays,
} from "@/lib/ad-library/ad-performance-ranking";
import { resolveTimelineAdKilled } from "@/lib/timeline/resolve-timeline-ad-killed";
import { landingPageKeyFromAd } from "@/lib/landing-pages/count-unique-landing-pages";
import type { Database } from "@/lib/supabase/types";

import { loadCompetitorIdsForBrandIds, loadCompetitorsById } from "./build-discovery-feed";
import type { PatternMetricsAd } from "./compute-pattern-metrics";
import { inStatsRange, resolveDiscoveryStatsRange } from "./discovery-stats-range";
import { fetchAllDiscoveryScrapedAds } from "./fetch-discovery-scraped-ads";
import type {
  DiscoveryStatsDrilldownQuery,
  DiscoveryStatsDrilldownResult,
  PatternDrilldownAd,
  PatternDrilldownAdStatus,
  PatternDrilldownCompetitorGroup,
} from "./types";

const FULL_AD_SELECT =
  "id, competitor_id, platform, format, ad_text, ad_creative_url, first_seen_at, last_seen_at, is_active, ai_extracted_angle, ai_extracted_launch_date, raw_payload";

type ScrapedRow = {
  id: string;
  competitor_id: string;
  platform: string;
  format: string | null;
  ad_text: string | null;
  first_seen_at: string;
  last_seen_at: string;
  is_active: boolean | null;
  raw_payload?: unknown;
  ai_extracted_angle?: string | null;
  ai_extracted_launch_date?: string | null;
};

type CompetitorRow = {
  id: string;
  name: string | null;
  brand_name: string | null;
  last_scraped_at: string | null;
};

function parseMs(iso: string): number | null {
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

function effectiveLaunchMs(ad: PatternMetricsAd): number | null {
  const launchRaw = ad.ai_extracted_launch_date?.trim();
  const launchMs = launchRaw ? Date.parse(launchRaw) : NaN;
  if (Number.isFinite(launchMs)) return launchMs;
  return parseMs(ad.first_seen_at);
}

function launchYmd(ad: PatternMetricsAd): string {
  const ms = effectiveLaunchMs(ad);
  return ms != null ? new Date(ms).toISOString().slice(0, 10) : ad.first_seen_at.slice(0, 10);
}

function hydrateStatsAd(row: ScrapedRow, comp: CompetitorRow, nowMs: number): PatternMetricsAd {
  const platform = (row.platform ?? "meta").trim().toLowerCase();
  const is_killed = resolveTimelineAdKilled(
    {
      platform,
      last_seen_at: row.last_seen_at,
      is_active: row.is_active ?? true,
      raw_payload: row.raw_payload ?? null,
    },
    comp.last_scraped_at,
    nowMs,
  );
  const impressions_index = extractImpressionsIndex(row.raw_payload ?? null);
  const scrapeAtMs = comp.last_scraped_at ? new Date(comp.last_scraped_at).getTime() : nowMs;
  const days_running = resolveScrapedAdRunDays({
    platform,
    first_seen_at: row.first_seen_at,
    last_seen_at: row.last_seen_at,
    is_killed,
    raw_payload: row.raw_payload ?? null,
    scrapeAtMs,
    nowMs,
  });

  return {
    id: row.id,
    competitor_id: row.competitor_id,
    competitor_name: comp.brand_name?.trim() || comp.name?.trim() || "Competitor",
    format: row.format ?? "",
    ad_text: row.ad_text ?? "",
    first_seen_at: row.first_seen_at,
    last_seen_at: row.last_seen_at,
    is_killed,
    days_running,
    impressions_index,
    is_ultimate_winner: qualifiesAsUltimateWinner(impressions_index, days_running),
    ai_extracted_angle: row.ai_extracted_angle ?? null,
    ai_extracted_launch_date: row.ai_extracted_launch_date ?? null,
    landing_page_key: landingPageKeyFromAd({
      platform,
      raw_payload: row.raw_payload ?? null,
    }),
  };
}

function classifyAdStatus(ad: PatternMetricsAd, rangeStartMs: number, rangeEndMs: number): PatternDrilldownAdStatus {
  const launchMs = effectiveLaunchMs(ad);
  const lastMs = parseMs(ad.last_seen_at);
  const launchedInPeriod =
    launchMs != null && inStatsRange(launchMs, { startMs: rangeStartMs, endMs: rangeEndMs, dateFrom: "", dateTo: "", label: "" });
  const killedInPeriod =
    ad.is_killed && lastMs != null && inStatsRange(lastMs, { startMs: rangeStartMs, endMs: rangeEndMs, dateFrom: "", dateTo: "", label: "" });

  if (killedInPeriod) return "killed_this_week";
  if (launchedInPeriod) return "new_this_week";
  if (!ad.is_killed) return ad.is_ultimate_winner ? "ultimate_winner" : "active";
  return "killed";
}

function toDrilldownAd(
  ad: PatternMetricsAd,
  rangeStartMs: number,
  rangeEndMs: number,
): PatternDrilldownAd {
  return {
    id: ad.id,
    competitor_id: ad.competitor_id,
    competitor_name: ad.competitor_name,
    status: classifyAdStatus(ad, rangeStartMs, rangeEndMs),
    format: ad.format,
    preview: ad.ad_text.trim().slice(0, 160) || "No ad copy",
    days_running: ad.days_running,
    impressions_index: ad.impressions_index,
    launched: launchYmd(ad),
    angle: ad.ai_extracted_angle,
    is_ultimate_winner: ad.is_ultimate_winner,
  };
}

function groupByCompetitor(ads: PatternDrilldownAd[]): PatternDrilldownCompetitorGroup[] {
  const map = new Map<string, PatternDrilldownCompetitorGroup>();
  for (const ad of ads) {
    const existing = map.get(ad.competitor_id);
    if (existing) existing.ads.push(ad);
    else {
      map.set(ad.competitor_id, {
        competitor_id: ad.competitor_id,
        name: ad.competitor_name,
        ads: [ad],
      });
    }
  }
  return [...map.values()].sort((a, b) => b.ads.length - a.ads.length || a.name.localeCompare(b.name));
}

function launchedInRange(ad: PatternMetricsAd, rangeStartMs: number, rangeEndMs: number): boolean {
  const launchMs = effectiveLaunchMs(ad);
  return launchMs != null && launchMs >= rangeStartMs && launchMs <= rangeEndMs;
}

function killedInRange(ad: PatternMetricsAd, rangeStartMs: number, rangeEndMs: number): boolean {
  if (!ad.is_killed) return false;
  const lastMs = parseMs(ad.last_seen_at);
  return lastMs != null && lastMs >= rangeStartMs && lastMs <= rangeEndMs;
}

function sortAds(ads: PatternDrilldownAd[]): PatternDrilldownAd[] {
  return [...ads].sort((a, b) => b.days_running - a.days_running || a.competitor_name.localeCompare(b.competitor_name));
}

const KIND_TITLES: Record<DiscoveryStatsDrilldownQuery["kind"], string> = {
  launched: "Launched in period",
  killed: "Turned off in period",
  active: "Currently active ads",
  ultimate_winners: "Ultimate winners",
  longest_running: "Longest running ads",
  fast_kills: "Fast kills (≤7 days)",
  competitor_launched: "Launches",
  competitor_killed: "Retirements",
  competitor_active: "Active ads",
  competitor_winners: "Ultimate winners",
  single_ad: "Ad detail",
};

export async function loadStatsDrilldown(
  supabase: SupabaseClient<Database>,
  userId: string,
  query: DiscoveryStatsDrilldownQuery,
): Promise<{ ok: true; result: DiscoveryStatsDrilldownResult } | { ok: false; error: string }> {
  const range = resolveDiscoveryStatsRange({
    datePreset: query.datePreset,
    statsDateFrom: query.statsDateFrom,
    statsDateTo: query.statsDateTo,
  });

  const clientBrandIds =
    query.clientBrandIds.length > 0 ? query.clientBrandIds : [query.brandId];

  const { ids: competitorIds, error: competitorError } = await loadCompetitorIdsForBrandIds(
    supabase,
    userId,
    clientBrandIds,
  );
  if (competitorError) return { ok: false, error: competitorError };

  let scopedIds = competitorIds;
  if (query.competitorFilterIds.length > 0) {
    const allowed = new Set(competitorIds);
    scopedIds = query.competitorFilterIds.filter((id) => allowed.has(id));
  }
  if (query.competitorId) {
    scopedIds = scopedIds.filter((id) => id === query.competitorId);
  }
  if (!scopedIds.length) return { ok: false, error: "No competitors in scope" };

  const { rows: competitors, error: compLoadError } = await loadCompetitorsById(
    supabase,
    userId,
    scopedIds,
  );
  if (compLoadError) return { ok: false, error: compLoadError };

  const compById = new Map(competitors.map((c) => [c.id, c]));
  const { rows: scrapedRows, error: adsError } = await fetchAllDiscoveryScrapedAds(
    supabase,
    userId,
    scopedIds,
    FULL_AD_SELECT,
  );
  if (adsError) return { ok: false, error: adsError };

  const nowMs = Date.now();
  let ads = scrapedRows
    .map((row) => {
      const comp = compById.get(row.competitor_id);
      if (!comp) return null;
      return hydrateStatsAd(row, comp as CompetitorRow, nowMs);
    })
    .filter((ad): ad is PatternMetricsAd => ad != null);

  const adIdSet = query.adIds?.length ? new Set(query.adIds) : null;
  if (adIdSet) {
    ads = ads.filter((ad) => adIdSet.has(ad.id));
  }

  const { startMs, endMs } = range;
  const allTime = range.dateFrom === "all";

  switch (query.kind) {
    case "launched":
      ads = ads.filter((ad) => allTime || launchedInRange(ad, startMs, endMs));
      break;
    case "competitor_launched":
      ads = ads.filter((ad) => allTime || launchedInRange(ad, startMs, endMs));
      break;
    case "killed":
    case "competitor_killed":
      ads = ads.filter((ad) => allTime ? ad.is_killed : killedInRange(ad, startMs, endMs));
      break;
    case "active":
    case "competitor_active":
      ads = ads.filter((ad) => !ad.is_killed);
      break;
    case "ultimate_winners":
    case "competitor_winners":
      ads = ads.filter((ad) => ad.is_ultimate_winner);
      break;
    case "longest_running":
      ads = [...ads].sort((a, b) => b.days_running - a.days_running).slice(0, 50);
      break;
    case "fast_kills":
      ads = ads.filter(
        (ad) =>
          ad.is_killed &&
          ad.days_running <= 7 &&
          (allTime || killedInRange(ad, startMs, endMs)),
      );
      break;
    case "single_ad":
      if (query.adIds?.[0]) ads = ads.filter((ad) => ad.id === query.adIds![0]);
      else if (query.competitorId && query.adIds?.length) {
        ads = ads.filter((ad) => query.adIds!.includes(ad.id));
      }
      break;
    default:
      break;
  }

  const drilldownAds = sortAds(ads.map((ad) => toDrilldownAd(ad, startMs, endMs)));

  const title =
    query.title?.trim() ||
    (query.competitorId
      ? `${competitors.find((c) => c.id === query.competitorId)?.brand_name?.trim() || competitors.find((c) => c.id === query.competitorId)?.name?.trim() || "Competitor"} — ${KIND_TITLES[query.kind]}`
      : KIND_TITLES[query.kind]);

  return {
    ok: true,
    result: {
      title,
      total: drilldownAds.length,
      groups: {
        new_this_week: drilldownAds.filter((ad) => ad.status === "new_this_week"),
        active: drilldownAds.filter((ad) => ad.status === "active" || ad.status === "ultimate_winner"),
        killed_this_week: drilldownAds.filter((ad) => ad.status === "killed_this_week"),
        killed: drilldownAds.filter((ad) => ad.status === "killed"),
      },
      by_competitor: groupByCompetitor(drilldownAds),
    },
  };
}
