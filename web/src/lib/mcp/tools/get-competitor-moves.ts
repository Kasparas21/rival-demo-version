import { McpToolError, mcpSuccess } from "@/lib/mcp/errors";
import { MCP_EMPTY_NO_MOVES } from "@/lib/mcp/empty-states";
import { buildMcpPagination, parseMcpPage } from "@/lib/mcp/pagination";
import { requireCompetitor } from "@/lib/mcp/resolve-competitor";
import type { McpToolContext } from "@/lib/mcp/tool-context";
import { mcpDashboardUrl } from "@/lib/mcp/urls";
import type { ComparisonMoveRow } from "@/lib/comparison/comparison-move-types";

export async function getCompetitorMoves(
  ctx: McpToolContext,
  input: {
    competitor: string;
    limit?: number;
    offset?: number;
    since_days?: number;
  },
) {
  const comp = await requireCompetitor(ctx.supabase, ctx.auth.userId, input.competitor);
  const { limit, offset } = parseMcpPage(input, { defaultLimit: 40, maxLimit: 200 });
  const sinceDays = input.since_days ? Math.min(90, Math.max(1, input.since_days)) : null;
  const sinceIso = sinceDays
    ? new Date(Date.now() - sinceDays * 86_400_000).toISOString()
    : null;

  let q = ctx.supabase
    .from("competitor_moves")
    .select(
      "id, event_type, significance, detected_at, platform, before_state, after_state, narrative",
      { count: "exact" },
    )
    .eq("user_id", ctx.auth.userId)
    .eq("competitor_id", comp.id)
    .order("detected_at", { ascending: false });

  if (sinceIso) q = q.gte("detected_at", sinceIso);

  const { data, error, count } = await q.range(offset, offset + limit - 1);
  if (error) throw error;

  const moves = (data ?? []) as ComparisonMoveRow[];

  return mcpSuccess({
    competitor: { id: comp.id, name: comp.name, domain: comp.domain },
    since_days: sinceDays,
    moves: moves.map((m) => ({
      id: m.id,
      event_type: m.event_type,
      significance: m.significance,
      detected_at: m.detected_at,
      platform: m.platform,
      narrative: m.narrative,
      before_state: m.before_state,
      after_state: m.after_state,
    })),
    pagination: buildMcpPagination(count ?? 0, limit, offset),
    ...(moves.length === 0 ? { message: MCP_EMPTY_NO_MOVES } : {}),
    dashboard_url: mcpDashboardUrl(ctx.auth.appOrigin, comp.domain, "tab=activity"),
  });
}
