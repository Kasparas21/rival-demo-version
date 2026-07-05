import { McpToolError, mcpSuccess } from "@/lib/mcp/errors";
import { MCP_EMPTY_NO_JOURNEY_GOAL } from "@/lib/mcp/empty-states";
import { requireCompetitor } from "@/lib/mcp/resolve-competitor";
import {
  summarizeChannelSignalsForMcp,
  summarizeJourneyGoalForMcp,
} from "@/lib/mcp/summarize-journey-goal-for-mcp";
import type { McpToolContext } from "@/lib/mcp/tool-context";
import { mcpDashboardUrl } from "@/lib/mcp/urls";
import { buildStrategyRuntimeLayers } from "@/lib/strategy-overview/build-runtime-layers";
import { normalizeCompetitorStrategyOverviewPayload } from "@/lib/strategy-overview/normalize-strategy-payload";
import { getCachedStrategyOverview } from "@/lib/strategy-overview/recompute-strategy-overview";

export async function getJourneyGoal(ctx: McpToolContext, input: { competitor: string }) {
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
      "No cached strategy overview for this competitor yet — open the strategy tab in the dashboard to generate one.",
      mcpDashboardUrl(ctx.auth.appOrigin, comp.domain, "tab=strategy"),
    );
  }

  const payload = normalizeCompetitorStrategyOverviewPayload(cached);
  const brandDomain = payload.map.competitor?.domain ?? comp.domain ?? null;
  const { channelSignals, journeyGoal } = await buildStrategyRuntimeLayers(
    ctx.supabase,
    ctx.auth.userId,
    comp.id,
    payload.map,
    brandDomain,
  );

  if (!journeyGoal) {
    throw new McpToolError(
      "no_data",
      "Journey goal could not be inferred — need more bottom-funnel ads or landing page data.",
      mcpDashboardUrl(ctx.auth.appOrigin, comp.domain, "tab=strategy"),
    );
  }

  return mcpSuccess({
    competitor: { id: comp.id, name: comp.name, domain: comp.domain },
    journey_goal: summarizeJourneyGoalForMcp(journeyGoal),
    channel_signals: summarizeChannelSignalsForMcp(channelSignals),
    map_title: payload.map.title ?? null,
    ...(journeyGoal.confidence < 0.4 ? { low_confidence_note: MCP_EMPTY_NO_JOURNEY_GOAL } : {}),
    dashboard_url: mcpDashboardUrl(ctx.auth.appOrigin, comp.domain, "tab=strategy"),
  });
}
