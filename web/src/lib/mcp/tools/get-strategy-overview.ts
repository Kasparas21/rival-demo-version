import { McpToolError, mcpSuccess } from "@/lib/mcp/errors";
import { requireCompetitor } from "@/lib/mcp/resolve-competitor";
import { summarizeStrategyForMcp } from "@/lib/mcp/summarize-strategy-for-mcp";
import type { McpToolContext } from "@/lib/mcp/tool-context";
import { mcpDashboardUrl } from "@/lib/mcp/urls";
import { getCachedStrategyOverview } from "@/lib/strategy-overview/recompute-strategy-overview";

export async function getStrategyOverview(ctx: McpToolContext, input: { competitor: string }) {
  const comp = await requireCompetitor(ctx.supabase, ctx.auth.userId, input.competitor);

  const cached = await getCachedStrategyOverview(
    ctx.supabase,
    ctx.auth.userId,
    comp.id,
    comp.domain ?? undefined,
  );

  if (!cached) {
    throw new McpToolError(
      "no_cache",
      "No cached strategy overview for this competitor yet — open the dashboard to generate one.",
      mcpDashboardUrl(ctx.auth.appOrigin, comp.domain, "tab=strategy"),
    );
  }

  return mcpSuccess({
    competitor: { id: comp.id, name: comp.name, domain: comp.domain },
    overview: summarizeStrategyForMcp(cached),
    dashboard_url: mcpDashboardUrl(ctx.auth.appOrigin, comp.domain, "tab=strategy"),
  });
}
