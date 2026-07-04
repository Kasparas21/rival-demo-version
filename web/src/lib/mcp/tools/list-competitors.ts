import { mcpSuccess } from "@/lib/mcp/errors";
import { MCP_EMPTY_NO_COMPETITORS } from "@/lib/mcp/empty-states";
import { mcpDashboardUrl } from "@/lib/mcp/urls";
import type { McpToolContext } from "@/lib/mcp/tool-context";

export async function listCompetitors(ctx: McpToolContext) {
  const { supabase, auth, billing } = ctx;

  const { data: rows, error } = await supabase
    .from("saved_competitors")
    .select("id, name, brand_name, brand_domain, last_scraped_at, updated_at")
    .eq("user_id", auth.userId)
    .eq("is_workspace_brand", false)
    .order("updated_at", { ascending: false });

  if (error) throw error;

  const ids = (rows ?? []).map((r) => r.id);
  const scoreById = new Map<string, { score: number | null; tier: string | null }>();

  if (ids.length > 0) {
    const { data: scores } = await supabase
      .from("competitor_activity_scores")
      .select("competitor_id, score, tier")
      .eq("user_id", auth.userId)
      .in("competitor_id", ids);

    for (const s of scores ?? []) {
      scoreById.set(s.competitor_id, {
        score: typeof s.score === "number" ? s.score : null,
        tier: typeof s.tier === "string" ? s.tier : null,
      });
    }
  }

  const platformByCompetitor = new Map<string, string[]>();
  if (ids.length > 0) {
    const { data: platformRows } = await supabase
      .from("scraped_ads")
      .select("competitor_id, platform")
      .eq("user_id", auth.userId)
      .in("competitor_id", ids)
      .eq("is_active", true)
      .limit(5000);

    for (const row of platformRows ?? []) {
      const list = platformByCompetitor.get(row.competitor_id) ?? [];
      const p = (row.platform ?? "").toLowerCase();
      if (p && !list.includes(p)) list.push(p);
      platformByCompetitor.set(row.competitor_id, list);
    }
  }

  const competitors = (rows ?? []).map((row) => {
    const domain = row.brand_domain?.trim() || null;
    const name = row.brand_name?.trim() || row.name?.trim() || "Competitor";
    const scores = scoreById.get(row.id);
    return {
      id: row.id,
      name,
      domain,
      platforms: platformByCompetitor.get(row.id) ?? [],
      activity_score: scores?.score ?? null,
      activity_tier: scores?.tier ?? null,
      last_scraped_at: row.last_scraped_at,
      dashboard_url: domain ? mcpDashboardUrl(auth.appOrigin, domain) : null,
    };
  });

  return mcpSuccess({
    tracked_count: billing.trackedCount,
    plan_limit: billing.maxWatchedCompetitors,
    plan_tier: billing.planTier,
    competitors,
    ...(competitors.length === 0 ? { message: MCP_EMPTY_NO_COMPETITORS } : {}),
    settings_url: `${auth.appOrigin}/dashboard/settings`,
  });
}
