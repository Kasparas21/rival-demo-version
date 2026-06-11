import { NextResponse } from "next/server";

import { buildDigestForUser } from "@/lib/digest/build-digest-for-user";
import { authorizeCron } from "@/lib/cron/authorize-cron";
import {
  digestListUnsubscribeHeaders,
  sendWeeklyDigestBatch,
  wasDigestSentRecently,
  type DigestBatchEmail,
} from "@/lib/digest/send-weekly-digest-batch";
import {
  buildWeeklyDigestEmailHtml,
  buildWeeklyDigestEmailText,
  getWeeklyDigestFromEmail,
  weeklyDigestPayloadToEmailInput,
  weeklyDigestSubject,
} from "@/lib/digest/weekly-digest-email";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 300;

type RunSummary = {
  ok: boolean;
  mode: "production" | "test";
  eligibleUsers: number;
  built: number;
  sent: number;
  failed: number;
  skippedEmpty: number;
  skippedRecent: number;
  skippedOptOut: number;
  errors: string[];
};

async function loadEligibleUserIds(admin: ReturnType<typeof createSupabaseAdminClient>): Promise<string[]> {
  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id, weekly_digest_opted_out")
    .eq("weekly_digest_opted_out", false);

  if (error) throw new Error(error.message);

  const candidateIds = (profiles ?? []).map((p) => p.id);
  if (candidateIds.length === 0) return [];

  const { data: comps, error: compErr } = await admin
    .from("saved_competitors")
    .select("user_id, is_workspace_brand")
    .in("user_id", candidateIds);

  if (compErr) throw new Error(compErr.message);

  const usersWithCompetitors = new Set<string>();
  for (const row of comps ?? []) {
    if (row.is_workspace_brand) continue;
    usersWithCompetitors.add(row.user_id);
  }

  return candidateIds.filter((id) => usersWithCompetitors.has(id));
}

async function runWeeklyDigest(req: Request): Promise<NextResponse> {
  if (!authorizeCron(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const testMode = url.searchParams.get("test") === "1" || url.searchParams.get("test") === "true";
  const testUserId = (url.searchParams.get("userId") ?? "").trim();

  const admin = createSupabaseAdminClient();
  const appOrigin = process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://spy-rival.com";
  const from = getWeeklyDigestFromEmail();

  const summary: RunSummary = {
    ok: true,
    mode: testMode ? "test" : "production",
    eligibleUsers: 0,
    built: 0,
    sent: 0,
    failed: 0,
    skippedEmpty: 0,
    skippedRecent: 0,
    skippedOptOut: 0,
    errors: [],
  };

  const userIds = testMode && testUserId ? [testUserId] : await loadEligibleUserIds(admin);
  summary.eligibleUsers = userIds.length;

  const outbound: Array<{ userId: string; email: DigestBatchEmail; competitorCount: number; changeCount: number }> = [];

  for (const userId of userIds) {
    if (!testMode) {
      const { data: profile } = await admin
        .from("profiles")
        .select("last_weekly_digest_sent_at, weekly_digest_opted_out")
        .eq("id", userId)
        .maybeSingle();

      if (profile?.weekly_digest_opted_out) {
        summary.skippedOptOut += 1;
        continue;
      }
      if (wasDigestSentRecently(profile?.last_weekly_digest_sent_at)) {
        summary.skippedRecent += 1;
        continue;
      }
    }

    let payload;
    try {
      payload = await buildDigestForUser(admin, userId, { appOrigin });
    } catch (err) {
      summary.errors.push(`${userId}: ${err instanceof Error ? err.message : String(err)}`);
      continue;
    }

    if (!payload) {
      summary.skippedEmpty += 1;
      continue;
    }

    const input = weeklyDigestPayloadToEmailInput(payload, appOrigin);
    const subject = weeklyDigestSubject(payload.competitors.length);
    const html = buildWeeklyDigestEmailHtml(input);
    const text = buildWeeklyDigestEmailText(input);
    const changeCount = payload.competitors.reduce((n, c) => n + c.changes.length, 0);

    outbound.push({
      userId,
      competitorCount: payload.competitors.length,
      changeCount,
      email: {
        from,
        to: payload.userEmail,
        subject,
        html,
        text,
        headers: digestListUnsubscribeHeaders(payload.unsubscribeUrl),
      },
    });
  }

  summary.built = outbound.length;
  if (outbound.length === 0) {
    return NextResponse.json(summary);
  }

  const batchResult = await sendWeeklyDigestBatch(outbound.map((o) => o.email));
  summary.sent = batchResult.sent;
  summary.failed = batchResult.failed;
  summary.errors.push(...batchResult.errors);

  const nowIso = new Date().toISOString();
  for (const index of batchResult.sentIndexes) {
    const item = outbound[index];
    if (!item) continue;

    await admin
      .from("profiles")
      .update({ last_weekly_digest_sent_at: nowIso, updated_at: nowIso })
      .eq("id", item.userId);

    await admin.from("weekly_digest_sends").insert({
      user_id: item.userId,
      sent_at: nowIso,
      competitor_count: item.competitorCount,
      change_count: item.changeCount,
      resend_batch_id: batchResult.batchIds[0] ?? null,
      test_send: testMode,
    });
  }

  console.log("[cron/weekly-digest]", summary);
  return NextResponse.json(summary);
}

/** POST — Vercel Cron weekly digest (Tue 09:00 UTC, Bearer CRON_SECRET). Test: ?test=1&userId=<uuid> */
export async function POST(req: Request): Promise<NextResponse> {
  return runWeeklyDigest(req);
}

/** GET — same as POST for manual/test triggers with ?secret= */
export async function GET(req: Request): Promise<NextResponse> {
  return runWeeklyDigest(req);
}
