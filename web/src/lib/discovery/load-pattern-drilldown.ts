import type { SupabaseClient } from "@supabase/supabase-js";

import {
  extractImpressionsIndex,
  qualifiesAsUltimateWinner,
  resolveScrapedAdRunDays,
} from "@/lib/ad-library/ad-performance-ranking";
import { resolveTimelineAdKilled } from "@/lib/timeline/resolve-timeline-ad-killed";
import type { Database } from "@/lib/supabase/types";

import { loadCompetitorIdsForBrandIds } from "./build-discovery-feed";
import { parsePatternWeekStartMs, type PatternMetricsAd } from "./compute-pattern-metrics";
import { fetchAllDiscoveryScrapedAds } from "./fetch-discovery-scraped-ads";
import { DAY_MS, inUtcHalfOpenRange } from "./pattern-week-utils";
import type {
  PatternDrilldownAd,
  PatternDrilldownAdStatus,
  PatternDrilldownCompetitorGroup,
  PatternDrilldownResult,
} from "./types";

const IN_CHUNK = 40;
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

export type PatternDrilldownQuery = {
  brandId: string;
  weekStart: string;
  title?: string;
  angle?: string;
  adIds?: string[];
  competitorId?: string;
  launchedOnly?: boolean;
  killedOnly?: boolean;
};

function chunkIds<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

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

async function loadCompetitorsById(
  supabase: SupabaseClient<Database>,
  userId: string,
  competitorIds: string[],
): Promise<{ rows: CompetitorRow[]; error?: string }> {
  const rows: CompetitorRow[] = [];
  for (const chunk of chunkIds(competitorIds, IN_CHUNK)) {
    const { data, error } = await supabase
      .from("saved_competitors")
      .select("id, name, brand_name, last_scraped_at")
      .eq("user_id", userId)
      .in("id", chunk);
    if (error) return { rows: [], error: error.message };
    rows.push(...((data ?? []) as CompetitorRow[]));
  }
  return { rows };
}

function hydratePatternAd(row: ScrapedRow, comp: CompetitorRow, nowMs: number): PatternMetricsAd {
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
  };
}

function classifyAdStatus(
  ad: PatternMetricsAd,
  weekStartMs: number,
  weekEndMs: number,
): PatternDrilldownAdStatus {
  const launchMs = effectiveLaunchMs(ad);
  const lastMs = parseMs(ad.last_seen_at);
  const launchedThisWeek =
    launchMs != null && inUtcHalfOpenRange(launchMs, weekStartMs, weekEndMs);
  const killedThisWeek =
    ad.is_killed && lastMs != null && inUtcHalfOpenRange(lastMs, weekStartMs, weekEndMs);

  if (killedThisWeek) return "killed_this_week";
  if (launchedThisWeek) return "new_this_week";
  if (!ad.is_killed) return ad.is_ultimate_winner ? "ultimate_winner" : "active";
  return "killed";
}

function toDrilldownAd(
  ad: PatternMetricsAd,
  weekStartMs: number,
  weekEndMs: number,
): PatternDrilldownAd {
  return {
    id: ad.id,
    competitor_id: ad.competitor_id,
    competitor_name: ad.competitor_name,
    status: classifyAdStatus(ad, weekStartMs, weekEndMs),
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
    if (existing) {
      existing.ads.push(ad);
    } else {
      map.set(ad.competitor_id, {
        competitor_id: ad.competitor_id,
        name: ad.competitor_name,
        ads: [ad],
      });
    }
  }
  return [...map.values()].sort((a, b) => b.ads.length - a.ads.length || a.name.localeCompare(b.name));
}

function statusRank(status: PatternDrilldownAdStatus): number {
  switch (status) {
    case "new_this_week":
      return 0;
    case "ultimate_winner":
      return 1;
    case "active":
      return 2;
    case "killed_this_week":
      return 3;
    case "killed":
      return 4;
    default:
      return 5;
  }
}

function sortAds(ads: PatternDrilldownAd[]): PatternDrilldownAd[] {
  return [...ads].sort(
    (a, b) =>
      statusRank(a.status) - statusRank(b.status) ||
      b.days_running - a.days_running ||
      a.competitor_name.localeCompare(b.competitor_name),
  );
}

export async function loadPatternDrilldown(
  supabase: SupabaseClient<Database>,
  userId: string,
  query: PatternDrilldownQuery,
): Promise<{ ok: true; result: PatternDrilldownResult } | { ok: false; error: string }> {
  const weekStartMs = parsePatternWeekStartMs(query.weekStart);
  if (weekStartMs == null) {
    return { ok: false, error: "Invalid weekStart" };
  }

  const { ids: competitorIds, error: competitorError } = await loadCompetitorIdsForBrandIds(
    supabase,
    userId,
    [query.brandId],
  );
  if (competitorError) return { ok: false, error: competitorError };
  if (!competitorIds.length) {
    return { ok: false, error: "No tracked competitors for this workspace" };
  }

  const scopedCompetitorIds = query.competitorId
    ? competitorIds.filter((id) => id === query.competitorId)
    : competitorIds;
  if (!scopedCompetitorIds.length) {
    return { ok: false, error: "Competitor not found in this workspace" };
  }

  const { rows: competitors, error: compLoadError } = await loadCompetitorsById(
    supabase,
    userId,
    scopedCompetitorIds,
  );
  if (compLoadError) return { ok: false, error: compLoadError };

  const compById = new Map(competitors.map((c) => [c.id, c]));
  const { rows: scrapedRows, error: adsError } = await fetchAllDiscoveryScrapedAds(
    supabase,
    userId,
    scopedCompetitorIds,
    FULL_AD_SELECT,
  );
  if (adsError) return { ok: false, error: adsError };

  const nowMs = Date.now();
  const weekEndMs = weekStartMs + 7 * DAY_MS;
  const adIdSet = query.adIds?.length ? new Set(query.adIds) : null;
  const angleNeedle = query.angle?.trim().toLowerCase();

  let ads = scrapedRows
    .map((row) => {
      const comp = compById.get(row.competitor_id);
      if (!comp) return null;
      return hydratePatternAd(row, comp, nowMs);
    })
    .filter((ad): ad is PatternMetricsAd => ad != null);

  if (adIdSet) {
    ads = ads.filter((ad) => adIdSet.has(ad.id));
  } else if (angleNeedle) {
    ads = ads.filter((ad) => ad.ai_extracted_angle?.trim().toLowerCase() === angleNeedle);
  }

  if (query.launchedOnly) {
    ads = ads.filter((ad) => {
      const launchMs = effectiveLaunchMs(ad);
      return launchMs != null && inUtcHalfOpenRange(launchMs, weekStartMs, weekEndMs);
    });
  }

  if (query.killedOnly) {
    ads = ads.filter((ad) => {
      if (!ad.is_killed) return false;
      const lastMs = parseMs(ad.last_seen_at);
      return lastMs != null && inUtcHalfOpenRange(lastMs, weekStartMs, weekEndMs);
    });
  }

  const drilldownAds = sortAds(ads.map((ad) => toDrilldownAd(ad, weekStartMs, weekEndMs)));

  const groups = {
    new_this_week: drilldownAds.filter((ad) => ad.status === "new_this_week"),
    active: drilldownAds.filter((ad) => ad.status === "active" || ad.status === "ultimate_winner"),
    killed_this_week: drilldownAds.filter((ad) => ad.status === "killed_this_week"),
    killed: drilldownAds.filter((ad) => ad.status === "killed"),
  };

  const title =
    query.title?.trim() ||
    (query.angle
      ? query.angle
      : query.competitorId
        ? competitors.find((c) => c.id === query.competitorId)?.brand_name?.trim() ||
          competitors.find((c) => c.id === query.competitorId)?.name?.trim() ||
          "Competitor ads"
        : "Pattern evidence");

  return {
    ok: true,
    result: {
      title,
      total: drilldownAds.length,
      groups,
      by_competitor: groupByCompetitor(drilldownAds),
    },
  };
}
