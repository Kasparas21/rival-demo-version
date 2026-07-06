import { Resend } from "resend";

import { getResendApiKey, getResendFromEmail } from "@/lib/email/resend-config";
import { buildAutopilotUnsubscribeUrl } from "@/lib/autopilot/unsubscribe-token";
import { buildAutopilotSettingsUrl } from "@/lib/autopilot/watch-deep-links";
import type { WatchChannels } from "@/lib/autopilot/types";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function channelSummary(channels: WatchChannels, slackConfigured: boolean): string {
  const parts: string[] = [];
  if (channels.email) parts.push("email");
  if (channels.slack && slackConfigured) parts.push("Slack");
  return parts.length > 0 ? parts.join(" and ") : "your configured channels";
}

export function buildAutopilotEnabledEmailHtml(params: {
  settingsUrl: string;
  unsubscribeUrl: string;
  channelLine: string;
  scheduleLabel: string;
}): string {
  const { settingsUrl, unsubscribeUrl, channelLine, scheduleLabel } = params;
  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;padding:32px 16px;">
      <tr>
        <td align="center">
          <table width="100%" style="max-width:560px;background:#FFFFFF;border-radius:12px;border:1px solid #E5E7EB;padding:28px 24px;">
            <tr>
              <td>
                <h1 style="margin:0 0 8px;font-size:20px;color:#111827;">Autopilot is on</h1>
                <p style="margin:0 0 16px;font-size:14px;color:#4B5563;line-height:1.55;">
                  You're all set. Rival will watch your competitors and send meaningful move alerts with suggested next steps.
                </p>
                <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:10px;margin-bottom:20px;">
                  <tr>
                    <td style="padding:14px 16px;font-size:13px;color:#166534;line-height:1.5;">
                      <strong>Delivery:</strong> ${escapeHtml(channelLine)}<br/>
                      <strong>Schedule:</strong> ${escapeHtml(scheduleLabel)}
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 20px;font-size:13px;color:#6B7280;line-height:1.5;">
                  You can change sensitivity, channels, and quiet hours any time in settings.
                </p>
                <a href="${escapeHtml(settingsUrl)}" style="display:inline-block;background:#111827;color:#FFFFFF;font-size:14px;font-weight:600;text-decoration:none;padding:10px 16px;border-radius:8px;">Manage Autopilot</a>
                <p style="margin:24px 0 0;">
                  <a href="${escapeHtml(unsubscribeUrl)}" style="font-size:12px;color:#6B7280;text-decoration:underline;">Turn off Autopilot emails</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function buildAutopilotEnabledEmailText(params: {
  settingsUrl: string;
  unsubscribeUrl: string;
  channelLine: string;
  scheduleLabel: string;
}): string {
  return [
    "Autopilot is on",
    "",
    "Rival will watch your competitors and send meaningful move alerts with suggested next steps.",
    "",
    `Delivery: ${params.channelLine}`,
    `Schedule: ${params.scheduleLabel}`,
    "",
    `Manage Autopilot: ${params.settingsUrl}`,
    `Turn off Autopilot emails: ${params.unsubscribeUrl}`,
  ].join("\n");
}

export async function sendAutopilotEnabledEmail(params: {
  to: string;
  userId: string;
  channels: WatchChannels;
  slackWebhookConfigured: boolean;
  appOrigin?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const apiKey = getResendApiKey();
  if (!apiKey) {
    return { ok: false, error: "resend_not_configured" };
  }

  const appOrigin = params.appOrigin?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://spy-rival.com";
  const settingsUrl = buildAutopilotSettingsUrl(appOrigin);
  const unsubscribeUrl = buildAutopilotUnsubscribeUrl(params.userId, appOrigin);
  const scheduleLabel = "Daily at 07:15 UTC";
  const channelLine = channelSummary(params.channels, params.slackWebhookConfigured);

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: getResendFromEmail(),
    to: params.to,
    subject: "Autopilot is on — you're all set",
    html: buildAutopilotEnabledEmailHtml({ settingsUrl, unsubscribeUrl, channelLine, scheduleLabel }),
    text: buildAutopilotEnabledEmailText({ settingsUrl, unsubscribeUrl, channelLine, scheduleLabel }),
  });

  if (error) {
    return { ok: false, error: error.message ?? "resend_failed" };
  }
  return { ok: true };
}
