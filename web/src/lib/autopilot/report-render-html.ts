import type { ReportBranding } from "./types";
import type { ReportExecutiveSummary } from "./report-generate";
import type { ReportWorkspaceData } from "./report-aggregate";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderMonthlyReportHtml(params: {
  data: ReportWorkspaceData;
  summary: ReportExecutiveSummary;
  branding: ReportBranding;
  isAgency: boolean;
  generatedAt: string;
}): string {
  const { data, summary, branding, isAgency, generatedAt } = params;
  const accent = branding.accent_color?.trim() || "#2563EB";
  const agencyName = branding.agency_name?.trim();
  const logoUrl = branding.logo_url?.trim();
  const whiteLabel = isAgency && Boolean(agencyName || logoUrl);
  const hidePoweredBy = isAgency && branding.hide_powered_by === true;

  const title = whiteLabel
    ? `${agencyName ?? data.brandName} — competitor report`
    : `${data.brandName} — competitor report`;

  const headerLogo = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" alt="" width="120" style="display:block;max-height:48px;" />`
    : "";

  const competitorRows = data.competitors
    .map((c) => {
      const delta =
        c.activityScoreDelta != null
          ? `${c.activityScoreDelta >= 0 ? "+" : ""}${c.activityScoreDelta}`
          : "—";
      const platforms = Object.entries(c.newAdsByPlatform)
        .map(([p, n]) => `${p}: ${n}`)
        .join(", ") || "—";
      return `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #E5E7EB;font-size:13px;">${escapeHtml(c.name)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #E5E7EB;font-size:13px;text-align:center;">${c.activityScore ?? "—"}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #E5E7EB;font-size:13px;text-align:center;">${delta}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #E5E7EB;font-size:13px;text-align:center;">${c.newAdsCount}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #E5E7EB;font-size:12px;color:#4B5563;">${escapeHtml(platforms)}</td>
      </tr>`;
    })
    .join("");

  const focusList = summary.focusNextMonth
    .map((f) => `<li style="margin-bottom:6px;font-size:14px;line-height:1.5;color:#1F2937;">${escapeHtml(f)}</li>`)
    .join("");

  const poweredBy = hidePoweredBy
    ? ""
    : `<p style="margin:32px 0 0;font-size:11px;color:#9CA3AF;text-align:center;">powered by Rival</p>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#FFFFFF;font-family:Georgia,'Times New Roman',serif;color:#111827;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:800px;margin:0 auto;padding:40px 24px;">
    <tr>
      <td style="border-bottom:4px solid ${escapeHtml(accent)};padding-bottom:20px;margin-bottom:24px;">
        ${headerLogo}
        <h1 style="margin:${logoUrl ? "16px" : "0"} 0 4px;font-size:28px;font-weight:700;">${escapeHtml(whiteLabel ? (agencyName ?? data.brandName) : data.brandName)}</h1>
        <p style="margin:0;font-size:14px;color:#6B7280;">Competitor intelligence report · ${escapeHtml(data.periodLabel)}</p>
      </td>
    </tr>
    <tr><td style="padding-top:28px;">
      <h2 style="font-size:16px;text-transform:uppercase;letter-spacing:0.06em;color:#6B7280;margin:0 0 12px;">Executive summary</h2>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.65;color:#1F2937;">${escapeHtml(summary.executiveSummary)}</p>
      <h2 style="font-size:16px;text-transform:uppercase;letter-spacing:0.06em;color:#6B7280;margin:0 0 12px;">What to focus on next month</h2>
      <ul style="margin:0 0 32px;padding-left:20px;">${focusList}</ul>
      <h2 style="font-size:16px;text-transform:uppercase;letter-spacing:0.06em;color:#6B7280;margin:0 0 12px;">Competitor activity</h2>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:24px;">
        <thead>
          <tr style="background:#F9FAFB;">
            <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#6B7280;">Competitor</th>
            <th style="padding:8px 12px;text-align:center;font-size:11px;text-transform:uppercase;color:#6B7280;">Score</th>
            <th style="padding:8px 12px;text-align:center;font-size:11px;text-transform:uppercase;color:#6B7280;">Δ</th>
            <th style="padding:8px 12px;text-align:center;font-size:11px;text-transform:uppercase;color:#6B7280;">New ads</th>
            <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#6B7280;">By platform</th>
          </tr>
        </thead>
        <tbody>${competitorRows || '<tr><td colspan="5" style="padding:16px;color:#6B7280;">No competitors tracked for this workspace.</td></tr>'}</tbody>
      </table>
      <p style="margin:0;font-size:11px;color:#9CA3AF;">Generated ${escapeHtml(generatedAt)}</p>
      ${poweredBy}
    </td></tr>
  </table>
</body>
</html>`;
}

export function reportEmailPreviewBullets(summary: ReportExecutiveSummary): string[] {
  const bullets = [...summary.focusNextMonth];
  if (bullets.length < 3 && summary.executiveSummary) {
    bullets.unshift(summary.executiveSummary.slice(0, 120));
  }
  return bullets.slice(0, 3);
}
