import { formatAdCopyForMcp } from "@/lib/mcp/format-ad-copy";
import { mcpSuccess } from "@/lib/mcp/errors";
import { MCP_EMPTY_NO_ADS } from "@/lib/mcp/empty-states";
import {
  MCP_PAGE_MAX,
  paginateInMemory,
  parseMcpPage,
} from "@/lib/mcp/pagination";
import { requireCompetitor } from "@/lib/mcp/resolve-competitor";
import type { McpToolContext } from "@/lib/mcp/tool-context";
import { lifespanDays } from "@/lib/mcp/truncate";
import { mcpAdLinksForScrapedRow } from "@/lib/mcp/ad-links";
import { mcpDashboardUrl } from "@/lib/mcp/urls";
import {
  extractImpressionsIndex,
  qualifiesAsUltimateWinner,
  sortAdsByPerformanceSort,
  type AdPerformanceSort,
} from "@/lib/ad-library/ad-performance-ranking";

const MCP_ADS_SORT_FETCH_CAP = 2000;

export type GetCompetitorAdsInput = {
  competitor: string;
  platform?: string;
  limit?: number;
  offset?: number;
  sort?: AdPerformanceSort;
  include_full_copy?: boolean;
};

function normalizeMcpSort(sort: string | undefined): AdPerformanceSort {
  const v = (sort ?? "newest").trim().toLowerCase();
  if (
    v === "newest" ||
    v === "oldest" ||
    v === "longest_running" ||
    v === "longest" ||
    v === "impressions" ||
    v === "ultimate_winner"
  ) {
    return v === "longest" ? "longest_running" : (v as AdPerformanceSort);
  }
  return "newest";
}

export async function getCompetitorAds(ctx: McpToolContext, input: GetCompetitorAdsInput) {
  const { limit, offset } = parseMcpPage(input, { defaultLimit: 50, maxLimit: MCP_PAGE_MAX });
  const sort = normalizeMcpSort(input.sort);

  const comp = await requireCompetitor(ctx.supabase, ctx.auth.userId, input.competitor);

  let q = ctx.supabase
    .from("scraped_ads")
    .select(
      "id, platform, ad_text, first_seen_at, last_seen_at, ai_extracted_angle, format, is_active, raw_payload",
    )
    .eq("user_id", ctx.auth.userId)
    .eq("competitor_id", comp.id)
    .eq("is_active", true)
    .limit(MCP_ADS_SORT_FETCH_CAP);

  if (input.platform?.trim()) {
    q = q.ilike("platform", input.platform.trim());
  }

  const { data, error } = await q;
  if (error) throw error;

  const sorted = sortAdsByPerformanceSort(data ?? [], sort, {
    impressionsIndexFor: (row) => extractImpressionsIndex(row.raw_payload),
    daysRunningFor: (row) => lifespanDays(row.first_seen_at, row.last_seen_at),
    newestMsFor: (row) => new Date(row.first_seen_at).getTime(),
  });

  const { items: pageRows, pagination } = paginateInMemory(sorted, limit, offset);

  const rows = pageRows.map((a) => {
    const copy = formatAdCopyForMcp(a.ad_text ?? "", input.include_full_copy);
    const links = mcpAdLinksForScrapedRow(
      ctx.auth.appOrigin,
      comp.domain,
      a.platform,
      a.id,
      a.raw_payload,
    );
    const daysRunning = lifespanDays(a.first_seen_at, a.last_seen_at);
    const impressions_index = extractImpressionsIndex(a.raw_payload);
    return {
      id: a.id,
      platform: a.platform,
      format: a.format,
      ad_text: copy.ad_text,
      truncated: copy.truncated,
      first_seen_at: a.first_seen_at,
      last_seen_at: a.last_seen_at,
      days_running: daysRunning,
      impressions_index,
      is_ultimate_winner: qualifiesAsUltimateWinner(impressions_index, daysRunning),
      angle: a.ai_extracted_angle,
      spy_rival_url: links.spy_rival_url,
      platform_library_url: links.platform_library_url,
    };
  });

  return mcpSuccess({
    competitor: { id: comp.id, name: comp.name, domain: comp.domain },
    sort,
    ads: rows,
    pagination,
    ...(rows.length === 0 && sorted.length === 0 ? { message: MCP_EMPTY_NO_ADS } : {}),
    dashboard_url: mcpDashboardUrl(ctx.auth.appOrigin, comp.domain, "tab=ads"),
  });
}
