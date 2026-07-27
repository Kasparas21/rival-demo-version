import { formatAdCopyForMcp } from "@/lib/mcp/format-ad-copy";
import { assertCopyVaultAccess } from "@/lib/mcp/plan-gates";
import { McpToolError, mcpSuccess } from "@/lib/mcp/errors";
import { MCP_EMPTY_NO_VAULT_MATCHES } from "@/lib/mcp/empty-states";
import { paginateInMemory, parseMcpPage, MCP_PAGE_MAX_VAULT } from "@/lib/mcp/pagination";
import { resolveCompetitor } from "@/lib/mcp/resolve-competitor";
import type { McpToolContext } from "@/lib/mcp/tool-context";
import { lifespanDays } from "@/lib/mcp/truncate";
import { mcpAdLinksForScrapedRow } from "@/lib/mcp/ad-links";
import { mcpDashboardUrl } from "@/lib/mcp/urls";

export async function searchCopyVault(
  ctx: McpToolContext,
  input: {
    query: string;
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
  const needle = input.query.trim();
  if (!needle) {
    throw new McpToolError("invalid_input", "query is required");
  }

  let competitorIds: string[] | null = null;
  let dashboardDomain: string | null = null;
  const domainById = new Map<string, string | null>();

  if (input.competitor?.trim()) {
    const comp = await resolveCompetitor(ctx.supabase, ctx.auth.userId, input.competitor);
    if (!comp) {
      throw new McpToolError("not_tracked", `competitor "${input.competitor.trim()}" is not tracked.`);
    }
    competitorIds = [comp.id];
    dashboardDomain = comp.domain;
    domainById.set(comp.id, comp.domain);
  } else {
    const { data: rows } = await ctx.supabase
      .from("saved_competitors")
      .select("id, brand_domain")
      .eq("user_id", ctx.auth.userId)
      .eq("is_workspace_brand", false);
    for (const row of rows ?? []) {
      domainById.set(row.id, row.brand_domain?.trim() || null);
    }
  }

  let q = ctx.supabase
    .from("scraped_ads")
    .select(
      "id, competitor_id, platform, ad_text, first_seen_at, last_seen_at, ai_extracted_angle, funnel_stage, raw_payload",
    )
    .eq("user_id", ctx.auth.userId)
    .eq("is_active", true)
    .eq("ai_enrichment_status", "enriched")
    .or(`ad_text.ilike.%${needle}%,ai_extracted_angle.ilike.%${needle}%`)
    .limit(3000);

  if (competitorIds) q = q.in("competitor_id", competitorIds);
  if (input.platform?.trim()) q = q.ilike("platform", input.platform.trim());

  const { data, error } = await q;
  if (error) throw error;

  const mapped = (data ?? []).map((a) => {
    const copy = formatAdCopyForMcp(a.ad_text ?? "", input.include_full_copy);
    const links = mcpAdLinksForScrapedRow(
      ctx.auth.appOrigin,
      domainById.get(a.competitor_id) ?? null,
      a.platform,
      a.id,
      a.raw_payload,
    );
    return {
      id: a.id,
      competitor_id: a.competitor_id,
      platform: a.platform,
      ad_text: copy.ad_text,
      truncated: copy.truncated,
      angle: a.ai_extracted_angle,
      funnel_stage: a.funnel_stage,
      days_running: lifespanDays(a.first_seen_at, a.last_seen_at),
      spy_rival_url: links.spy_rival_url,
      platform_library_url: links.platform_library_url,
    };
  });

  const { items: results, pagination } = paginateInMemory(mapped, limit, offset);

  return mcpSuccess({
    query: needle,
    results,
    pagination,
    ...(results.length === 0 && mapped.length === 0 ? { message: MCP_EMPTY_NO_VAULT_MATCHES } : {}),
    dashboard_url: mcpDashboardUrl(ctx.auth.appOrigin, dashboardDomain, "tab=comparison&sub=vault"),
  });
}
