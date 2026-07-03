import type { SupabaseClient } from "@supabase/supabase-js";

import { attachVisualsToSignals, extractVisualUrlsFromSignal } from "@/lib/agent/attach-visuals";
import { deliverAgentEmail } from "@/lib/agent/delivery/email";
import { deliverDiscord } from "@/lib/agent/delivery/discord";
import { deliverSlack } from "@/lib/agent/delivery/slack";
import { generateAgentMessage } from "@/lib/agent/generate-message";
import {
  getOrCreateAgentSettings,
  hasRecentAgentMessage,
  isAgentDailyLimitReached,
  parseAgentChannels,
} from "@/lib/agent/settings";
import type { DetectedAgentSignal } from "@/lib/agent/types";
import { getResendApiKey } from "@/lib/email/resend-config";
import type { Database } from "@/lib/supabase/types";

export async function deliverAgentMessage(params: {
  admin: SupabaseClient<Database>;
  userId: string;
  competitorId: string | null;
  competitorName: string;
  brandContext: string | null;
  userEmail: string | null;
  signals: Array<DetectedAgentSignal & { id?: string }>;
  isCrossCompetitor?: boolean;
  skipDuplicateCheck?: boolean;
}): Promise<boolean> {
  const {
    admin,
    userId,
    competitorId,
    competitorName,
    brandContext,
    userEmail,
    signals,
    isCrossCompetitor,
    skipDuplicateCheck = false,
  } = params;

  const settings = await getOrCreateAgentSettings(admin, userId);
  if (!settings.enabled) {
    console.log("[rival-agent] skipped: agent disabled", userId);
    return false;
  }

  const filtered = signals.filter((s) => s.threat_score >= settings.min_threat_score);
  if (filtered.length === 0) {
    console.log("[rival-agent] skipped: no signals above threshold", userId);
    return false;
  }

  if (!skipDuplicateCheck && (await hasRecentAgentMessage(admin, userId, competitorId))) {
    console.log("[rival-agent] skipped: recent message exists", userId, competitorId);
    return false;
  }

  if (await isAgentDailyLimitReached(admin, userId)) {
    console.log("[rival-agent] skipped: daily limit reached", userId);
    return false;
  }

  const signalsWithIds = filtered.filter((s): s is DetectedAgentSignal & { id: string } => Boolean(s.id));
  const screenshotUrls =
    signalsWithIds.length > 0
      ? await attachVisualsToSignals(admin, signalsWithIds)
      : filtered.flatMap((s) => extractVisualUrlsFromSignal(s));

  const message = await generateAgentMessage({
    competitorName,
    brandContext,
    signals: filtered,
    isCrossCompetitor,
  });

  if (!message) return false;

  const channels = parseAgentChannels(settings.channels);
  const channelsDelivered: string[] = [];
  let anySuccess = false;
  let status: "sent" | "failed" = "sent";

  const appOrigin = process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://spy-rival.com";
  const settingsUrl = `${appOrigin.replace(/\/$/, "")}/dashboard/settings`;

  try {
    if (channels.slack?.enabled && channels.slack.webhook_url?.trim()) {
      const ok = await deliverSlack(channels.slack.webhook_url, message.body_markdown, screenshotUrls);
      if (ok) {
        channelsDelivered.push("slack");
        anySuccess = true;
      }
    }

    if (channels.discord?.enabled && channels.discord.webhook_url?.trim()) {
      const ok = await deliverDiscord(channels.discord.webhook_url, message.body_markdown, screenshotUrls);
      if (ok) {
        channelsDelivered.push("discord");
        anySuccess = true;
      }
    }

    if (channels.email?.enabled && userEmail?.trim()) {
      const apiKey = getResendApiKey();
      if (apiKey) {
        const ok = await deliverAgentEmail({
          apiKey,
          to: userEmail.trim(),
          subject: message.subject,
          bodyMarkdown: message.body_markdown,
          screenshotUrls,
          settingsUrl,
        });
        if (ok) {
          channelsDelivered.push("email");
          anySuccess = true;
        }
      }
    }
  } catch (err) {
    status = "failed";
    console.error("[rival-agent] delivery error", userId, err);
  }

  if (channelsDelivered.length === 0) {
    console.log("[rival-agent] skipped: no channels delivered", userId);
    return false;
  }

  if (!anySuccess) status = "failed";

  const signalIds = filtered.map((s) => s.id).filter(Boolean) as string[];

  await admin.from("agent_messages").insert({
    user_id: userId,
    competitor_id: competitorId,
    signal_ids: signalIds,
    channels_delivered: channelsDelivered,
    subject: message.subject,
    body_markdown: message.body_markdown,
    body_html: message.body_html,
    status,
  });

  if (signalIds.length > 0) {
    await admin
      .from("agent_signals")
      .update({ delivered: true, delivered_at: new Date().toISOString() })
      .in("id", signalIds);
  }

  return anySuccess;
}
