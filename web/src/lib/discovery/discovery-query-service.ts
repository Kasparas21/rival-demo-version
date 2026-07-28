import type { SupabaseClient } from "@supabase/supabase-js";

import { formatAdCopyForMcp } from "@/lib/mcp/format-ad-copy";
import { mcpAdLinksForScrapedRow } from "@/lib/mcp/ad-links";
import { resolveCompetitor } from "@/lib/mcp/resolve-competitor";
import { buildDiscoveryFeed, searchDiscoveryKeywordFeed } from "@/lib/discovery/build-discovery-feed";
import { loadPatternReportHistory } from "@/lib/discovery/generate-pattern-report";
import type {
  DiscoveryAdDto,
  DiscoveryCompetitorChip,
  DiscoveryDatePreset,
  DiscoveryFeedQuery,
  DiscoveryFeedResult,
  DiscoveryFormatFilter,
  DiscoveryMarketStats,
  DiscoverySort,
  DiscoveryStatusFilter,
} from "@/lib/discovery/types";
import type { Database } from "@/lib/supabase/types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Return entire hydrated feed slices from buildDiscoveryFeed (no artificial row cap). */
const DISCOVERY_FULL_FETCH_LIMIT = 50_000_000;

export type DiscoveryQueryFilters = {
  brandId: string;
  clientBrandIds?: string[];
  query?: string;
  keywords?: string[];
  match?: "any" | "all";
  sort?: DiscoverySort;
  format?: DiscoveryFormatFilter;
  status?: DiscoveryStatusFilter;
  ultimateOnly?: boolean;
  datePreset?: DiscoveryDatePreset;
  competitorIds?: string[];
  competitorNames?: string[];
  limit?: number;
  offset?: number;
  shuffleSeed?: string;
};

export type DiscoveryAdSummary = {
  id: string;
  competitor_id: string;
  competitor_name: string;
  competitor_domain: string | null;
  client_brand_name: string | null;
  platform: string;
  format: string;
  ad_text: string;
  truncated: boolean;
  first_seen_at: string;
  last_seen_at: string;
  is_killed: boolean;
  impressions_index: number | null;
  is_ultimate_winner: boolean;
  angle: string | null;
  spy_rival_url: string;
  platform_library_url: string | null;
};

export type DiscoveryQueryResult = {
  ads: DiscoveryAdSummary[];
  total: number;
  offset: number;
  limit: number;
  has_more: boolean;
  competitors: DiscoveryCompetitorChip[];
  market_stats: DiscoveryMarketStats;
  applied_filters: Record<string, unknown>;
};

export async function resolveDiscoveryBrandId(
  supabase: SupabaseClient<Database>,
  userId: string,
  brandId?: string,
): Promise<string> {
  const trimmed = brandId?.trim();
  if (trimmed && trimmed !== "default") return trimmed;

  const { data } = await supabase
    .from("brands")
    .select("id")
    .eq("user_id", userId)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return data?.id ?? "default";
}

async function resolveCompetitorIdsByNames(
  supabase: SupabaseClient<Database>,
  userId: string,
  names: string[],
): Promise<string[]> {
  const ids: string[] = [];
  for (const name of names) {
    const comp = await resolveCompetitor(supabase, userId, name);
    if (comp) ids.push(comp.id);
  }
  return [...new Set(ids)];
}

const QUERY_STOP_WORDS = new Set([
  "find",
  "me",
  "all",
  "ads",
  "ad",
  "show",
  "get",
  "the",
  "and",
  "with",
  "for",
  "from",
  "that",
  "this",
  "about",
  "su",
  "ir",
  "visus",
  "man",
  "rask",
  "surask",
  "mano",
  "apie",
  "kur",
  "kas",
  "duok",
  "reklamas",
  "reklama",
  "reklamos",
  "give",
  "please",
  "dantu",
]);

function tokenizeSearchTerms(text: string): string[] {
  return text
    .split(/[,;|]+|\s+/)
    .map((k) => k.trim().toLowerCase())
    .filter((k) => k.length >= 3 && !QUERY_STOP_WORDS.has(k));
}

function normalizeKeywords(keywords: string[] | undefined, query?: string): string[] {
  const fromList = (keywords ?? []).flatMap((k) => tokenizeSearchTerms(k));
  const fromQuery = tokenizeSearchTerms(query ?? "");
  const merged = [...new Set([...fromList, ...fromQuery])];
  if (!merged.length) {
    const fallback = (query ?? "").trim().toLowerCase();
    if (fallback.length >= 3) return [fallback];
  }
  return merged;
}

export function extractDiscoverySearchKeywords(text: string): string[] {
  return normalizeKeywords(undefined, text);
}

function summarizeAd(
  ad: DiscoveryAdDto,
  appOrigin: string,
  includeFullCopy: boolean,
): DiscoveryAdSummary {
  const copy = formatAdCopyForMcp(ad.ad_text, includeFullCopy);
  const links = mcpAdLinksForScrapedRow(
    appOrigin,
    ad.competitor_domain,
    ad.platform,
    ad.id,
    ad.raw_payload,
  );
  return {
    id: ad.id,
    competitor_id: ad.competitor_id,
    competitor_name: ad.competitor_name,
    competitor_domain: ad.competitor_domain,
    client_brand_name: ad.client_brand_name ?? null,
    platform: ad.platform,
    format: ad.format,
    ad_text: copy.ad_text,
    truncated: copy.truncated,
    first_seen_at: ad.first_seen_at,
    last_seen_at: ad.last_seen_at,
    is_killed: ad.is_killed,
    impressions_index: ad.impressions_index,
    is_ultimate_winner: ad.is_ultimate_winner,
    angle: null,
    spy_rival_url: links.spy_rival_url,
    platform_library_url: links.platform_library_url,
  };
}

function buildFeedQuery(
  brandId: string,
  filters: DiscoveryQueryFilters,
  competitorFilterIds: string[],
): DiscoveryFeedQuery {
  return {
    brandId,
    clientBrandIds: filters.clientBrandIds ?? [brandId],
    offset: filters.offset ?? 0,
    limit: Math.min(Math.max(filters.limit ?? 48, 1), 200),
    sort: filters.sort ?? "impressions",
    shuffleSeed: filters.shuffleSeed ?? `discovery-query:${brandId}`,
    platforms: [],
    format: filters.format ?? "all",
    status: filters.status ?? "all",
    ultimateOnly: filters.ultimateOnly ?? false,
    query: filters.query?.trim() ?? "",
    competitorFilterIds,
    datePreset: filters.datePreset ?? "all",
  };
}

export async function queryDiscoveryAds(
  supabase: SupabaseClient<Database>,
  userId: string,
  filters: DiscoveryQueryFilters,
  appOrigin: string,
  opts?: { includeFullCopy?: boolean; fetchLimit?: number },
): Promise<DiscoveryQueryResult | { error: string }> {
  const brandId = await resolveDiscoveryBrandId(supabase, userId, filters.brandId);
  const keywords = normalizeKeywords(filters.keywords, filters.query);
  const match = filters.match ?? (keywords.length >= 3 ? "all" : "any");
  const needsFullScan = keywords.length > 0;

  let competitorFilterIds = [...(filters.competitorIds ?? [])];
  if (filters.competitorNames?.length) {
    const resolved = await resolveCompetitorIdsByNames(supabase, userId, filters.competitorNames);
    competitorFilterIds = [...new Set([...competitorFilterIds, ...resolved])];
  }

  const pageLimit = Math.min(Math.max(filters.limit ?? 48, 1), 200);
  const pageOffset = filters.offset ?? 0;
  const feedInput = buildFeedQuery(brandId, filters, competitorFilterIds);

  if (needsFullScan) {
    const result = await searchDiscoveryKeywordFeed(
      supabase,
      userId,
      { ...feedInput, offset: pageOffset, limit: pageLimit },
      keywords,
      match,
      opts?.fetchLimit ?? 2000,
    );
    if (!("ads" in result)) return result;

    return {
      ads: result.ads.map((ad) => summarizeAd(ad, appOrigin, opts?.includeFullCopy ?? false)),
      total: result.total,
      offset: pageOffset,
      limit: pageLimit,
      has_more: result.has_more,
      competitors: result.competitors,
      market_stats: result.market_stats,
      applied_filters: {
        brand_id: brandId,
        keywords,
        match,
        sort: feedInput.sort,
        format: feedInput.format,
        status: feedInput.status,
        ultimate_only: feedInput.ultimateOnly,
        date_preset: feedInput.datePreset,
        competitor_filter_ids: competitorFilterIds,
        search_mode: "keyword_db",
      },
    };
  }

  const result = await buildDiscoveryFeed(supabase, userId, {
    ...feedInput,
    offset: pageOffset,
    limit: pageLimit,
  });
  if (!("ads" in result)) return result;

  return {
    ads: result.ads.map((ad) => summarizeAd(ad, appOrigin, opts?.includeFullCopy ?? false)),
    total: result.total,
    offset: pageOffset,
    limit: pageLimit,
    has_more: result.has_more,
    competitors: result.competitors,
    market_stats: result.market_stats,
    applied_filters: {
      brand_id: brandId,
      keywords,
      match,
      sort: feedInput.sort,
      format: feedInput.format,
      status: feedInput.status,
      ultimate_only: feedInput.ultimateOnly,
      date_preset: feedInput.datePreset,
      competitor_filter_ids: competitorFilterIds,
    },
  };
}

export async function getDiscoveryAdById(
  supabase: SupabaseClient<Database>,
  userId: string,
  adId: string,
  brandId: string,
  appOrigin: string,
  includeFullCopy = true,
): Promise<DiscoveryAdSummary | null> {
  const feedResult = await buildDiscoveryFeed(
    supabase,
    userId,
    buildFeedQuery(brandId, { brandId, limit: DISCOVERY_FULL_FETCH_LIMIT, offset: 0 }, []),
  );
  if (!("ads" in feedResult)) return null;
  const dto = feedResult.ads.find((a) => a.id === adId);
  if (!dto) return null;
  return summarizeAd(dto, appOrigin, includeFullCopy);
}

export type KeywordAnalysisRow = {
  term: string;
  ad_count: number;
  competitor_count: number;
  sample_ad_ids: string[];
  ultimate_winner_count: number;
  video_count: number;
};

export async function analyzeDiscoveryKeywords(
  supabase: SupabaseClient<Database>,
  userId: string,
  brandId: string,
  appOrigin: string,
  opts?: {
    seedTerms?: string[];
    minAdCount?: number;
    limit?: number;
    status?: DiscoveryStatusFilter;
    ultimateOnly?: boolean;
  },
): Promise<{ terms: KeywordAnalysisRow[]; market_stats: DiscoveryMarketStats } | { error: string }> {
  const feedResult = await buildDiscoveryFeed(
    supabase,
    userId,
    buildFeedQuery(
      brandId,
      {
        brandId,
        status: opts?.status ?? "all",
        ultimateOnly: opts?.ultimateOnly ?? false,
        limit: DISCOVERY_FULL_FETCH_LIMIT,
        offset: 0,
        sort: "impressions",
      },
      [],
    ),
  );
  if (!("ads" in feedResult)) return feedResult;

  const stopWords = new Set([
    "the", "and", "for", "with", "your", "you", "our", "are", "from", "this", "that", "have", "get",
    "now", "all", "new", "free", "more", "book", "call", "today", "www", "com",
  ]);

  const termMap = new Map<
    string,
    { adIds: Set<string>; competitors: Set<string>; winners: number; videos: number }
  >();

  const seedTerms = (opts?.seedTerms ?? []).map((t) => t.trim().toLowerCase()).filter(Boolean);

  for (const ad of feedResult.ads) {
    const text = ad.ad_text.toLowerCase();
    const tokens = [
      ...text.split(/[^a-z0-9ąčęėįšųūž]+/i).filter((t) => t.length >= 3 && !stopWords.has(t)),
      ...seedTerms.filter((t) => text.includes(t)),
    ];
    const unique = new Set(tokens);
    for (const term of unique) {
      const row = termMap.get(term) ?? {
        adIds: new Set<string>(),
        competitors: new Set<string>(),
        winners: 0,
        videos: 0,
      };
      row.adIds.add(ad.id);
      row.competitors.add(ad.competitor_id);
      if (ad.is_ultimate_winner) row.winners += 1;
      if (ad.format.toLowerCase().includes("video")) row.videos += 1;
      termMap.set(term, row);
    }
  }

  const minCount = opts?.minAdCount ?? 2;
  const terms = [...termMap.entries()]
    .map(([term, stats]) => ({
      term,
      ad_count: stats.adIds.size,
      competitor_count: stats.competitors.size,
      sample_ad_ids: [...stats.adIds].slice(0, 5),
      ultimate_winner_count: stats.winners,
      video_count: stats.videos,
    }))
    .filter((r) => r.ad_count >= minCount)
    .sort((a, b) => b.ad_count - a.ad_count || b.ultimate_winner_count - a.ultimate_winner_count)
    .slice(0, opts?.limit ?? 40);

  return { terms, market_stats: feedResult.market_stats };
}

export async function getDiscoveryCompetitorBreakdown(
  supabase: SupabaseClient<Database>,
  userId: string,
  brandId: string,
  appOrigin: string,
): Promise<
  | {
      competitors: Array<{
        id: string;
        name: string;
        domain: string | null;
        ad_count: number;
        active_count: number;
        ultimate_winners: number;
        video_count: number;
        newest_launch: string | null;
      }>;
      market_stats: DiscoveryMarketStats;
    }
  | { error: string }
> {
  const feedResult = await buildDiscoveryFeed(
    supabase,
    userId,
    buildFeedQuery(brandId, { brandId, limit: DISCOVERY_FULL_FETCH_LIMIT, offset: 0, sort: "newest" }, []),
  );
  if (!("ads" in feedResult)) return feedResult;

  const byComp = new Map<
    string,
    {
      name: string;
      domain: string | null;
      total: number;
      active: number;
      winners: number;
      videos: number;
      newest: string | null;
    }
  >();

  for (const ad of feedResult.ads) {
    const row = byComp.get(ad.competitor_id) ?? {
      name: ad.competitor_name,
      domain: ad.competitor_domain,
      total: 0,
      active: 0,
      winners: 0,
      videos: 0,
      newest: null,
    };
    row.total += 1;
    if (!ad.is_killed) row.active += 1;
    if (ad.is_ultimate_winner) row.winners += 1;
    if (ad.format.toLowerCase().includes("video")) row.videos += 1;
    if (!row.newest || ad.first_seen_at > row.newest) row.newest = ad.first_seen_at;
    byComp.set(ad.competitor_id, row);
  }

  const competitors = [...byComp.entries()]
    .map(([id, c]) => ({
      id,
      name: c.name,
      domain: c.domain,
      ad_count: c.total,
      active_count: c.active,
      ultimate_winners: c.winners,
      video_count: c.videos,
      newest_launch: c.newest,
    }))
    .sort((a, b) => b.ad_count - a.ad_count || a.name.localeCompare(b.name));

  return { competitors, market_stats: feedResult.market_stats };
}

export async function getDiscoveryPatternsSummary(
  supabase: SupabaseClient<Database>,
  userId: string,
  brandId: string,
) {
  const resolvedBrandId = await resolveDiscoveryBrandId(supabase, userId, brandId);
  return loadPatternReportHistory(supabase, userId, resolvedBrandId, 12);
}

export function discoveryFeedToQueryResult(
  result: DiscoveryFeedResult,
  appOrigin: string,
  includeFullCopy: boolean,
  appliedFilters: Record<string, unknown>,
): DiscoveryQueryResult {
  return {
    ads: result.ads.map((ad) => summarizeAd(ad, appOrigin, includeFullCopy)),
    total: result.total,
    offset: result.offset,
    limit: result.limit,
    has_more: result.has_more,
    competitors: result.competitors,
    market_stats: result.market_stats,
    applied_filters: appliedFilters,
  };
}

export function isValidBrandId(brandId: string): boolean {
  return UUID_RE.test(brandId.trim()) || brandId === "default";
}
