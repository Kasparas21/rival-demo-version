import { assertCopyVaultAccess } from "@/lib/mcp/plan-gates";
import { McpToolError, mcpSuccess } from "@/lib/mcp/errors";
import { MCP_EMPTY_NO_VAULT_MATCHES } from "@/lib/mcp/empty-states";
import { resolveCompetitor } from "@/lib/mcp/resolve-competitor";
import type { McpToolContext } from "@/lib/mcp/tool-context";
import { lifespanDays, truncateAdCopy } from "@/lib/mcp/truncate";
import { mcpDashboardUrl } from "@/lib/mcp/urls";

export async function searchCopyVault(
  ctx: McpToolContext,
  input: { query: string; competitor?: string; platform?: string; limit?: number },
) {
  assertCopyVaultAccess(ctx.billing);

  const limit = Math.min(50, Math.max(1, input.limit ?? 20));
  const needle = input.query.trim();
  if (!needle) {
    throw new McpToolError("invalid_input", "query is required");
  }

  let competitorIds: string[] | null = null;
  let dashboardDomain: string | null = null;

  if (input.competitor?.trim()) {
    const comp = await resolveCompetitor(ctx.supabase, ctx.auth.userId, input.competitor);
    if (!comp) {
      throw new McpToolError("not_tracked", `competitor "${input.competitor.trim()}" is not tracked.`);
    }
    competitorIds = [comp.id];
    dashboardDomain = comp.domain;
  }

  let q = ctx.supabase
    .from("scraped_ads")
    .select(
      "id, competitor_id, platform, ad_text, first_seen_at, last_seen_at, ai_extracted_angle, funnel_stage",
    )
    .eq("user_id", ctx.auth.userId)
    .eq("is_active", true)
    .eq("ai_enrichment_status", "enriched")
    .or(`ad_text.ilike.%${needle}%,ai_extracted_angle.ilike.%${needle}%`)
    .limit(300);

  if (competitorIds) q = q.in("competitor_id", competitorIds);
  if (input.platform?.trim()) q = q.ilike("platform", input.platform.trim());

  const { data, error } = await q;
  if (error) throw error;

  const results = (data ?? [])
    .map((a) => {
      const copy = truncateAdCopy(a.ad_text ?? "");
      return {
        id: a.id,
        competitor_id: a.competitor_id,
        platform: a.platform,
        ad_text: copy.text,
        truncated: copy.truncated,
        angle: a.ai_extracted_angle,
        funnel_stage: a.funnel_stage,
        days_running: lifespanDays(a.first_seen_at, a.last_seen_at),
      };
    })
    .slice(0, limit);

  return mcpSuccess({
    query: needle,
    results,
    ...(results.length === 0 ? { message: MCP_EMPTY_NO_VAULT_MATCHES } : {}),
    dashboard_url: mcpDashboardUrl(ctx.auth.appOrigin, dashboardDomain, "tab=comparison&sub=vault"),
  });
}
