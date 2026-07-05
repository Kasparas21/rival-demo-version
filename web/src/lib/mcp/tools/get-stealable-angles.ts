import { filterBrandAwarenessStealableRows } from "@/lib/comparison/stealable-angle-present";
import { McpToolError, mcpSuccess } from "@/lib/mcp/errors";
import {
  MCP_EMPTY_NO_ANGLES,
  MCP_EMPTY_NO_COMPETITORS,
} from "@/lib/mcp/empty-states";
import { paginateInMemory, parseMcpPage } from "@/lib/mcp/pagination";
import { resolveCompetitor } from "@/lib/mcp/resolve-competitor";
import type { McpToolContext } from "@/lib/mcp/tool-context";
import { mcpDashboardUrl } from "@/lib/mcp/urls";
import { getCachedStrategyOverview } from "@/lib/strategy-overview/recompute-strategy-overview";

export async function getStealableAngles(
  ctx: McpToolContext,
  input: { competitor?: string; limit?: number; offset?: number },
) {
  const { limit, offset } = parseMcpPage(input, { defaultLimit: 30, maxLimit: 200 });
  const allAngles: Array<{
    competitor_id: string;
    competitor_name: string;
    platform: string;
    angle: string;
    ad_count?: number;
  }> = [];

  let competitors: Array<{ id: string; name: string; domain: string | null }> = [];

  if (input.competitor?.trim()) {
    const one = await resolveCompetitor(ctx.supabase, ctx.auth.userId, input.competitor);
    if (!one) {
      throw new McpToolError("not_tracked", `competitor "${input.competitor.trim()}" is not tracked.`);
    }
    competitors = [one];
  } else {
    const { data } = await ctx.supabase
      .from("saved_competitors")
      .select("id, name, brand_name, brand_domain")
      .eq("user_id", ctx.auth.userId)
      .eq("is_workspace_brand", false);
    competitors = (data ?? []).map((r) => ({
      id: r.id,
      name: r.brand_name?.trim() || r.name?.trim() || "Competitor",
      domain: r.brand_domain?.trim() || null,
    }));
  }

  if (competitors.length === 0) {
    return mcpSuccess({
      angles: [],
      message: MCP_EMPTY_NO_COMPETITORS,
      dashboard_url: mcpDashboardUrl(ctx.auth.appOrigin, null, "tab=comparison"),
    });
  }

  for (const comp of competitors) {
    const cached = await getCachedStrategyOverview(
      ctx.supabase,
      ctx.auth.userId,
      comp.id,
      comp.domain ?? undefined,
    );
    const rows = cached?.insights?.angles_by_platform ?? [];
    const filtered = filterBrandAwarenessStealableRows(rows, comp.name, comp.domain);
    for (const row of filtered) {
      allAngles.push({
        competitor_id: comp.id,
        competitor_name: comp.name,
        platform: row.platforms[0] ?? "unknown",
        angle: row.angle,
        ad_count: row.totalCount,
      });
    }
  }

  const { items: angles, pagination } = paginateInMemory(allAngles, limit, offset);

  return mcpSuccess({
    angles,
    pagination,
    ...(angles.length === 0 && allAngles.length === 0 ? { message: MCP_EMPTY_NO_ANGLES } : {}),
    dashboard_url: mcpDashboardUrl(ctx.auth.appOrigin, competitors[0]?.domain ?? null, "tab=comparison"),
  });
}
