import type { SupabaseClient } from "@supabase/supabase-js";

import { computeEmailInsights } from "@/lib/email-intelligence/compute-insights";
import {
  EMAIL_INBOX_PAGE_SIZE,
  EMAIL_INSIGHTS_MAX_ROWS,
  EMAIL_INSIGHTS_MIN_COUNT,
} from "@/lib/email-intelligence/constants";
import type { CompetitorEmailRow, EmailRowForInsights } from "@/lib/email-intelligence/types";
import type { Database } from "@/lib/supabase/types";

const INBOX_LIST_COLUMNS =
  "id, tracker_id, user_id, competitor_id, from_email, from_name, subject, preview_text, plain_text, received_at, esp_detected, email_type, ai_summary, ai_offers, ai_cta, ai_angle, ai_processed_at, ai_analysis_error, ai_analysis_attempts, ai_analysis_version, created_at";

const EMAIL_DETAIL_COLUMNS = `${INBOX_LIST_COLUMNS}, html_body, ai_deep_analysis`;

const INSIGHTS_COLUMNS =
  "id, received_at, subject, email_type, ai_offers, ai_angle, esp_detected";

function escapeIlikePattern(q: string): string {
  return q.replace(/[%_\\]/g, "\\$&");
}

function applyEmailSearchFilter<T extends { or: (filters: string) => T }>(
  query: T,
  q: string | null | undefined,
): T {
  const trimmed = q?.trim();
  if (!trimmed) return query;
  const pattern = `%${escapeIlikePattern(trimmed)}%`;
  return query.or(
    [
      `subject.ilike.${pattern}`,
      `from_email.ilike.${pattern}`,
      `from_name.ilike.${pattern}`,
      `ai_summary.ilike.${pattern}`,
      `ai_offers::text.ilike.${pattern}`,
    ].join(","),
  );
}

export async function countCompetitorEmails(
  supabase: SupabaseClient<Database>,
  userId: string,
  competitorId: string,
  q?: string | null,
): Promise<number> {
  let query = supabase
    .from("competitor_emails")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("competitor_id", competitorId);

  query = applyEmailSearchFilter(query, q);

  const { count, error } = await query;

  if (error) {
    throw new Error(error.message);
  }
  return count ?? 0;
}

export async function fetchCompetitorEmailById(
  supabase: SupabaseClient<Database>,
  userId: string,
  competitorId: string,
  emailId: string,
): Promise<CompetitorEmailRow | null> {
  const { data, error } = await supabase
    .from("competitor_emails")
    .select(EMAIL_DETAIL_COLUMNS)
    .eq("user_id", userId)
    .eq("competitor_id", competitorId)
    .eq("id", emailId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  return (data as CompetitorEmailRow | null) ?? null;
}

export async function fetchCompetitorEmailPage(args: {
  supabase: SupabaseClient<Database>;
  userId: string;
  competitorId: string;
  before?: string | null;
  limit?: number;
  q?: string | null;
}): Promise<{ emails: CompetitorEmailRow[]; nextCursor: string | null }> {
  const limit = args.limit ?? EMAIL_INBOX_PAGE_SIZE;
  let query = args.supabase
    .from("competitor_emails")
    .select(INBOX_LIST_COLUMNS)
    .eq("user_id", args.userId)
    .eq("competitor_id", args.competitorId)
    .order("received_at", { ascending: false })
    .limit(limit + 1);

  query = applyEmailSearchFilter(query, args.q);

  if (args.before) {
    query = query.lt("received_at", args.before);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as CompetitorEmailRow[];
  const hasMore = rows.length > limit;
  const emails = hasMore ? rows.slice(0, limit) : rows;
  const last = emails[emails.length - 1];
  const nextCursor = hasMore && last?.received_at ? last.received_at : null;

  return { emails, nextCursor };
}

export async function fetchCompetitorEmailsForInsights(
  supabase: SupabaseClient<Database>,
  userId: string,
  competitorId: string,
): Promise<{ rows: EmailRowForInsights[]; truncated: boolean }> {
  const { data, error, count } = await supabase
    .from("competitor_emails")
    .select(INSIGHTS_COLUMNS, { count: "exact" })
    .eq("user_id", userId)
    .eq("competitor_id", competitorId)
    .order("received_at", { ascending: false })
    .limit(EMAIL_INSIGHTS_MAX_ROWS);

  if (error) {
    throw new Error(error.message);
  }

  return {
    rows: (data ?? []) as EmailRowForInsights[],
    truncated: (count ?? 0) > EMAIL_INSIGHTS_MAX_ROWS,
  };
}

export function buildInsightsResponse(args: {
  emailCount: number;
  rows: EmailRowForInsights[];
  truncated?: boolean;
}) {
  const insightsUnlocked = args.emailCount >= EMAIL_INSIGHTS_MIN_COUNT;
  if (!insightsUnlocked) {
    return {
      insights: null,
      insightsLocked: true,
      emailCount: args.emailCount,
      unlockAt: EMAIL_INSIGHTS_MIN_COUNT,
    };
  }

  return {
    insights: computeEmailInsights(args.rows),
    insightsLocked: false,
    emailCount: args.emailCount,
    unlockAt: EMAIL_INSIGHTS_MIN_COUNT,
    insightsTruncated: args.truncated ?? false,
  };
}

export { EMAIL_INSIGHTS_MIN_COUNT, applyEmailSearchFilter };
