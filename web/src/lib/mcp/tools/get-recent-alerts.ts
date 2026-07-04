import { McpToolError, mcpSuccess } from "@/lib/mcp/errors";
import { MCP_EMPTY_NO_ALERTS } from "@/lib/mcp/empty-states";
import { resolveCompetitor } from "@/lib/mcp/resolve-competitor";
import type { McpToolContext } from "@/lib/mcp/tool-context";
import { truncateAdCopy } from "@/lib/mcp/truncate";
import { mcpDashboardUrl } from "@/lib/mcp/urls";

export async function getRecentAlerts(
  ctx: McpToolContext,
  input: { limit?: number; since_days?: number; competitor?: string },
) {
  const limit = Math.min(50, Math.max(1, input.limit ?? 20));
  const sinceDays = Math.min(90, Math.max(1, input.since_days ?? 14));
  const sinceIso = new Date(Date.now() - sinceDays * 86_400_000).toISOString();

  let competitorId: string | undefined;
  let dashboardDomain: string | null = null;

  if (input.competitor?.trim()) {
    const comp = await resolveCompetitor(ctx.supabase, ctx.auth.userId, input.competitor);
    if (!comp) {
      throw new McpToolError("not_tracked", `competitor "${input.competitor.trim()}" is not tracked.`);
    }
    competitorId = comp.id;
    dashboardDomain = comp.domain;
  }

  let q = ctx.supabase
    .from("competitor_alerts")
    .select("id, competitor_id, alert_type, severity, title, body, detected_at, metadata")
    .eq("user_id", ctx.auth.userId)
    .gte("detected_at", sinceIso)
    .order("detected_at", { ascending: false })
    .limit(limit);

  if (competitorId) q = q.eq("competitor_id", competitorId);

  const { data, error } = await q;
  if (error) throw error;

  const ids = [...new Set((data ?? []).map((r) => r.competitor_id))];
  const nameById = new Map<string, string>();
  if (ids.length) {
    const { data: comps } = await ctx.supabase
      .from("saved_competitors")
      .select("id, name, brand_name, brand_domain")
      .eq("user_id", ctx.auth.userId)
      .in("id", ids);
    for (const c of comps ?? []) {
      nameById.set(c.id, c.brand_name?.trim() || c.name?.trim() || "Competitor");
      if (!dashboardDomain) dashboardDomain = c.brand_domain?.trim() || null;
    }
  }

  const alerts = (data ?? []).map((row) => {
    const body = truncateAdCopy(row.body ?? "", 200);
    return {
      id: row.id,
      competitor_id: row.competitor_id,
      competitor_name: nameById.get(row.competitor_id) ?? "Competitor",
      alert_type: row.alert_type,
      severity: row.severity,
      title: row.title,
      body: body.text,
      truncated: body.truncated,
      detected_at: row.detected_at,
    };
  });

  return mcpSuccess({
    since_days: sinceDays,
    alerts,
    ...(alerts.length === 0 ? { message: MCP_EMPTY_NO_ALERTS } : {}),
    dashboard_url: mcpDashboardUrl(ctx.auth.appOrigin, dashboardDomain, "tab=insights&sub=alerts"),
  });
}
