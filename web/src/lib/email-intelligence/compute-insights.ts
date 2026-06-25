import type {
  EmailMarketingInsights,
  EmailMarketingInsightsOffer,
  EmailRowForInsights,
} from "./types";

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

const EMOJI_RE = /\p{Extended_Pictographic}/u;

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function parseOffersFromRow(raw: unknown): Array<{ type: string; value: string; code: string | null }> {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (o): o is { type: string; value: string; code: string | null } =>
      typeof o === "object" &&
      o !== null &&
      typeof (o as { type?: unknown }).type === "string" &&
      typeof (o as { value?: unknown }).value === "string",
  );
}

function countByKey(values: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const v of values) {
    counts[v] = (counts[v] ?? 0) + 1;
  }
  return counts;
}

function modeKey(counts: Record<string, number>): string | null {
  const entries = Object.entries(counts);
  if (!entries.length) return null;
  entries.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return entries[0]?.[0] ?? null;
}

function avgDaysBetween(dates: number[]): number | null {
  if (dates.length < 2) return null;
  const sorted = [...dates].sort((a, b) => a - b);
  let totalGap = 0;
  for (let i = 1; i < sorted.length; i++) {
    totalGap += sorted[i]! - sorted[i - 1]!;
  }
  return round1(totalGap / (sorted.length - 1) / 86_400_000);
}

function mostActiveDayName(emails: EmailRowForInsights[]): string {
  const buckets = new Array(7).fill(0) as number[];
  for (const row of emails) {
    const t = Date.parse(row.received_at);
    if (Number.isNaN(t)) continue;
    buckets[new Date(t).getUTCDay()]! += 1;
  }
  let bestIdx = 0;
  for (let i = 1; i < 7; i++) {
    if (buckets[i]! > buckets[bestIdx]!) bestIdx = i;
  }
  return DAY_NAMES[bestIdx] ?? "Monday";
}

function resolveEspDetected(emails: EmailRowForInsights[]): string | null {
  const known = emails
    .map((e) => e.esp_detected?.trim())
    .filter((v): v is string => Boolean(v && v.toLowerCase() !== "unknown"));
  if (known.length) return modeKey(countByKey(known));
  const all = emails.map((e) => e.esp_detected?.trim()).filter((v): v is string => Boolean(v));
  return modeKey(countByKey(all));
}

export function computeEmailInsights(emails: EmailRowForInsights[]): EmailMarketingInsights {
  const total_emails = emails.length;
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 86_400_000;

  const recentCount = emails.filter((e) => {
    const t = Date.parse(e.received_at);
    return !Number.isNaN(t) && t >= thirtyDaysAgo;
  }).length;
  const emails_per_week = round1(recentCount / (30 / 7));

  const most_active_day = total_emails > 0 ? mostActiveDayName(emails) : "Monday";

  const receivedTimes = emails
    .map((e) => Date.parse(e.received_at))
    .filter((t) => !Number.isNaN(t));
  const avg_days_between_emails = avgDaysBetween(receivedTimes) ?? 0;

  const emailTypes = emails
    .map((e) => e.email_type?.trim())
    .filter((v): v is string => Boolean(v));
  const type_breakdown = countByKey(emailTypes);
  const most_common_type = modeKey(type_breakdown) ?? "other";

  const offerEmails = emails.filter((e) => parseOffersFromRow(e.ai_offers).length > 0);
  const total_emails_with_offers = offerEmails.length;

  const offerEmailTimes = offerEmails
    .map((e) => Date.parse(e.received_at))
    .filter((t) => !Number.isNaN(t));
  const offer_frequency_days = avgDaysBetween(offerEmailTimes);

  const all_offers: EmailMarketingInsightsOffer[] = [];
  const offerTypeCounts: Record<string, number> = {};
  for (const row of emails) {
    for (const offer of parseOffersFromRow(row.ai_offers)) {
      all_offers.push({
        email_id: row.id,
        value: offer.value,
        code: offer.code ?? null,
        type: offer.type,
        received_at: row.received_at,
      });
      offerTypeCounts[offer.type] = (offerTypeCounts[offer.type] ?? 0) + 1;
    }
  }
  all_offers.sort((a, b) => Date.parse(b.received_at) - Date.parse(a.received_at));
  const most_common_offer_type = modeKey(offerTypeCounts);

  const subjects = emails.map((e) => e.subject ?? "");
  const avg_subject_length =
    total_emails > 0
      ? round1(subjects.reduce((sum, s) => sum + s.trim().length, 0) / total_emails)
      : 0;

  const withEmoji = subjects.filter((s) => EMOJI_RE.test(s)).length;
  const emoji_usage_percent =
    total_emails > 0 ? Math.round((withEmoji / total_emails) * 100) : 0;

  const subject_lines = emails
    .map((e) => ({
      email_id: e.id,
      subject: e.subject?.trim() || "(no subject)",
      received_at: e.received_at,
      email_type: e.email_type?.trim() || "other",
    }))
    .sort((a, b) => Date.parse(b.received_at) - Date.parse(a.received_at));

  const angles = emails.map((e) => e.ai_angle?.trim()).filter((v): v is string => Boolean(v));
  const angle_breakdown = countByKey(angles);
  const most_common_angle = modeKey(angle_breakdown);

  const esp_detected = resolveEspDetected(emails);

  return {
    total_emails,
    emails_per_week,
    most_active_day,
    avg_days_between_emails,
    type_breakdown,
    most_common_type,
    total_emails_with_offers,
    offer_frequency_days,
    most_common_offer_type,
    all_offers,
    avg_subject_length,
    emoji_usage_percent,
    subject_lines,
    angle_breakdown,
    most_common_angle,
    esp_detected,
  };
}
