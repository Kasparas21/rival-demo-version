import { getResendFromEmail } from "@/lib/email/resend-config";

export type AlertDigestItem = {
  title: string;
  body: string | null;
  competitorName: string;
  severity: string;
  detectedAt: string;
};

export function buildAlertDigestEmailHtml(params: {
  alerts: AlertDigestItem[];
  dashboardUrl: string;
}): string {
  const { alerts, dashboardUrl } = params;
  const rows = alerts
    .map(
      (a) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;">
          <div style="font-size:14px;font-weight:600;color:#111827;margin-bottom:4px;">${escapeHtml(a.title)}</div>
          <div style="font-size:13px;color:#4b5563;line-height:1.5;">${escapeHtml(a.body ?? "")}</div>
          <div style="font-size:11px;color:#9ca3af;margin-top:6px;">${escapeHtml(a.competitorName)} · ${escapeHtml(a.severity)}</div>
        </td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
      <tr>
        <td align="center">
          <table width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;padding:28px 24px;">
            <tr>
              <td>
                <h1 style="margin:0 0 8px;font-size:20px;color:#111827;">New competitor activity</h1>
                <p style="margin:0 0 20px;font-size:14px;color:#4b5563;line-height:1.5;">
                  Significant changes we detected on your latest scrapes — flagged as soon as we detect them on the next refresh.
                </p>
                <table width="100%" cellpadding="0" cellspacing="0">${rows}</table>
                <p style="margin:24px 0 0;">
                  <a href="${escapeHtml(dashboardUrl)}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:10px 16px;border-radius:8px;">View alerts in Rival</a>
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

export function buildAlertDigestEmailText(params: {
  alerts: AlertDigestItem[];
  dashboardUrl: string;
}): string {
  const lines = params.alerts.map(
    (a) => `• ${a.title}\n  ${a.body ?? ""}\n  ${a.competitorName} (${a.severity})`
  );
  return [
    "New competitor activity",
    "",
    "Significant changes detected on your latest scrapes:",
    "",
    ...lines,
    "",
    `View alerts: ${params.dashboardUrl}`,
  ].join("\n");
}

export function getAlertDigestFromEmail(): string {
  return getResendFromEmail();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
