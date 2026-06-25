import { after, NextResponse } from "next/server";
import { Resend } from "resend";

import { ingestCompetitorInboundEmail } from "@/lib/email-intelligence/ingest-inbound";
import { parseTrackingCodeFromAddress } from "@/lib/email-intelligence/tracking-code";
import { analyzeCompetitorEmail } from "@/lib/email-intelligence/analyze";
import { getResendApiKey, getResendWebhookSecret } from "@/lib/email/resend-config";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request): Promise<NextResponse> {
  const webhookSecret = getResendWebhookSecret();
  const apiKey = getResendApiKey();

  if (!webhookSecret || !apiKey) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const payload = await req.text();
  const resend = new Resend(apiKey);

  let event: ReturnType<Resend["webhooks"]["verify"]>;
  try {
    event = resend.webhooks.verify({
      payload,
      headers: {
        id: req.headers.get("svix-id") ?? "",
        timestamp: req.headers.get("svix-timestamp") ?? "",
        signature: req.headers.get("svix-signature") ?? "",
      },
      webhookSecret,
    });
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  if (event.type !== "email.received") {
    return NextResponse.json({ ok: true });
  }

  const trackingCode = parseTrackingCodeFromAddress(event.data.to);
  if (!trackingCode) {
    return NextResponse.json({ ok: true });
  }

  const admin = createSupabaseAdminClient();
  const { data: tracker } = await admin
    .from("competitor_email_trackers")
    .select("id, user_id, competitor_id")
    .eq("tracking_code", trackingCode)
    .eq("is_active", true)
    .maybeSingle();

  if (!tracker) {
    return NextResponse.json({ ok: true });
  }

  const { data: receivedEmail, error: receiveErr } = await resend.emails.receiving.get(
    event.data.email_id,
  );

  if (receiveErr || !receivedEmail) {
    console.error("[email-inbound] receiving.get failed", receiveErr?.message ?? "no data");
    return NextResponse.json({ error: "Failed to fetch inbound email" }, { status: 502 });
  }

  const receivedAt =
    event.data.created_at && !Number.isNaN(Date.parse(event.data.created_at))
      ? new Date(event.data.created_at).toISOString()
      : undefined;

  const result = await ingestCompetitorInboundEmail({
    tracker,
    receivedEmail,
    receivedAt,
    resendInboundId: event.data.email_id,
    runAnalysis: false,
  });

  if (!result.ok) {
    console.error("[email-inbound] insert failed", result.error);
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  if (result.created) {
    const emailId = result.id;
    after(async () => {
      try {
        await analyzeCompetitorEmail(emailId);
      } catch (err) {
        console.error("[email-inbound] analyze failed", err);
      }
    });
  }

  return NextResponse.json({ ok: true });
}
