import { NextResponse } from "next/server";

import { analyzePendingCompetitorEmails } from "@/lib/email-intelligence/analyze-pending";
import {
  buildInsightsResponse,
  countCompetitorEmails,
  EMAIL_INSIGHTS_MIN_COUNT,
  fetchCompetitorEmailById,
  fetchCompetitorEmailPage,
  fetchCompetitorEmailsForInsights,
} from "@/lib/email-intelligence/api-queries";
import { EMAIL_ANALYZE_BATCH_SIZE, EMAIL_INBOX_PAGE_SIZE } from "@/lib/email-intelligence/constants";
import { syncCompetitorEmailsFromResend } from "@/lib/email-intelligence/sync-from-resend";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseLimit(raw: string | null): number {
  const n = raw ? Number.parseInt(raw, 10) : EMAIL_INBOX_PAGE_SIZE;
  if (!Number.isFinite(n) || n < 1) return EMAIL_INBOX_PAGE_SIZE;
  return Math.min(n, 100);
}

export async function GET(
  req: Request,
  context: { params: Promise<{ competitor_id: string }> },
): Promise<NextResponse> {
  const { competitor_id: competitorIdRaw } = await context.params;
  const competitorId = competitorIdRaw?.trim() ?? "";
  const searchParams = new URL(req.url).searchParams;
  const syncFromResend = searchParams.get("sync") === "1";
  const viewInsights = searchParams.get("view") === "insights";
  const countOnly = searchParams.get("count") === "1";
  const analyzePending = searchParams.get("analyze") === "1";
  const emailId = searchParams.get("email_id")?.trim() ?? "";
  const before = searchParams.get("before")?.trim() || null;
  const searchQuery = searchParams.get("q")?.trim() || null;
  const limit = parseLimit(searchParams.get("limit"));

  if (!competitorId || !UUID_RE.test(competitorId)) {
    return NextResponse.json({ error: "Invalid competitor_id" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: tracker, error: trackerErr } = await supabase
    .from("competitor_email_trackers")
    .select("id, tracking_address, tracking_code, is_active, created_at, competitor_id")
    .eq("user_id", user.id)
    .eq("competitor_id", competitorId)
    .maybeSingle();

  if (trackerErr) {
    return NextResponse.json({ error: trackerErr.message }, { status: 500 });
  }

  if (syncFromResend && tracker?.id && tracker.tracking_address) {
    await syncCompetitorEmailsFromResend({
      trackerId: tracker.id,
      trackingAddress: tracker.tracking_address,
    });
  } else if (analyzePending) {
    await analyzePendingCompetitorEmails({
      competitorId,
      userId: user.id,
      limit: EMAIL_ANALYZE_BATCH_SIZE,
    });
  }

  if (emailId) {
    if (!UUID_RE.test(emailId)) {
      return NextResponse.json({ error: "Invalid email_id" }, { status: 400 });
    }
    try {
      const email = await fetchCompetitorEmailById(supabase, user.id, competitorId, emailId);
      if (!email) {
        return NextResponse.json({ error: "Email not found" }, { status: 404 });
      }
      return NextResponse.json({ tracker: tracker ?? null, email });
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Failed to load email" },
        { status: 500 },
      );
    }
  }

  let emailCount: number;
  try {
    emailCount = await countCompetitorEmails(supabase, user.id, competitorId, searchQuery);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to count emails" },
      { status: 500 },
    );
  }

  const insightsUnlocked = emailCount >= EMAIL_INSIGHTS_MIN_COUNT;

  if (countOnly) {
    return NextResponse.json({
      tracker: tracker ?? null,
      emailCount,
      insightsUnlocked,
      unlockAt: EMAIL_INSIGHTS_MIN_COUNT,
    });
  }

  if (viewInsights) {
    try {
      const { rows, truncated } = await fetchCompetitorEmailsForInsights(
        supabase,
        user.id,
        competitorId,
      );
      return NextResponse.json({
        tracker: tracker ?? null,
        ...buildInsightsResponse({ emailCount, rows, truncated }),
      });
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Failed to load insights" },
        { status: 500 },
      );
    }
  }

  try {
    const { emails, nextCursor } = await fetchCompetitorEmailPage({
      supabase,
      userId: user.id,
      competitorId,
      before,
      limit,
      q: searchQuery,
    });

    return NextResponse.json({
      tracker: tracker ?? null,
      emails,
      nextCursor,
      emailCount,
      searchQuery,
      insightsUnlocked,
      unlockAt: EMAIL_INSIGHTS_MIN_COUNT,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load emails" },
      { status: 500 },
    );
  }
}
