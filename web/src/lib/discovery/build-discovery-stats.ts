import type { SupabaseClient } from "@supabase/supabase-js";

import {
  extractImpressionsIndex,
  qualifiesAsUltimateWinner,
  resolveScrapedAdRunDays,
} from "@/lib/ad-library/ad-performance-ranking";
import { resolveTimelineAdKilled } from "@/lib/timeline/resolve-timeline-ad-killed";
import { landingPageKeyFromAd } from "@/lib/landing-pages/count-unique-landing-pages";
import type { Database } from "@/lib/supabase/types";

import {
  loadCompetitorIdsForBrandIds,
  loadCompetitorsById,
} from "./build-discovery-feed";
import type { PatternMetricsAd } from "./compute-pattern-metrics";
import { computeDiscoveryStats } from "./compute-discovery-stats";
import { resolveDiscoveryStatsRange } from "./discovery-stats-range";
import { fetchAllDiscoveryScrapedAds } from "./fetch-discovery-scraped-ads";
import type {
  DiscoveryCompetitorChip,
  DiscoveryStatsQuery,
  DiscoveryStatsResult,
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
  brand_domain: string | null;
  logo_url: string | null;
  brand_logo_url: string | null;
  last_scraped_at: string | null;
};

function isVideoFormat(format: string | null | undefined): boolean {
  const f = (format ?? "").trim().toLowerCase();
  return f.includes("video") || f === "reel" || f === "carousel_video";
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

export async function buildDiscoveryStats(
  supabase: SupabaseClient<Database>,
  userId: string,
  query: DiscoveryStatsQuery,
): Promise<DiscoveryStatsResult> {
  const clientBrandIds =
    query.clientBrandIds.length > 0 ? query.clientBrandIds : [query.brandId];

  const { ids: scopeIds, error: scopeErr } = await loadCompetitorIdsForBrandIds(
    supabase,
    userId,
    clientBrandIds,
  );
  if (scopeErr) return { ok: false, error: scopeErr };

  let competitorIds = scopeIds;
  if (query.competitorFilterIds.length > 0) {
    const allowed = new Set(scopeIds);
    competitorIds = query.competitorFilterIds.filter((id) => allowed.has(id));
  }

  if (competitorIds.length === 0) {
    const range = resolveDiscoveryStatsRange({
      datePreset: query.datePreset,
      statsDateFrom: query.statsDateFrom,
      statsDateTo: query.statsDateTo,
    });
    return {
      ok: true,
      stats: computeDiscoveryStats([], range, new Map()),
      competitors: [],
    };
  }

  const { rows: competitorRows, error: compErr } = await loadCompetitorsById(
    supabase,
    userId,
    competitorIds,
  );
  if (compErr) return { ok: false, error: compErr };

  const compById = new Map(competitorRows.map((row) => [row.id, row as CompetitorRow]));
  const { rows: scrapedRows, error: adsErr } = await fetchAllDiscoveryScrapedAds(
    supabase,
    userId,
    competitorIds,
    FULL_AD_SELECT,
  );
  if (adsErr) return { ok: false, error: adsErr };

  const nowMs = Date.now();
  let ads = scrapedRows
    .map((row) => {
      const comp = compById.get(row.competitor_id);
      if (!comp) return null;
      return hydrateStatsAd(row, comp, nowMs);
    })
    .filter((ad): ad is PatternMetricsAd => ad != null);

  if (query.status === "active") ads = ads.filter((ad) => !ad.is_killed);
  if (query.status === "retired") ads = ads.filter((ad) => ad.is_killed);
  if (query.format === "video") ads = ads.filter((ad) => isVideoFormat(ad.format));
  if (query.format === "image") ads = ads.filter((ad) => !isVideoFormat(ad.format));

  const competitorMeta = new Map<
    string,
    { domain: string | null; logo_url: string | null }
  >();
  for (const row of competitorRows) {
    competitorMeta.set(row.id, {
      domain: row.brand_domain ?? null,
      logo_url: row.brand_logo_url ?? row.logo_url ?? null,
    });
  }

  const range = resolveDiscoveryStatsRange({
    datePreset: query.datePreset,
    statsDateFrom: query.statsDateFrom,
    statsDateTo: query.statsDateTo,
  });

  const stats = computeDiscoveryStats(ads, range, competitorMeta);

  const chips: DiscoveryCompetitorChip[] = stats.competitors.map((c) => ({
    id: c.competitor_id,
    name: c.name,
    domain: c.domain,
    logo_url: c.logo_url,
    ad_count: c.active_ads,
  }));

  return { ok: true, stats, competitors: chips };
}
