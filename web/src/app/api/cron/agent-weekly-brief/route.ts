import { NextResponse } from "next/server";

/** @deprecated Cron removed from vercel.json — superseded by autopilot Phase 3 Auto-Brief. */
import { authorizeCron } from "@/lib/cron/authorize-cron";
import { sendWeeklyBriefForUser } from "@/lib/agent/weekly-brief";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 300;

type RunSummary = {
  ok: boolean;
  eligibleUsers: number;
  sent: number;
  skippedEmpty: number;
  skippedDisabled: number;
  failed: number;
  errors: string[];
};

async function runAgentWeeklyBrief(req: Request): Promise<NextResponse> {
  if (!authorizeCron(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const testUserId = (url.searchParams.get("userId") ?? "").trim();

  const admin = createSupabaseAdminClient();
  const summary: RunSummary = {
    ok: true,
    eligibleUsers: 0,
    sent: 0,
    skippedEmpty: 0,
    skippedDisabled: 0,
    failed: 0,
    errors: [],
  };

  let userIds: string[] = [];

  if (testUserId) {
    userIds = [testUserId];
  } else {
    const { data, error } = await admin
      .from("agent_settings")
      .select("user_id")
      .eq("enabled", true)
      .eq("weekly_brief_enabled", true);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    userIds = (data ?? []).map((r) => r.user_id);
  }

  summary.eligibleUsers = userIds.length;

  for (const userId of userIds) {
    try {
      const result = await sendWeeklyBriefForUser(admin, userId);
      if (result.sent) {
        summary.sent += 1;
      } else if (result.reason === "empty") {
        summary.skippedEmpty += 1;
      } else if (result.reason === "disabled" || result.reason === "email_disabled") {
        summary.skippedDisabled += 1;
      } else {
        summary.failed += 1;
        summary.errors.push(`${userId}: ${result.reason ?? "unknown"}`);
      }
    } catch (err) {
      summary.failed += 1;
      summary.errors.push(`${userId}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log("[cron/agent-weekly-brief]", summary);
  return NextResponse.json(summary);
}

export async function GET(req: Request) {
  return runAgentWeeklyBrief(req);
}

export async function POST(req: Request) {
  return runAgentWeeklyBrief(req);
}
