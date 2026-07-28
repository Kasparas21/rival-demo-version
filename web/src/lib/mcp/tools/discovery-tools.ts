import { McpToolError, mcpSuccess } from "@/lib/mcp/errors";
import { formatAdCopyForMcp } from "@/lib/mcp/format-ad-copy";
import { paginateInMemory, parseMcpPage, MCP_PAGE_MAX } from "@/lib/mcp/pagination";
import type { McpToolContext } from "@/lib/mcp/tool-context";
import {
  analyzeDiscoveryKeywords,
  getDiscoveryAdById,
  getDiscoveryCompetitorBreakdown,
  getDiscoveryPatternsSummary,
  queryDiscoveryAds,
  resolveDiscoveryBrandId,
} from "@/lib/discovery/discovery-query-service";
import type {
  DiscoveryDatePreset,
  DiscoveryFormatFilter,
  DiscoverySort,
  DiscoveryStatusFilter,
} from "@/lib/discovery/types";

type DiscoverySortInput = DiscoverySort;
type DiscoveryFormatInput = DiscoveryFormatFilter;
type DiscoveryStatusInput = DiscoveryStatusFilter;
type DiscoveryDateInput = DiscoveryDatePreset;

function discoveryDashboardUrl(appOrigin: string): string {
  return `${appOrigin.replace(/\/$/, "")}/dashboard/discovery`;
}

function normalizeSort(sort?: string): DiscoverySortInput {
  const v = (sort ?? "impressions").trim().toLowerCase();
  if (v === "shuffle" || v === "longest") {
    return v === "longest" ? "longest_running" : "shuffle";
  }
  if (
    v === "newest" ||
    v === "oldest" ||
    v === "longest_running" ||
    v === "impressions" ||
    v === "ultimate_winner"
  ) {
    return v as DiscoverySortInput;
  }
  return "impressions";
}

export async function mcpSearchDiscoveryAds(
  ctx: McpToolContext,
  input: {
    query: string;
    brand_id?: string;
    keywords?: string[];
    match?: "any" | "all";
    competitor?: string;
    competitors?: string[];
    format?: DiscoveryFormatInput;
    status?: DiscoveryStatusInput;
    ultimate_only?: boolean;
    date_preset?: DiscoveryDateInput;
    sort?: string;
    limit?: number;
    offset?: number;
    include_full_copy?: boolean;
  },
) {
  const needle = input.query.trim();
  const keywords = [...(input.keywords ?? []), ...(needle ? [needle] : [])];
  if (!keywords.length) {
    throw new McpToolError("invalid_input", "query or keywords is required");
  }

  const brandId = await resolveDiscoveryBrandId(ctx.supabase, ctx.auth.userId, input.brand_id);
  const competitorNames = [
    ...(input.competitor?.trim() ? [input.competitor.trim()] : []),
    ...(input.competitors ?? []).map((c) => c.trim()).filter(Boolean),
  ];

  const { limit, offset } = parseMcpPage(input, { defaultLimit: 50, maxLimit: MCP_PAGE_MAX });
  const result = await queryDiscoveryAds(
    ctx.supabase,
    ctx.auth.userId,
    {
      brandId,
      keywords,
      match: input.match ?? "any",
      competitorNames,
      format: input.format,
      status: input.status,
      ultimateOnly: input.ultimate_only,
      datePreset: input.date_preset,
      sort: normalizeSort(input.sort),
      limit,
      offset,
    },
    ctx.auth.appOrigin,
    { includeFullCopy: input.include_full_copy },
  );

  if ("error" in result) throw new McpToolError("invalid_input", result.error);

  return mcpSuccess({
    brand_id: brandId,
    query: needle,
    keywords,
    ads: result.ads,
    market_stats: result.market_stats,
    pagination: {
      total: result.total,
      offset: result.offset,
      limit: result.limit,
      has_more: result.has_more,
      next_offset: result.has_more ? result.offset + result.limit : null,
    },
    applied_filters: result.applied_filters,
    dashboard_url: discoveryDashboardUrl(ctx.auth.appOrigin),
  });
}

export async function mcpGetDiscoveryFeed(
  ctx: McpToolContext,
  input: {
    brand_id?: string;
    query?: string;
    competitor?: string;
    competitors?: string[];
    format?: DiscoveryFormatInput;
    status?: DiscoveryStatusInput;
    ultimate_only?: boolean;
    date_preset?: DiscoveryDateInput;
    sort?: string;
    limit?: number;
    offset?: number;
    include_full_copy?: boolean;
  },
) {
  const brandId = await resolveDiscoveryBrandId(ctx.supabase, ctx.auth.userId, input.brand_id);
  const competitorNames = [
    ...(input.competitor?.trim() ? [input.competitor.trim()] : []),
    ...(input.competitors ?? []).map((c) => c.trim()).filter(Boolean),
  ];
  const { limit, offset } = parseMcpPage(input, { defaultLimit: 50, maxLimit: MCP_PAGE_MAX });

  const result = await queryDiscoveryAds(
    ctx.supabase,
    ctx.auth.userId,
    {
      brandId,
      query: input.query,
      competitorNames,
      format: input.format,
      status: input.status,
      ultimateOnly: input.ultimate_only,
      datePreset: input.date_preset,
      sort: normalizeSort(input.sort),
      limit,
      offset,
    },
    ctx.auth.appOrigin,
    { includeFullCopy: input.include_full_copy },
  );

  if ("error" in result) throw new McpToolError("invalid_input", result.error);

  return mcpSuccess({
    brand_id: brandId,
    ads: result.ads,
    competitors: result.competitors,
    market_stats: result.market_stats,
    pagination: {
      total: result.total,
      offset: result.offset,
      limit: result.limit,
      has_more: result.has_more,
      next_offset: result.has_more ? result.offset + result.limit : null,
    },
    applied_filters: result.applied_filters,
    dashboard_url: discoveryDashboardUrl(ctx.auth.appOrigin),
  });
}

export async function mcpGetDiscoveryMarketStats(
  ctx: McpToolContext,
  input: { brand_id?: string; competitor?: string },
) {
  const brandId = await resolveDiscoveryBrandId(ctx.supabase, ctx.auth.userId, input.brand_id);
  const competitorNames = input.competitor?.trim() ? [input.competitor.trim()] : [];

  const result = await queryDiscoveryAds(
    ctx.supabase,
    ctx.auth.userId,
    {
      brandId,
      competitorNames,
      limit: 1,
      offset: 0,
      sort: "impressions",
    },
    ctx.auth.appOrigin,
  );

  if ("error" in result) throw new McpToolError("invalid_input", result.error);

  return mcpSuccess({
    brand_id: brandId,
    market_stats: result.market_stats,
    competitors_tracked: result.competitors.length,
    dashboard_url: discoveryDashboardUrl(ctx.auth.appOrigin),
  });
}

export async function mcpGetDiscoveryPatterns(
  ctx: McpToolContext,
  input: { brand_id?: string },
) {
  const brandId = await resolveDiscoveryBrandId(ctx.supabase, ctx.auth.userId, input.brand_id);
  const { latest, history } = await getDiscoveryPatternsSummary(ctx.supabase, ctx.auth.userId, brandId);

  return mcpSuccess({
    brand_id: brandId,
    latest,
    history_weeks: history.length,
    history,
    dashboard_url: discoveryDashboardUrl(ctx.auth.appOrigin),
  });
}

export async function mcpAnalyzeDiscoveryKeywords(
  ctx: McpToolContext,
  input: {
    brand_id?: string;
    seed_terms?: string[];
    min_ad_count?: number;
    limit?: number;
    status?: DiscoveryStatusInput;
    ultimate_only?: boolean;
  },
) {
  const brandId = await resolveDiscoveryBrandId(ctx.supabase, ctx.auth.userId, input.brand_id);
  const result = await analyzeDiscoveryKeywords(ctx.supabase, ctx.auth.userId, brandId, ctx.auth.appOrigin, {
    seedTerms: input.seed_terms,
    minAdCount: input.min_ad_count,
    limit: input.limit,
    status: input.status,
    ultimateOnly: input.ultimate_only,
  });

  if ("error" in result) throw new McpToolError("invalid_input", result.error);

  return mcpSuccess({
    brand_id: brandId,
    terms: result.terms,
    market_stats: result.market_stats,
    dashboard_url: discoveryDashboardUrl(ctx.auth.appOrigin),
  });
}

export async function mcpGetDiscoveryCompetitors(
  ctx: McpToolContext,
  input: { brand_id?: string; limit?: number; offset?: number },
) {
  const brandId = await resolveDiscoveryBrandId(ctx.supabase, ctx.auth.userId, input.brand_id);
  const result = await getDiscoveryCompetitorBreakdown(ctx.supabase, ctx.auth.userId, brandId, ctx.auth.appOrigin);
  if ("error" in result) throw new McpToolError("invalid_input", result.error);

  const { limit, offset } = parseMcpPage(input, { defaultLimit: 50, maxLimit: 200 });
  const { items, pagination } = paginateInMemory(result.competitors, limit, offset);

  return mcpSuccess({
    brand_id: brandId,
    competitors: items,
    market_stats: result.market_stats,
    pagination,
    dashboard_url: discoveryDashboardUrl(ctx.auth.appOrigin),
  });
}

export async function mcpGetDiscoveryAd(
  ctx: McpToolContext,
  input: { ad_id: string; brand_id?: string; include_full_copy?: boolean },
) {
  const adId = input.ad_id.trim();
  if (!adId) throw new McpToolError("invalid_input", "ad_id is required");

  const brandId = await resolveDiscoveryBrandId(ctx.supabase, ctx.auth.userId, input.brand_id);
  const ad = await getDiscoveryAdById(
    ctx.supabase,
    ctx.auth.userId,
    adId,
    brandId,
    ctx.auth.appOrigin,
    input.include_full_copy ?? true,
  );

  if (!ad) {
    throw new McpToolError("not_found", `Ad ${adId} not found in this workspace's discovery scope.`);
  }

  const copy = formatAdCopyForMcp(ad.ad_text, input.include_full_copy ?? true);
  return mcpSuccess({
    brand_id: brandId,
    ad: { ...ad, ad_text: copy.ad_text, truncated: copy.truncated },
    dashboard_url: ad.spy_rival_url,
  });
}
