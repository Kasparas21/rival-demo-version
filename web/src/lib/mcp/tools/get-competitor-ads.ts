import { mcpSuccess } from "@/lib/mcp/errors";
import { MCP_EMPTY_NO_ADS } from "@/lib/mcp/empty-states";
import { requireCompetitor } from "@/lib/mcp/resolve-competitor";
import type { McpToolContext } from "@/lib/mcp/tool-context";
import { lifespanDays, truncateAdCopy } from "@/lib/mcp/truncate";
import { mcpDashboardUrl } from "@/lib/mcp/urls";

export type GetCompetitorAdsInput = {
  competitor: string;
  platform?: string;
  limit?: number;
  sort?: "newest" | "longest_running";
};

export async function getCompetitorAds(ctx: McpToolContext, input: GetCompetitorAdsInput) {
  const limit = Math.min(50, Math.max(1, input.limit ?? 20));
  const sort = input.sort === "newest" ? "newest" : "longest_running";

  const comp = await requireCompetitor(ctx.supabase, ctx.auth.userId, input.competitor);

  let q = ctx.supabase
    .from("scraped_ads")
    .select(
      "id, platform, ad_text, first_seen_at, last_seen_at, ai_extracted_angle, format, is_active",
    )
    .eq("user_id", ctx.auth.userId)
    .eq("competitor_id", comp.id)
    .eq("is_active", true);

  if (input.platform?.trim()) {
    q = q.ilike("platform", input.platform.trim());
  }

  const { data, error } = await q.limit(500);
  if (error) throw error;

  let rows = (data ?? []).map((a) => {
    const days = lifespanDays(a.first_seen_at, a.last_seen_at);
    const copy = truncateAdCopy(a.ad_text ?? "");
    return {
      id: a.id,
      platform: a.platform,
      format: a.format,
      ad_text: copy.text,
      truncated: copy.truncated,
      first_seen_at: a.first_seen_at,
      last_seen_at: a.last_seen_at,
      days_running: days,
      angle: a.ai_extracted_angle,
    };
  });

  if (sort === "newest") {
    rows.sort((a, b) => Date.parse(b.first_seen_at) - Date.parse(a.first_seen_at));
  } else {
    rows.sort((a, b) => b.days_running - a.days_running);
  }

  rows = rows.slice(0, limit);

  return mcpSuccess({
    competitor: { id: comp.id, name: comp.name, domain: comp.domain },
    sort,
    ads: rows,
    ...(rows.length === 0 ? { message: MCP_EMPTY_NO_ADS } : {}),
    dashboard_url: mcpDashboardUrl(ctx.auth.appOrigin, comp.domain, "tab=ads"),
  });
}
