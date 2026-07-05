import { formatAdCopyForMcp } from "@/lib/mcp/format-ad-copy";
import { mcpSuccess } from "@/lib/mcp/errors";
import { MCP_EMPTY_NO_ADS } from "@/lib/mcp/empty-states";
import { buildMcpPagination, MCP_PAGE_MAX, parseMcpPage } from "@/lib/mcp/pagination";
import { requireCompetitor } from "@/lib/mcp/resolve-competitor";
import type { McpToolContext } from "@/lib/mcp/tool-context";
import { lifespanDays } from "@/lib/mcp/truncate";
import { mcpDashboardUrl } from "@/lib/mcp/urls";

export type GetCompetitorAdsInput = {
  competitor: string;
  platform?: string;
  limit?: number;
  offset?: number;
  sort?: "newest" | "longest_running";
  include_full_copy?: boolean;
};

export async function getCompetitorAds(ctx: McpToolContext, input: GetCompetitorAdsInput) {
  const { limit, offset } = parseMcpPage(input, { defaultLimit: 50, maxLimit: MCP_PAGE_MAX });
  const sort = input.sort === "newest" ? "newest" : "longest_running";

  const comp = await requireCompetitor(ctx.supabase, ctx.auth.userId, input.competitor);

  let q = ctx.supabase
    .from("scraped_ads")
    .select(
      "id, platform, ad_text, first_seen_at, last_seen_at, ai_extracted_angle, format, is_active",
      { count: "exact" },
    )
    .eq("user_id", ctx.auth.userId)
    .eq("competitor_id", comp.id)
    .eq("is_active", true);

  if (input.platform?.trim()) {
    q = q.ilike("platform", input.platform.trim());
  }

  const ascending = sort === "longest_running";
  const { data, error, count } = await q
    .order("first_seen_at", { ascending })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  const total = count ?? 0;
  const rows = (data ?? []).map((a) => {
    const copy = formatAdCopyForMcp(a.ad_text ?? "", input.include_full_copy);
    return {
      id: a.id,
      platform: a.platform,
      format: a.format,
      ad_text: copy.ad_text,
      truncated: copy.truncated,
      first_seen_at: a.first_seen_at,
      last_seen_at: a.last_seen_at,
      days_running: lifespanDays(a.first_seen_at, a.last_seen_at),
      angle: a.ai_extracted_angle,
    };
  });

  return mcpSuccess({
    competitor: { id: comp.id, name: comp.name, domain: comp.domain },
    sort,
    ads: rows,
    pagination: buildMcpPagination(total, limit, offset),
    ...(rows.length === 0 ? { message: MCP_EMPTY_NO_ADS } : {}),
    dashboard_url: mcpDashboardUrl(ctx.auth.appOrigin, comp.domain, "tab=ads"),
  });
}
