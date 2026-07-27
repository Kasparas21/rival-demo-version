import { McpToolError, mcpSuccess } from "@/lib/mcp/errors";
import { MCP_EMPTY_NO_LANDING_PAGES } from "@/lib/mcp/empty-states";
import { buildMcpPagination, parseMcpPage, paginateInMemory } from "@/lib/mcp/pagination";
import { requireCompetitor } from "@/lib/mcp/resolve-competitor";
import type { McpToolContext } from "@/lib/mcp/tool-context";
import { truncateAdCopy } from "@/lib/mcp/truncate";
import { mcpAdLinksForScrapedRow } from "@/lib/mcp/ad-links";
import { mcpDashboardUrl } from "@/lib/mcp/urls";
import { extractGoogleHostnameLandingKey, extractLandingPageUrl } from "@/lib/landing-pages/extract-lp-url";
import {
  groupLandingPagesFromAds,
  type LandingPageAdRow,
} from "@/lib/landing-pages/group-landing-pages";
import { normalizeLandingPageUrl } from "@/lib/landing-pages/normalize-url";
import type { Json } from "@/lib/supabase/types";

type ScrapedAdRow = {
  id: string;
  platform: string;
  format?: string;
  ad_text: string;
  ad_creative_url: string | null;
  first_seen_at: string;
  last_seen_at?: string;
  is_active?: boolean;
  ai_extracted_angle: string | null;
  raw_payload: Json;
};

function landingKeyForAd(platform: string, rawPayload: Json): string | null {
  const lp = extractLandingPageUrl(platform, rawPayload);
  if (lp) return lp;
  return extractGoogleHostnameLandingKey(platform, rawPayload);
}

export async function getLandingPages(
  ctx: McpToolContext,
  input: {
    competitor: string;
    url?: string;
    limit?: number;
    offset?: number;
    include_full_copy?: boolean;
  },
) {
  const comp = await requireCompetitor(ctx.supabase, ctx.auth.userId, input.competitor);
  const { limit, offset } = parseMcpPage(input, { defaultLimit: 50, maxLimit: 500 });
  const dashboardUrl = mcpDashboardUrl(ctx.auth.appOrigin, comp.domain, "tab=landing-pages");

  const { data: competitorRow, error: compErr } = await ctx.supabase
    .from("saved_competitors")
    .select("id, brand_name, name, last_scraped_at")
    .eq("id", comp.id)
    .eq("user_id", ctx.auth.userId)
    .single();

  if (compErr || !competitorRow) {
    throw new McpToolError("not_tracked", "Competitor not found.");
  }

  const { data: ads, error: adsErr } = await ctx.supabase
    .from("scraped_ads")
    .select(
      "id, platform, format, ad_creative_url, ad_text, ai_extracted_angle, first_seen_at, last_seen_at, is_active, raw_payload",
    )
    .eq("user_id", ctx.auth.userId)
    .eq("competitor_id", comp.id)
    .eq("is_active", true)
    .order("last_seen_at", { ascending: false })
    .limit(2000);

  if (adsErr) throw adsErr;

  const adLinksForRow = (row: ScrapedAdRow) =>
    mcpAdLinksForScrapedRow(ctx.auth.appOrigin, comp.domain, row.platform, row.id, row.raw_payload);

  const urlFilter = input.url?.trim();
  if (urlFilter) {
    let decoded: string;
    try {
      decoded = decodeURIComponent(urlFilter);
    } catch {
      decoded = urlFilter;
    }
    const targetKey = normalizeLandingPageUrl(decoded) ?? decoded;

    const matched: ScrapedAdRow[] = [];
    for (const ad of ads ?? []) {
      const row = ad as ScrapedAdRow;
      const key = landingKeyForAd(row.platform, row.raw_payload);
      if (key && key === targetKey) matched.push(row);
    }

    matched.sort((a, b) => new Date(b.first_seen_at).getTime() - new Date(a.first_seen_at).getTime());
    const { items, pagination } = paginateInMemory(matched, limit, offset);
    const includeFull = input.include_full_copy === true;

    return mcpSuccess({
      competitor: { id: comp.id, name: comp.name, domain: comp.domain },
      mode: "ads_for_url",
      url: targetKey,
      ads: items.map((a) => {
        const copy = includeFull
          ? { text: a.ad_text.trim(), truncated: false }
          : truncateAdCopy(a.ad_text, 300);
        return {
          id: a.id,
          platform: a.platform,
          format: a.format ?? null,
          ad_text: copy.text,
          truncated: copy.truncated,
          ad_creative_url: a.ad_creative_url,
          first_seen_at: a.first_seen_at,
          ai_extracted_angle: a.ai_extracted_angle,
          ...adLinksForRow(a),
        };
      }),
      pagination,
      dashboard_url: dashboardUrl,
    });
  }

  const grouped = groupLandingPagesFromAds(
    (ads ?? []) as LandingPageAdRow[],
    competitorRow.last_scraped_at,
  );
  const payloadByAdId = new Map(
    (ads ?? []).map((ad) => [ad.id, (ad as ScrapedAdRow).raw_payload] as const),
  );
  const { items, pagination } = paginateInMemory(grouped.groups, limit, offset);

  const landingPages = items.map((g) => ({
    group_id: g.groupId,
    url: g.url,
    display_url: g.displayUrl,
    host: g.host,
    total_ads: g.totalAds,
    active_ads: g.activeAds,
    killed_ads: g.killedAds,
    first_seen_at: g.firstSeenAt,
    last_seen_at: g.lastSeenAt,
    platform_breakdown: g.platformBreakdown,
    top_ads: g.topAds.map((a) => {
      const copy = input.include_full_copy
        ? { text: a.ad_text.trim(), truncated: false }
        : truncateAdCopy(a.ad_text, 200);
      return {
        id: a.id,
        platform: a.platform,
        ad_text: copy.text,
        truncated: copy.truncated,
        ad_creative_url: a.ad_creative_url,
        ai_extracted_angle: a.ai_extracted_angle,
        last_seen_at: a.last_seen_at,
        ...mcpAdLinksForScrapedRow(
          ctx.auth.appOrigin,
          comp.domain,
          a.platform,
          a.id,
          payloadByAdId.get(a.id) ?? null,
        ),
      };
    }),
  }));

  return mcpSuccess({
    competitor: { id: comp.id, name: comp.name, domain: comp.domain },
    mode: "groups",
    landing_pages: landingPages,
    summary: {
      total_unique_urls: grouped.groups.length,
      total_ads_with_lp: grouped.groups.reduce((sum, g) => sum + g.totalAds, 0),
      ads_without_lp: grouped.adsWithoutLp,
      platform_counts: grouped.platformCounts,
    },
    pagination,
    ...(landingPages.length === 0 ? { message: MCP_EMPTY_NO_LANDING_PAGES } : {}),
    dashboard_url: dashboardUrl,
  });
}
