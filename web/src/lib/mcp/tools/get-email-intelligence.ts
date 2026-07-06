import { McpToolError, mcpSuccess } from "@/lib/mcp/errors";
import { MCP_EMPTY_NO_EMAILS } from "@/lib/mcp/empty-states";
import { buildMcpPagination, parseMcpPage } from "@/lib/mcp/pagination";
import { requireCompetitor } from "@/lib/mcp/resolve-competitor";
import type { McpToolContext } from "@/lib/mcp/tool-context";
import { truncateAdCopy } from "@/lib/mcp/truncate";
import { mcpDashboardUrl } from "@/lib/mcp/urls";
import {
  buildInsightsResponse,
  countCompetitorEmails,
  fetchCompetitorEmailById,
  fetchCompetitorEmailsForInsights,
} from "@/lib/email-intelligence/api-queries";
import type { CompetitorEmailRow } from "@/lib/email-intelligence/types";

function formatEmailForMcp(row: CompetitorEmailRow, includeFullBody: boolean) {
  const bodySource = row.plain_text ?? row.preview_text ?? "";
  const body = includeFullBody
    ? { text: bodySource.trim(), truncated: false }
    : truncateAdCopy(bodySource, 400);
  return {
    id: row.id,
    subject: row.subject,
    from_email: row.from_email,
    from_name: row.from_name,
    received_at: row.received_at,
    email_type: row.email_type,
    esp_detected: row.esp_detected,
    ai_summary: row.ai_summary,
    ai_offers: row.ai_offers,
    ai_cta: row.ai_cta,
    ai_angle: row.ai_angle,
    body_preview: body.text,
    truncated: body.truncated,
    ai_processed_at: row.ai_processed_at,
    ai_analysis_error: row.ai_analysis_error,
  };
}

export async function getEmailIntelligence(
  ctx: McpToolContext,
  input: {
    competitor: string;
    view?: "inbox" | "insights" | "detail";
    email_id?: string;
    q?: string;
    limit?: number;
    offset?: number;
    include_full_body?: boolean;
  },
) {
  const comp = await requireCompetitor(ctx.supabase, ctx.auth.userId, input.competitor);
  const view = input.view ?? "inbox";
  const dashboardUrl = mcpDashboardUrl(ctx.auth.appOrigin, comp.domain, "tab=email");

  if (view === "detail") {
    const emailId = input.email_id?.trim();
    if (!emailId) {
      throw new McpToolError("invalid_input", "email_id is required when view=detail.");
    }
    const row = await fetchCompetitorEmailById(ctx.supabase, ctx.auth.userId, comp.id, emailId);
    if (!row) {
      throw new McpToolError("not_found", `Email ${emailId} not found for this competitor.`);
    }
    const includeFullBody = input.include_full_body === true;
    return mcpSuccess({
      competitor: { id: comp.id, name: comp.name, domain: comp.domain },
      view: "detail",
      email: {
        ...formatEmailForMcp(row, includeFullBody),
        html_body: includeFullBody ? row.html_body : null,
        plain_text: includeFullBody ? row.plain_text : null,
      },
      dashboard_url: dashboardUrl,
    });
  }

  if (view === "insights") {
    const emailCount = await countCompetitorEmails(ctx.supabase, ctx.auth.userId, comp.id);
    const { rows, truncated } = await fetchCompetitorEmailsForInsights(
      ctx.supabase,
      ctx.auth.userId,
      comp.id,
    );
    const insightsPayload = buildInsightsResponse({ emailCount, rows, truncated });

    return mcpSuccess({
      competitor: { id: comp.id, name: comp.name, domain: comp.domain },
      view: "insights",
      ...insightsPayload,
      dashboard_url: dashboardUrl,
    });
  }

  const { limit, offset } = parseMcpPage(input, { defaultLimit: 50, maxLimit: 200 });
  const total = await countCompetitorEmails(ctx.supabase, ctx.auth.userId, comp.id, input.q);

  let query = ctx.supabase
    .from("competitor_emails")
    .select(
      "id, tracker_id, user_id, competitor_id, from_email, from_name, subject, preview_text, plain_text, received_at, esp_detected, email_type, ai_summary, ai_offers, ai_cta, ai_angle, ai_processed_at, ai_analysis_error, ai_analysis_attempts, created_at",
    )
    .eq("user_id", ctx.auth.userId)
    .eq("competitor_id", comp.id)
    .order("received_at", { ascending: false });

  const trimmedQ = input.q?.trim();
  if (trimmedQ) {
    const pattern = `%${trimmedQ.replace(/[%_\\]/g, "\\$&")}%`;
    query = query.or(
      [
        `subject.ilike.${pattern}`,
        `from_email.ilike.${pattern}`,
        `from_name.ilike.${pattern}`,
        `ai_summary.ilike.${pattern}`,
        `ai_offers::text.ilike.${pattern}`,
      ].join(","),
    );
  }

  const { data, error } = await query.range(offset, offset + limit - 1);
  if (error) throw error;

  const includeFullBody = input.include_full_body === true;
  const emails = ((data ?? []) as CompetitorEmailRow[]).map((row) =>
    formatEmailForMcp(row, includeFullBody),
  );

  return mcpSuccess({
    competitor: { id: comp.id, name: comp.name, domain: comp.domain },
    view: "inbox",
    query: trimmedQ ?? null,
    emails,
    pagination: buildMcpPagination(total, limit, offset),
    ...(emails.length === 0 ? { message: MCP_EMPTY_NO_EMAILS } : {}),
    dashboard_url: dashboardUrl,
  });
}
