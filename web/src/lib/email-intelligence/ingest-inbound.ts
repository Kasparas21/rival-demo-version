import type { GetReceivingEmailResponseSuccess } from "resend";

import { analyzeCompetitorEmail } from "@/lib/email-intelligence/analyze";
import { detectEspFromHtml } from "@/lib/email-intelligence/esp-detect";
import { parseFromField } from "@/lib/email-intelligence/parse-from";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type InboundTracker = {
  id: string;
  user_id: string;
  competitor_id: string;
};

export function inboundMatchesTrackingAddress(
  to: string[] | undefined,
  trackingAddress: string,
): boolean {
  const target = trackingAddress.trim().toLowerCase();
  if (!target || !to?.length) return false;
  return to.some((addr) => {
    const normalized = addr.trim().toLowerCase();
    if (normalized === target) return true;
    const angle = normalized.match(/<([^>]+)>/);
    return angle?.[1]?.trim() === target;
  });
}

export async function ingestCompetitorInboundEmail(args: {
  tracker: InboundTracker;
  receivedEmail: GetReceivingEmailResponseSuccess;
  receivedAt?: string;
  resendInboundId: string;
  runAnalysis?: boolean;
}): Promise<{ ok: true; id: string; created: boolean } | { ok: false; error: string }> {
  const admin = createSupabaseAdminClient();
  const { tracker, receivedEmail, resendInboundId } = args;

  const { data: existing } = await admin
    .from("competitor_emails")
    .select("id")
    .eq("resend_inbound_id", resendInboundId)
    .maybeSingle();

  if (existing?.id) {
    if (args.runAnalysis === true) {
      const { data: pending } = await admin
        .from("competitor_emails")
        .select("ai_processed_at")
        .eq("id", existing.id)
        .maybeSingle();
      if (!pending?.ai_processed_at) {
        try {
          await analyzeCompetitorEmail(existing.id);
        } catch (err) {
          console.error("[ingest-inbound] analyze failed (existing)", err);
        }
      }
    }
    return { ok: true, id: existing.id, created: false };
  }

  const headersFrom =
    receivedEmail.headers && typeof receivedEmail.headers === "object"
      ? String((receivedEmail.headers as Record<string, unknown>).from ?? "")
      : "";
  const parsedFrom = parseFromField(headersFrom || receivedEmail.from);

  const htmlBody = receivedEmail.html ?? null;
  const plainText = receivedEmail.text ?? null;
  const espDetected = detectEspFromHtml(htmlBody);

  const receivedAt =
    args.receivedAt && !Number.isNaN(Date.parse(args.receivedAt))
      ? new Date(args.receivedAt).toISOString()
      : receivedEmail.created_at && !Number.isNaN(Date.parse(receivedEmail.created_at))
        ? new Date(receivedEmail.created_at).toISOString()
        : new Date().toISOString();

  const { data: inserted, error: insertErr } = await admin
    .from("competitor_emails")
    .insert({
      tracker_id: tracker.id,
      user_id: tracker.user_id,
      competitor_id: tracker.competitor_id,
      resend_inbound_id: resendInboundId,
      from_email: parsedFrom.from_email,
      from_name: parsedFrom.from_name,
      subject: receivedEmail.subject ?? null,
      preview_text: plainText?.slice(0, 280) ?? null,
      html_body: htmlBody,
      plain_text: plainText,
      received_at: receivedAt,
      esp_detected: espDetected,
      ai_processed_at: null,
    })
    .select("id")
    .single();

  if (insertErr || !inserted) {
    return { ok: false, error: insertErr?.message ?? "Insert failed" };
  }

  if (args.runAnalysis === true) {
    try {
      await analyzeCompetitorEmail(inserted.id);
    } catch (err) {
      console.error("[ingest-inbound] analyze failed", err);
    }
  }

  return { ok: true, id: inserted.id, created: true };
}
