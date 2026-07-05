import { formatAdCopyForMcp } from "@/lib/mcp/format-ad-copy";
import { assertCopyVaultAccess } from "@/lib/mcp/plan-gates";
import { McpToolError, mcpSuccess } from "@/lib/mcp/errors";
import {
  MCP_EMPTY_NO_COMPETITORS,
  MCP_EMPTY_NO_WINNERS,
} from "@/lib/mcp/empty-states";
import { paginateInMemory, parseMcpPage, MCP_PAGE_MAX_VAULT } from "@/lib/mcp/pagination";
import { resolveCompetitor } from "@/lib/mcp/resolve-competitor";
import type { McpToolContext } from "@/lib/mcp/tool-context";
import { lifespanDays } from "@/lib/mcp/truncate";
import { mcpDashboardUrl } from "@/lib/mcp/urls";

export async function getProvenWinners(
  ctx: McpToolContext,
  input: {
    competitor?: string;
    platform?: string;
    limit?: number;
    offset?: number;
    include_full_copy?: boolean;
  },
) {
  assertCopyVaultAccess(ctx.billing);

  const { limit, offset } = parseMcpPage(input, {
    defaultLimit: 50,
    maxLimit: MCP_PAGE_MAX_VAULT,
  });

  let competitorIds: string[] | null = null;
  if (input.competitor?.trim()) {
    const comp = await resolveCompetitor(ctx.supabase, ctx.auth.userId, input.competitor);
    if (!comp) {
      throw new McpToolError("not_tracked", `competitor "${input.competitor.trim()}" is not tracked.`);
    }
    competitorIds = [comp.id];
  } else {
    const { data } = await ctx.supabase
      .from("saved_competitors")
      .select("id")
      .eq("user_id", ctx.auth.userId)
      .eq("is_workspace_brand", false);
    competitorIds = (data ?? []).map((r) => r.id);
  }

  if (!competitorIds.length) {
    return mcpSuccess({
      winners: [],
      message: MCP_EMPTY_NO_COMPETITORS,
      dashboard_url: mcpDashboardUrl(ctx.auth.appOrigin, null),
    });
  }

  let q = ctx.supabase
    .from("scraped_ads")
    .select(
      "id, competitor_id, platform, ad_text, first_seen_at, last_seen_at, ai_extracted_angle, format",
    )
    .eq("user_id", ctx.auth.userId)
    .in("competitor_id", competitorIds)
    .eq("is_active", true);

  if (input.platform?.trim()) q = q.ilike("platform", input.platform.trim());

  const { data, error } = await q.limit(5000);
  if (error) throw error;

  const nameById = new Map<string, string>();
  const { data: comps } = await ctx.supabase
    .from("saved_competitors")
    .select("id, name, brand_name")
    .eq("user_id", ctx.auth.userId)
    .in("id", competitorIds);
  for (const c of comps ?? []) {
    nameById.set(c.id, c.brand_name?.trim() || c.name?.trim() || "Competitor");
  }

  const allWinners = (data ?? [])
    .map((a) => {
      const days = lifespanDays(a.first_seen_at, a.last_seen_at);
      const copy = formatAdCopyForMcp(a.ad_text ?? "", input.include_full_copy);
      return {
        id: a.id,
        competitor_id: a.competitor_id,
        competitor_name: nameById.get(a.competitor_id) ?? "Competitor",
        platform: a.platform,
        format: a.format,
        ad_text: copy.ad_text,
        truncated: copy.truncated,
        angle: a.ai_extracted_angle,
        days_running: days,
        first_seen_at: a.first_seen_at,
        last_seen_at: a.last_seen_at,
      };
    })
    .filter((a) => a.days_running >= 30)
    .sort((a, b) => b.days_running - a.days_running);

  const { items: winners, pagination } = paginateInMemory(allWinners, limit, offset);

  return mcpSuccess({
    winners,
    min_days_running: 30,
    pagination,
    ...(winners.length === 0 && allWinners.length === 0 ? { message: MCP_EMPTY_NO_WINNERS } : {}),
    dashboard_url: mcpDashboardUrl(ctx.auth.appOrigin, null, "tab=insights&sub=alerts"),
  });
}
