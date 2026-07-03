import { getResendFromEmail } from "@/lib/email/resend-config";
import { Resend } from "resend";

import { markdownToHtml } from "./markdown-to-html";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildAgentIntelEmailHtml(params: {
  bodyMarkdown: string;
  screenshotUrls: string[];
  settingsUrl: string;
}): string {
  const { bodyMarkdown, screenshotUrls, settingsUrl } = params;
  const imagesHtml = screenshotUrls
    .slice(0, 3)
    .map(
      (url) =>
        `<img src="${escapeHtml(url)}" alt="Competitor creative" style="max-width:100%;border-radius:8px;margin:12px 0;" />`,
    )
    .join("");

  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
      <tr>
        <td align="center">
          <table width="100%" style="max-width:640px;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;padding:32px 24px;">
            <tr>
              <td style="font-family:sans-serif;color:#1a1a2e;">
                ${markdownToHtml(bodyMarkdown)}
                ${imagesHtml}
                <hr style="border:none;border-top:1px solid #eee;margin:32px 0;" />
                <p style="color:#999;font-size:12px;line-height:1.5;margin:0;">
                  You're receiving this because Rival detected a high-signal move from one of your tracked competitors.
                  <a href="${escapeHtml(settingsUrl)}" style="color:#6366f1;">Manage alerts</a>
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

export function getAgentIntelFromEmail(): string {
  const base = getResendFromEmail();
  if (base.includes("Rival Intel")) return base;
  const match = base.match(/^(.+)<(.+)>$/);
  if (match) return `Rival Intel <${match[2]}>`;
  return `Rival Intel <${base}>`;
}

export async function deliverAgentEmail(params: {
  apiKey: string;
  to: string;
  subject: string;
  bodyMarkdown: string;
  screenshotUrls: string[];
  settingsUrl: string;
}): Promise<boolean> {
  const resend = new Resend(params.apiKey);
  const html = buildAgentIntelEmailHtml({
    bodyMarkdown: params.bodyMarkdown,
    screenshotUrls: params.screenshotUrls,
    settingsUrl: params.settingsUrl,
  });

  const { error } = await resend.emails.send({
    from: getAgentIntelFromEmail(),
    to: params.to,
    subject: params.subject,
    html,
  });

  if (error) {
    console.error("[rival-agent] email delivery failed", error);
    return false;
  }

  return true;
}
