import { Resend } from "resend";

import { getResendApiKey } from "@/lib/email/resend-config";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

import { analyzePendingCompetitorEmails } from "./analyze-pending";
import { EMAIL_ANALYZE_BATCH_SIZE } from "./constants";
import { inboundMatchesTrackingAddress, ingestCompetitorInboundEmail } from "./ingest-inbound";

export async function syncCompetitorEmailsFromResend(args: {
  trackerId: string;
  trackingAddress: string;
}): Promise<{ synced: number; errors: string[] }> {
  const apiKey = getResendApiKey();
  if (!apiKey) {
    return { synced: 0, errors: ["Resend API key not configured"] };
  }

  const admin = createSupabaseAdminClient();
  const { data: tracker, error: trackerErr } = await admin
    .from("competitor_email_trackers")
    .select("id, user_id, competitor_id, tracking_address, is_active")
    .eq("id", args.trackerId)
    .maybeSingle();

  if (trackerErr || !tracker || !tracker.is_active) {
    return { synced: 0, errors: [trackerErr?.message ?? "Tracker not found"] };
  }

  const resend = new Resend(apiKey);
  const { data: listData, error: listErr } = await resend.emails.receiving.list({ limit: 100 });

  if (listErr || !listData?.data) {
    return { synced: 0, errors: [listErr?.message ?? "Failed to list inbound emails"] };
  }

  const trackingAddress = args.trackingAddress.trim().toLowerCase();
  const matches = listData.data.filter((row) =>
    inboundMatchesTrackingAddress(row.to, trackingAddress),
  );

  let synced = 0;
  const errors: string[] = [];

  for (const summary of matches) {
    const { data: fullEmail, error: getErr } = await resend.emails.receiving.get(summary.id);
    if (getErr || !fullEmail) {
      errors.push(getErr?.message ?? `Failed to fetch inbound ${summary.id}`);
      continue;
    }

    const result = await ingestCompetitorInboundEmail({
      tracker: {
        id: tracker.id,
        user_id: tracker.user_id,
        competitor_id: tracker.competitor_id,
      },
      receivedEmail: fullEmail,
      resendInboundId: summary.id,
      receivedAt: summary.created_at,
      runAnalysis: false,
    });

    if (!result.ok) {
      errors.push(result.error);
      continue;
    }
    if (result.created) synced += 1;
  }

  await analyzePendingCompetitorEmails({
    competitorId: tracker.competitor_id,
    userId: tracker.user_id,
    limit: EMAIL_ANALYZE_BATCH_SIZE,
  });

  return { synced, errors };
}
