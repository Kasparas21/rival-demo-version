import { formatAdCopyForMcp } from "@/lib/mcp/format-ad-copy";
import { mcpSuccess } from "@/lib/mcp/errors";
import { MCP_EMPTY_NO_TIMELINE } from "@/lib/mcp/empty-states";
import { paginateInMemory, parseMcpPage } from "@/lib/mcp/pagination";
import { requireCompetitor } from "@/lib/mcp/resolve-competitor";
import type { McpToolContext } from "@/lib/mcp/tool-context";
import { mcpDashboardUrl } from "@/lib/mcp/urls";

export async function getCompetitorTimeline(
  ctx: McpToolContext,
  input: { competitor: string; days?: number; limit?: number; offset?: number; include_full_copy?: boolean },
) {
  const days = Math.min(90, Math.max(1, input.days ?? 30));
  const sinceMs = Date.now() - days * 86_400_000;
  const { limit, offset } = parseMcpPage(input, { defaultLimit: 100, maxLimit: 200 });

  const comp = await requireCompetitor(ctx.supabase, ctx.auth.userId, input.competitor);

  const { data: ads, error } = await ctx.supabase
    .from("scraped_ads")
    .select("id, platform, ad_text, first_seen_at, last_seen_at, ai_extracted_angle, format")
    .eq("user_id", ctx.auth.userId)
    .eq("competitor_id", comp.id)
    .gte("first_seen_at", new Date(sinceMs).toISOString())
    .order("first_seen_at", { ascending: false })
    .limit(500);

  if (error) throw error;

  const { data: alertRows } = await ctx.supabase
    .from("competitor_alerts")
    .select("id, alert_type, title, detected_at, severity")
    .eq("user_id", ctx.auth.userId)
    .eq("competitor_id", comp.id)
    .gte("detected_at", new Date(sinceMs).toISOString())
    .order("detected_at", { ascending: false })
    .limit(200);

  const events: Array<{
    type: "new_ad" | "alert";
    at: string;
    platform?: string;
    summary: string;
    truncated?: boolean;
    alert_type?: string;
    severity?: string;
  }> = [];

  for (const a of ads ?? []) {
    const copy = formatAdCopyForMcp(a.ad_text ?? "", input.include_full_copy);
    const summary = input.include_full_copy
      ? copy.ad_text
      : copy.ad_text.length > 120
        ? `${copy.ad_text.slice(0, 120)}…`
        : copy.ad_text;
    events.push({
      type: "new_ad",
      at: a.first_seen_at,
      platform: a.platform,
      summary,
      truncated: copy.truncated || summary.length < (a.ad_text ?? "").trim().length,
    });
  }

  for (const al of alertRows ?? []) {
    events.push({
      type: "alert",
      at: al.detected_at,
      summary: al.title,
      alert_type: al.alert_type,
      severity: al.severity,
    });
  }

  events.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));

  const { items: pageEvents, pagination } = paginateInMemory(events, limit, offset);

  return mcpSuccess({
    competitor: { id: comp.id, name: comp.name, domain: comp.domain },
    days,
    events: pageEvents,
    pagination,
    ...(events.length === 0 ? { message: MCP_EMPTY_NO_TIMELINE } : {}),
    dashboard_url: mcpDashboardUrl(ctx.auth.appOrigin, comp.domain, "tab=timeline"),
  });
}
