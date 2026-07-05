import type { WatchAlertBlock } from "./types";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function severityColor(severity: string): string {
  if (severity === "high") return "#DC2626";
  if (severity === "notable") return "#D97706";
  return "#6B7280";
}

function alertBlockHtml(block: WatchAlertBlock): string {
  const dot = severityColor(block.severity);
  return `
    <tr>
      <td style="padding:16px 0;border-bottom:1px solid #E5E7EB;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="12" valign="top" style="padding-top:4px;">
              <div style="width:8px;height:8px;border-radius:50%;background:${dot};"></div>
            </td>
            <td>
              <div style="font-size:11px;color:#6B7280;margin-bottom:4px;">${escapeHtml(block.competitorName)}${block.clientBrandName ? ` · for ${escapeHtml(block.clientBrandName)}` : ""}</div>
              <div style="font-size:15px;font-weight:600;color:#111827;margin-bottom:8px;line-height:1.35;">${escapeHtml(block.headline)}</div>
              <div style="font-size:13px;color:#374151;line-height:1.55;margin-bottom:12px;">${escapeHtml(block.context)}</div>
              <div style="background:#F3F4F6;border-left:3px solid #2563EB;padding:10px 12px;border-radius:0 6px 6px 0;margin-bottom:12px;">
                <div style="font-size:11px;font-weight:600;color:#374151;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:4px;">Your move</div>
                <div style="font-size:13px;color:#1F2937;line-height:1.5;">${escapeHtml(block.recommendation)}</div>
              </div>
              <a href="${escapeHtml(block.investigateUrl)}" style="font-size:13px;font-weight:600;color:#2563EB;text-decoration:none;">Investigate in Rival →</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

export function watchEmailSubject(blocks: WatchAlertBlock[], overflowCount: number): string {
  if (blocks.length === 1 && overflowCount === 0) {
    return `⚡ ${blocks[0]!.competitorName}: ${blocks[0]!.headline}`;
  }
  const n = blocks.length + overflowCount;
  return `⚡ ${n} competitor moves need your attention`;
}

export function buildWatchEmailHtml(params: {
  blocks: WatchAlertBlock[];
  overflowCount: number;
  settingsUrl: string;
  unsubscribeUrl: string;
}): string {
  const { blocks, overflowCount, settingsUrl, unsubscribeUrl } = params;
  const rows = blocks.map(alertBlockHtml).join("");
  const overflow =
    overflowCount > 0
      ? `<tr><td style="padding:12px 0;font-size:13px;color:#6B7280;">+${overflowCount} more in Rival</td></tr>`
      : "";

  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;padding:32px 16px;">
      <tr>
        <td align="center">
          <table width="100%" style="max-width:560px;background:#FFFFFF;border-radius:12px;border:1px solid #E5E7EB;padding:28px 24px;">
            <tr>
              <td>
                <h1 style="margin:0 0 8px;font-size:20px;color:#111827;">Autopilot watch</h1>
                <p style="margin:0 0 20px;font-size:14px;color:#4B5563;line-height:1.5;">
                  Meaningful competitor moves with a suggested next step.
                </p>
                <table width="100%" cellpadding="0" cellspacing="0">${rows}${overflow}</table>
                <p style="margin:24px 0 0;">
                  <a href="${escapeHtml(settingsUrl)}" style="font-size:12px;color:#6B7280;text-decoration:underline;">Manage autopilot</a>
                  &nbsp;·&nbsp;
                  <a href="${escapeHtml(unsubscribeUrl)}" style="font-size:12px;color:#6B7280;text-decoration:underline;">Turn off autopilot emails</a>
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

export function buildWatchEmailText(params: {
  blocks: WatchAlertBlock[];
  overflowCount: number;
  settingsUrl: string;
  unsubscribeUrl: string;
}): string {
  const lines = params.blocks.map(
    (b) =>
      `${b.competitorName}${b.clientBrandName ? ` (for ${b.clientBrandName})` : ""}: ${b.headline}\n${b.context}\nYour move: ${b.recommendation}\n${b.investigateUrl}`,
  );
  if (params.overflowCount > 0) {
    lines.push(`+${params.overflowCount} more in Rival`);
  }
  return [
    "Autopilot watch",
    "",
    ...lines,
    "",
    `Manage: ${params.settingsUrl}`,
    `Unsubscribe: ${params.unsubscribeUrl}`,
  ].join("\n");
}
