import { formatAdCopyForMcp } from "@/lib/mcp/format-ad-copy";
import { mcpSuccess } from "@/lib/mcp/errors";
import { MCP_EMPTY_NO_SAVED_ADS } from "@/lib/mcp/empty-states";
import { mcpAdLinksForScrapedRow } from "@/lib/mcp/ad-links";
import {
  MCP_PAGE_MAX,
  paginateInMemory,
  parseMcpPage,
} from "@/lib/mcp/pagination";
import { resolveCompetitor } from "@/lib/mcp/resolve-competitor";
import type { McpToolContext } from "@/lib/mcp/tool-context";
import { mcpDashboardUrl } from "@/lib/mcp/urls";

const MCP_SAVED_ADS_FETCH_CAP = 2000;

export type GetSavedAdsInput = {
  competitor?: string;
  platform?: string;
  limit?: number;
  offset?: number;
  include_full_copy?: boolean;
};

export async function getSavedAds(ctx: McpToolContext, input: GetSavedAdsInput) {
  const { limit, offset } = parseMcpPage(input, { defaultLimit: 50, maxLimit: MCP_PAGE_MAX });

  let competitorIds: string[] | null = null;
  let competitorLabel: { id: string; name: string; domain: string | null } | null = null;

  if (input.competitor?.trim()) {
    const comp = await resolveCompetitor(ctx.supabase, ctx.auth.userId, input.competitor);
    if (!comp) {
      return mcpSuccess({
        saved_ads: [],
        pagination: { total: 0, has_more: false, next_offset: null },
        message: `competitor "${input.competitor.trim()}" is not tracked.`,
      });
    }
    competitorIds = [comp.id];
    competitorLabel = { id: comp.id, name: comp.name, domain: comp.domain };
  }

  let q = ctx.supabase
    .from("saved_ads")
    .select(
      "id, competitor_id, platform, format, ad_text, ai_extracted_angle, funnel_stage, notes, saved_at, source_scraped_ad_id, raw_payload, source_first_seen_at, source_last_seen_at",
    )
    .eq("user_id", ctx.auth.userId)
    .order("saved_at", { ascending: false })
    .limit(MCP_SAVED_ADS_FETCH_CAP);

  if (competitorIds) {
    q = q.in("competitor_id", competitorIds);
  }

  const platform = input.platform?.trim();
  if (platform) {
    q = q.ilike("platform", platform);
  }

  const { data: savedRows, error } = await q;
  if (error) throw error;

  const competitorIdSet = [...new Set((savedRows ?? []).map((r) => r.competitor_id))];
  const competitorById = new Map<string, { name: string; domain: string | null }>();

  if (competitorIdSet.length > 0) {
    const { data: competitors } = await ctx.supabase
      .from("saved_competitors")
      .select("id, name, brand_name, brand_domain")
      .eq("user_id", ctx.auth.userId)
      .in("id", competitorIdSet);

    for (const row of competitors ?? []) {
      competitorById.set(row.id, {
        name: row.brand_name?.trim() || row.name?.trim() || "Competitor",
        domain: row.brand_domain?.trim() || null,
      });
    }
  }

  const mapped = (savedRows ?? []).map((row) => {
    const comp = competitorById.get(row.competitor_id);
    const copy = formatAdCopyForMcp(row.ad_text ?? "", input.include_full_copy);
    const links = mcpAdLinksForScrapedRow(
      ctx.auth.appOrigin,
      comp?.domain ?? null,
      row.platform,
      row.source_scraped_ad_id ?? row.id,
      row.raw_payload,
    );
    return {
      id: row.id,
      source_scraped_ad_id: row.source_scraped_ad_id,
      competitor: {
        id: row.competitor_id,
        name: comp?.name ?? "Competitor",
        domain: comp?.domain ?? null,
      },
      platform: row.platform,
      format: row.format,
      ad_text: copy.ad_text,
      truncated: copy.truncated,
      angle: row.ai_extracted_angle,
      funnel_stage: row.funnel_stage,
      notes: row.notes,
      saved_at: row.saved_at,
      source_first_seen_at: row.source_first_seen_at,
      source_last_seen_at: row.source_last_seen_at,
      spy_rival_url: links.spy_rival_url,
      platform_library_url: links.platform_library_url,
    };
  });

  const { items: pageRows, pagination } = paginateInMemory(mapped, limit, offset);

  return mcpSuccess({
    ...(competitorLabel ? { competitor: competitorLabel } : {}),
    saved_ads: pageRows,
    pagination,
    ...(pageRows.length === 0 && mapped.length === 0 ? { message: MCP_EMPTY_NO_SAVED_ADS } : {}),
    dashboard_url: mcpDashboardUrl(
      ctx.auth.appOrigin,
      competitorLabel?.domain ?? null,
      "tab=saved",
    ),
  });
}
