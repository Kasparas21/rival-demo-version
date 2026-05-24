import type { WeeklyDigestEmailInput } from "@/lib/digest/weekly-digest-types";
import { getResendFromEmail } from "@/lib/email/resend-config";

/** Brand accent — used on header strip, stats, active platforms, activity bars. */
export const WEEKLY_DIGEST_BRAND_ACCENT = "#2563EB";

/** Hosted absolute HTTPS logo URL — replace with your CDN/asset URL. */
export const WEEKLY_DIGEST_LOGO_URL = "";

/** Sample payload for preview / QA (no real user data). */
export const WEEKLY_DIGEST_EMAIL_SAMPLE: WeeklyDigestEmailInput = {
  userName: "Alex",
  dateRange: "May 17 – May 24, 2026",
  headlineStats: [
    { value: "3", label: "Competitors active" },
    { value: "26", label: "New ads this week" },
    { value: "1", label: "Entered a new platform" },
    { value: "+37", label: "Biggest activity jump" },
  ],
  summaryTakeaway:
    "Acme is scaling aggressively — new platform plus activity nearly doubled. This is the one to watch.",
  competitors: [
    {
      name: "Acme Corp",
      heroStat: { value: "+37", label: "Activity score jump (41 → 78)" },
      platforms: [
        { id: "meta", label: "Meta", active: true },
        { id: "google", label: "Google", active: true },
        { id: "tiktok", label: "TikTok", active: true },
        { id: "linkedin", label: "LinkedIn", active: false },
        { id: "pinterest", label: "Pinterest", active: false },
        { id: "snapchat", label: "Snapchat", active: false },
      ],
      activityBar: { score: 78, label: "Activity score" },
      changes: [
        "Entered TikTok with 14 active ads",
        "New angle: “0% financing for 36 months”",
      ],
      url: "https://www.spy-rival.com/dashboard/competitor/acme.com?tab=insights&sub=alerts",
    },
    {
      name: "Northwind Health",
      heroStat: { value: "11", label: "New ads this week" },
      platforms: [
        { id: "meta", label: "Meta", active: true },
        { id: "google", label: "Google", active: true },
        { id: "tiktok", label: "TikTok", active: false },
        { id: "linkedin", label: "LinkedIn", active: true },
        { id: "pinterest", label: "Pinterest", active: false },
        { id: "snapchat", label: "Snapchat", active: false },
      ],
      activityBar: { score: 52, label: "Activity score" },
      changes: ["Left Pinterest (previously 6 active ads)"],
      url: "https://www.spy-rival.com/dashboard/competitor/northwindhealth.com?tab=insights&sub=alerts",
    },
    {
      name: "Globex",
      heroStat: { value: "34", label: "Days a winning ad has run" },
      platforms: [
        { id: "meta", label: "Meta", active: true },
        { id: "google", label: "Google", active: false },
        { id: "tiktok", label: "TikTok", active: false },
        { id: "linkedin", label: "LinkedIn", active: false },
        { id: "pinterest", label: "Pinterest", active: false },
        { id: "snapchat", label: "Snapchat", active: false },
      ],
      activityBar: { score: 41, label: "Activity score" },
      changes: ["Proven winner still running on Meta"],
      url: "https://www.spy-rival.com/dashboard/competitor/globex.com?tab=insights&sub=alerts",
    },
  ],
  actionItems: [
    "Check Acme's new TikTok ads — they just entered the platform.",
    "Study Globex's 34-day winner in Copy Vault.",
    "Review Northwind's 11-ad creative push before your next test.",
  ],
  unsubscribeUrl: "https://www.spy-rival.com/api/digest/unsubscribe?token=preview-sample",
  appOrigin: "https://www.spy-rival.com",
};

const FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const ACCENT = WEEKLY_DIGEST_BRAND_ACCENT;
const TEXT = "#0A0A0A";
const TEXT_SECONDARY = "#6B7280";
const TEXT_MUTED = "#9CA3AF";
const BORDER = "#E5E7EB";
const BG = "#FAFAFA";
const CARD_BG = "#FFFFFF";
const BTN_BG = "#0A0A0A";
const TRACK_BG = "#E5E7EB";

export function getWeeklyDigestFromEmail(): string {
  return getResendFromEmail();
}

export function weeklyDigestSubject(competitorCount: number): string {
  if (competitorCount <= 0) return "This week: what your competitors changed";
  if (competitorCount === 1) return "This week: 1 competitor changed strategy";
  return `This week: ${competitorCount} competitors changed strategy`;
}

export function buildWeeklyDigestEmailHtml(input: WeeklyDigestEmailInput): string {
  const {
    userName,
    dateRange,
    headlineStats,
    summaryTakeaway,
    competitors,
    actionItems,
    unsubscribeUrl,
    appOrigin,
  } = input;
  const dashboardUrl = `${appOrigin.replace(/\/$/, "")}/dashboard/spy?tab=alerts`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>This week in your competitors</title>
</head>
<body style="margin:0;padding:0;background-color:${BG};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BG};">
    <tr>
      <td align="center" style="padding:0 16px 40px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
          ${brandHeaderBar()}
          <tr>
            <td style="padding:28px 0 8px 0;font-family:${FONT};font-size:28px;line-height:34px;font-weight:600;color:${TEXT};">This week in your competitors</td>
          </tr>
          <tr>
            <td style="padding:0 0 6px 0;font-family:${FONT};font-size:15px;line-height:22px;color:${TEXT_SECONDARY};">${escapeHtml(dateRange)}</td>
          </tr>
          <tr>
            <td style="padding:0 0 28px 0;font-family:${FONT};font-size:15px;line-height:22px;color:${TEXT_SECONDARY};">Hi ${escapeHtml(userName)}, here&apos;s the signal from the brands you track.</td>
          </tr>
          ${renderHeadlineStatsRow(headlineStats)}
          ${renderHookTakeaway(summaryTakeaway)}
          ${competitors.map((c) => renderCompetitorCard(c)).join("")}
          ${renderActionSection(actionItems, dashboardUrl)}
          <tr>
            <td style="border-top:1px solid ${BORDER};padding:28px 0 0 0;font-family:${FONT};font-size:12px;line-height:18px;color:${TEXT_SECONDARY};">
              You&apos;re receiving this because you track competitors on Rival.
              <br /><br />
              <a href="${escapeHtml(unsubscribeUrl)}" style="color:${ACCENT};text-decoration:underline;">Unsubscribe from weekly digest</a>
              <br /><br />
              Spy Rival · spy-rival.com
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function brandHeaderBar(): string {
  const logoUrl = WEEKLY_DIGEST_LOGO_URL.trim();
  const logoCell = logoUrl
    ? `<td style="vertical-align:middle;padding:0 10px 0 0;">
        <img src="${escapeHtml(logoUrl)}" width="32" height="32" alt="Rival" style="display:block;width:32px;height:32px;border:0;outline:none;text-decoration:none;" />
      </td>`
    : "";

  return `
  <tr>
    <td style="padding:16px 0 0 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${ACCENT};border-radius:10px 10px 0 0;">
        <tr>
          <td style="padding:14px 18px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                ${logoCell}
                <td style="vertical-align:middle;font-family:${FONT};font-size:15px;line-height:20px;font-weight:700;letter-spacing:0.06em;color:#FFFFFF;">Rival</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

function renderHeadlineStatsRow(stats: WeeklyDigestEmailInput["headlineStats"]): string {
  if (!stats.length) return "";

  const cells = stats
    .map(
      (s) => `
      <td align="center" style="vertical-align:top;width:${Math.floor(100 / stats.length)}%;padding:0 6px;">
        <div style="font-family:${FONT};font-size:36px;line-height:40px;font-weight:700;color:${ACCENT};letter-spacing:-0.02em;">${escapeHtml(s.value)}</div>
        <div style="font-family:${FONT};font-size:11px;line-height:16px;color:${TEXT_SECONDARY};padding-top:6px;">${escapeHtml(s.label)}</div>
      </td>`
    )
    .join("");

  return `
  <tr>
    <td style="padding:0 0 20px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${BORDER};border-radius:12px;background-color:${CARD_BG};">
        <tr>
          <td style="padding:22px 12px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>${cells}</tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

function renderHookTakeaway(takeaway: string): string {
  if (!takeaway.trim()) return "";
  return `
  <tr>
    <td style="padding:0 0 28px 0;font-family:${FONT};font-size:17px;line-height:26px;font-weight:600;color:${TEXT};">${escapeHtml(takeaway)}</td>
  </tr>`;
}

function renderPlatformRow(platforms: WeeklyDigestEmailInput["competitors"][number]["platforms"]): string {
  const chips = platforms
    .map((p) => {
      if (p.active) {
        return `<td style="padding:0 6px 6px 0;vertical-align:top;">
          <span style="display:inline-block;font-family:${FONT};font-size:11px;line-height:16px;font-weight:600;color:#FFFFFF;background-color:${ACCENT};padding:4px 8px;border-radius:4px;">${escapeHtml(p.label)}</span>
        </td>`;
      }
      return `<td style="padding:0 6px 6px 0;vertical-align:top;">
          <span style="display:inline-block;font-family:${FONT};font-size:11px;line-height:16px;font-weight:500;color:${TEXT_MUTED};background-color:#F3F4F6;padding:4px 8px;border-radius:4px;">${escapeHtml(p.label)}</span>
        </td>`;
    })
    .join("");

  return `
  <tr>
    <td style="padding:0 0 18px 0;">
      <div style="font-family:${FONT};font-size:11px;line-height:16px;letter-spacing:0.08em;text-transform:uppercase;color:${ACCENT};font-weight:600;padding:0 0 8px 0;">Where they advertise</div>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>${chips}</tr></table>
    </td>
  </tr>`;
}

function renderCompetitorCard(c: WeeklyDigestEmailInput["competitors"][number]): string {
  const changeRows =
    c.changes.length > 0
      ? c.changes
          .map(
            (change) => `
          <tr>
            <td style="padding:0 0 8px 0;vertical-align:top;width:16px;font-family:${FONT};font-size:14px;line-height:21px;color:${TEXT_SECONDARY};">•</td>
            <td style="padding:0 0 8px 0;font-family:${FONT};font-size:14px;line-height:21px;color:${TEXT};">${escapeHtml(change)}</td>
          </tr>`
          )
          .join("")
      : "";

  const bulletsBlock = changeRows
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${changeRows}</table>`
    : "";

  return `
  <tr>
    <td style="padding:0 0 24px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${BORDER};border-radius:12px;background-color:${CARD_BG};">
        <tr>
          <td style="padding:28px 24px 24px 24px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-family:${FONT};font-size:11px;line-height:16px;letter-spacing:0.08em;text-transform:uppercase;color:${ACCENT};font-weight:600;padding:0 0 8px 0;">Competitor</td>
              </tr>
              <tr>
                <td style="font-family:${FONT};font-size:24px;line-height:30px;font-weight:600;color:${TEXT};padding:0 0 16px 0;">${escapeHtml(c.name)}</td>
              </tr>
              ${renderPlatformRow(c.platforms)}
              <tr>
                <td style="padding:0 0 16px 0;">
                  <div style="font-family:${FONT};font-size:40px;line-height:44px;font-weight:700;color:${ACCENT};letter-spacing:-0.02em;">${escapeHtml(c.heroStat.value)}</div>
                  <div style="font-family:${FONT};font-size:13px;line-height:20px;color:${TEXT_SECONDARY};padding-top:6px;">${escapeHtml(c.heroStat.label)}</div>
                </td>
              </tr>
              <tr><td>${renderActivityBarInner(c.activityBar)}</td></tr>
              ${
                bulletsBlock
                  ? `<tr><td style="padding:16px 0 0 0;">${bulletsBlock}</td></tr>`
                  : ""
              }
              <tr>
                <td style="padding:22px 0 0 0;">
                  ${bulletproofButton("View in Rival", c.url)}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

function renderActivityBarInner(bar: WeeklyDigestEmailInput["competitors"][number]["activityBar"]): string {
  const pct = Math.max(4, Math.min(100, bar.score));
  const remainder = 100 - pct;
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="font-family:${FONT};font-size:12px;line-height:16px;color:${TEXT_SECONDARY};">${escapeHtml(bar.label)}</td>
        <td align="right" style="font-family:${FONT};font-size:14px;line-height:18px;font-weight:700;color:${TEXT};">${bar.score}</td>
      </tr>
      <tr>
        <td colspan="2" style="padding-top:8px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-radius:6px;background-color:${TRACK_BG};">
            <tr>
              <td width="${pct}%" style="background-color:${ACCENT};border-radius:6px;height:10px;font-size:1px;line-height:10px;mso-line-height-rule:exactly;">&nbsp;</td>
              <td width="${remainder}%" style="height:10px;font-size:1px;line-height:10px;">&nbsp;</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`;
}

function renderActionSection(actionItems: string[], dashboardUrl: string): string {
  if (actionItems.length === 0) {
    return `
    <tr>
      <td style="padding:0 0 28px 0;">
        ${sectionLabel("What to do this week")}
        ${bulletproofButton("Open your dashboard", dashboardUrl)}
      </td>
    </tr>`;
  }

  const rows = actionItems
    .map(
      (item) => `
      <tr>
        <td style="padding:0 0 10px 0;vertical-align:top;width:18px;font-family:${FONT};font-size:15px;line-height:22px;color:${TEXT};">→</td>
        <td style="padding:0 0 10px 0;font-family:${FONT};font-size:15px;line-height:22px;color:${TEXT};">${escapeHtml(item)}</td>
      </tr>`
    )
    .join("");

  return `
  <tr>
    <td style="padding:0 0 28px 0;">
      ${sectionLabel("What to do this week")}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${BORDER};border-radius:12px;background-color:${CARD_BG};">
        <tr>
          <td style="padding:20px 22px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-top:18px;">${bulletproofButton("Open your dashboard", dashboardUrl)}</td></tr></table>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

function sectionLabel(title: string): string {
  return `<div style="font-family:${FONT};font-size:11px;line-height:16px;letter-spacing:0.1em;text-transform:uppercase;color:${ACCENT};font-weight:600;padding:0 0 12px 0;">${escapeHtml(title)}</div>`;
}

export function buildWeeklyDigestEmailText(input: WeeklyDigestEmailInput): string {
  const {
    userName,
    dateRange,
    headlineStats,
    summaryTakeaway,
    competitors,
    actionItems,
    unsubscribeUrl,
    appOrigin,
  } = input;
  const dashboardUrl = `${appOrigin.replace(/\/$/, "")}/dashboard/spy?tab=alerts`;

  const headline = headlineStats.map((s) => `${s.value} ${s.label}`).join(" · ");

  const blocks = competitors.map((c) => {
    const activePl = c.platforms
      .filter((p) => p.active)
      .map((p) => p.label)
      .join(", ");
    const hero = `${c.heroStat.value} — ${c.heroStat.label}`;
    const bar = `${c.activityBar.label}: ${c.activityBar.score}/100`;
    const bullets = c.changes.length > 0 ? c.changes.map((ch) => `  • ${ch}`).join("\n") : "";
    return [
      c.name,
      activePl ? `  Platforms: ${activePl}` : "",
      `  ${hero}`,
      `  ${bar}`,
      bullets,
      `  → ${c.url}`,
    ]
      .filter(Boolean)
      .join("\n");
  });

  return [
    "Rival — This week in your competitors",
    dateRange,
    "",
    `Hi ${userName},`,
    "",
    headline,
    summaryTakeaway,
    "",
    ...blocks,
    "",
    "What to do this week:",
    ...actionItems.map((a) => `→ ${a}`),
    "",
    `Open dashboard: ${dashboardUrl}`,
    "",
    `Unsubscribe: ${unsubscribeUrl}`,
    "",
    "Spy Rival · spy-rival.com",
  ]
    .filter((line, i, arr) => !(line === "" && arr[i - 1] === ""))
    .join("\n");
}

function bulletproofButton(label: string, href: string): string {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" bgcolor="${BTN_BG}" style="border-radius:8px;background-color:${BTN_BG};">
        <a href="${escapeHtml(href)}" target="_blank" style="display:inline-block;padding:13px 24px;font-family:${FONT};font-size:14px;line-height:18px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:8px;background-color:${BTN_BG};">${escapeHtml(label)}</a>
      </td>
    </tr>
  </table>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function weeklyDigestPayloadToEmailInput(
  payload: import("@/lib/digest/weekly-digest-types").WeeklyDigestPayload,
  appOrigin: string
): WeeklyDigestEmailInput {
  return {
    userName: payload.userName,
    dateRange: payload.dateRange.label,
    headlineStats: payload.headlineStats,
    summaryTakeaway: payload.summaryTakeaway,
    competitors: payload.competitors.map((c) => ({
      name: c.name,
      changes: c.changes,
      url: c.url,
      heroStat: c.heroStat,
      platforms: c.platforms,
      activityBar: c.activityBar,
    })),
    actionItems: payload.actionItems,
    unsubscribeUrl: payload.unsubscribeUrl,
    appOrigin,
  };
}
