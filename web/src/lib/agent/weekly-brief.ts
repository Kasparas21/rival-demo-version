import type { SupabaseClient } from "@supabase/supabase-js";

import { deliverAgentEmail } from "@/lib/agent/delivery/email";
import { generateWeeklyBriefMessage } from "@/lib/agent/generate-message";
import { getOrCreateAgentSettings, parseAgentChannels } from "@/lib/agent/settings";
import { getResendApiKey } from "@/lib/email/resend-config";
import type { Database } from "@/lib/supabase/types";

/**
 * @deprecated Superseded by autopilot Phase 3 Auto-Brief (`autopilot_settings.brief_enabled`).
 */
export async function sendWeeklyBriefForUser(
  admin: SupabaseClient<Database>,
  userId: string,
): Promise<{ sent: boolean; reason?: string }> {
  const settings = await getOrCreateAgentSettings(admin, userId);
  if (!settings.enabled || !settings.weekly_brief_enabled) {
    return { sent: false, reason: "disabled" };
  }

  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const { data: signals } = await admin
    .from("agent_signals")
    .select("*")
    .eq("user_id", userId)
    .gte("created_at", since)
    .order("threat_score", { ascending: false });

  if (!signals?.length) {
    return { sent: false, reason: "empty" };
  }

  const channels = parseAgentChannels(settings.channels);
  const emailEnabled = channels.email?.enabled ?? false;
  if (!emailEnabled) {
    return { sent: false, reason: "email_disabled" };
  }

  const { data: profile } = await admin.from("profiles").select("email").eq("id", userId).maybeSingle();
  const userEmail = profile?.email?.trim();
  if (!userEmail) {
    return { sent: false, reason: "no_email" };
  }

  const apiKey = getResendApiKey();
  if (!apiKey) {
    return { sent: false, reason: "resend_not_configured" };
  }

  const message = await generateWeeklyBriefMessage({ signals });
  if (!message) {
    return { sent: false, reason: "generation_failed" };
  }

  const appOrigin = process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://spy-rival.com";
  const settingsUrl = `${appOrigin.replace(/\/$/, "")}/dashboard/settings`;

  const ok = await deliverAgentEmail({
    apiKey,
    to: userEmail,
    subject: message.subject,
    bodyMarkdown: message.body_markdown,
    screenshotUrls: [],
    settingsUrl,
  });

  if (!ok) return { sent: false, reason: "delivery_failed" };

  await admin.from("agent_messages").insert({
    user_id: userId,
    competitor_id: null,
    signal_ids: signals.map((s) => s.id),
    channels_delivered: ["email"],
    subject: message.subject,
    body_markdown: message.body_markdown,
    body_html: message.body_html,
    status: "sent",
  });

  return { sent: true };
}
