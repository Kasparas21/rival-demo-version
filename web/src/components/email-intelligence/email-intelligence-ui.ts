import type { CompetitorEmailRow } from "@/lib/email-intelligence/types";

export type OfferChip = {
  type: string;
  value: string;
  code: string | null;
};

export function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffSec = Math.round((then - Date.now()) / 1000);
  const abs = Math.abs(diffSec);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  if (abs < 60) return rtf.format(diffSec, "second");
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), "hour");
  return rtf.format(Math.round(diffSec / 86400), "day");
}

export const EMAIL_TYPE_FILTER_ALL = "all" as const;
export const EMAIL_TYPE_FILTER_UNCLASSIFIED = "unclassified" as const;

export const EMAIL_TYPE_OPTIONS = [
  "promotional",
  "nurture",
  "newsletter",
  "cart_abandonment",
  "reengagement",
  "transactional",
  "other",
] as const;

export type EmailTypeFilter =
  | typeof EMAIL_TYPE_FILTER_ALL
  | typeof EMAIL_TYPE_FILTER_UNCLASSIFIED
  | (typeof EMAIL_TYPE_OPTIONS)[number];

export function formatEmailType(type: string | null): string {
  if (!type) return "Email";
  return type.replace(/_/g, " ");
}

export function emailMatchesTypeFilter(
  email: CompetitorEmailRow,
  filter: EmailTypeFilter,
): boolean {
  if (filter === EMAIL_TYPE_FILTER_ALL) return true;
  if (filter === EMAIL_TYPE_FILTER_UNCLASSIFIED) return !email.email_type?.trim();
  return email.email_type === filter;
}

export type EmailTypeFilterOption = {
  id: EmailTypeFilter;
  label: string;
  count: number;
};

export function buildEmailTypeFilterOptions(emails: CompetitorEmailRow[]): EmailTypeFilterOption[] {
  const counts = new Map<string, number>();
  let unclassified = 0;

  for (const email of emails) {
    const type = email.email_type?.trim();
    if (!type) {
      unclassified += 1;
      continue;
    }
    counts.set(type, (counts.get(type) ?? 0) + 1);
  }

  const options: EmailTypeFilterOption[] = [
    { id: EMAIL_TYPE_FILTER_ALL, label: "All", count: emails.length },
  ];

  for (const type of EMAIL_TYPE_OPTIONS) {
    const count = counts.get(type);
    if (count) {
      options.push({ id: type, label: formatEmailType(type), count });
    }
  }

  for (const [type, count] of counts) {
    if (!(EMAIL_TYPE_OPTIONS as readonly string[]).includes(type)) {
      options.push({ id: type as EmailTypeFilter, label: formatEmailType(type), count });
    }
  }

  if (unclassified > 0) {
    options.push({
      id: EMAIL_TYPE_FILTER_UNCLASSIFIED,
      label: "Unclassified",
      count: unclassified,
    });
  }

  return options;
}

export function emailTypeBadgeClass(type: string | null): string {
  switch (type) {
    case "promotional":
      return "border-amber-200/80 bg-amber-50 text-amber-900";
    case "cart_abandonment":
      return "border-orange-200/80 bg-orange-50 text-orange-900";
    case "nurture":
      return "border-sky-200/80 bg-sky-50 text-sky-900";
    case "newsletter":
      return "border-indigo-200/80 bg-indigo-50 text-indigo-900";
    case "reengagement":
      return "border-violet-200/80 bg-violet-50 text-violet-900";
    default:
      return "border-slate-200/80 bg-slate-50 text-slate-700";
  }
}

export function angleBadgeClass(angle: string | null): string {
  switch (angle) {
    case "urgency":
      return "bg-red-50 text-red-800 ring-red-200/60";
    case "scarcity":
      return "bg-orange-50 text-orange-800 ring-orange-200/60";
    case "social_proof":
      return "bg-blue-50 text-blue-800 ring-blue-200/60";
    case "value":
      return "bg-emerald-50 text-emerald-800 ring-emerald-200/60";
    case "curiosity":
      return "bg-violet-50 text-violet-800 ring-violet-200/60";
    case "authority":
      return "bg-slate-100 text-slate-800 ring-slate-200/60";
    default:
      return "bg-slate-50 text-slate-700 ring-slate-200/60";
  }
}

export function parseOffers(raw: unknown): OfferChip[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (o): o is OfferChip =>
      typeof o === "object" &&
      o !== null &&
      typeof (o as OfferChip).type === "string" &&
      typeof (o as OfferChip).value === "string",
  );
}

export function emailTypeBarFillClass(type: string | null): string {
  switch (type) {
    case "promotional":
      return "bg-amber-400";
    case "cart_abandonment":
      return "bg-orange-400";
    case "nurture":
      return "bg-sky-400";
    case "newsletter":
      return "bg-indigo-400";
    case "reengagement":
      return "bg-violet-400";
    case "transactional":
      return "bg-slate-400";
    default:
      return "bg-slate-300";
  }
}

export function angleBarFillClass(angle: string | null): string {
  switch (angle) {
    case "urgency":
      return "bg-red-400";
    case "scarcity":
      return "bg-orange-400";
    case "social_proof":
      return "bg-blue-400";
    case "value":
      return "bg-emerald-400";
    case "curiosity":
      return "bg-violet-400";
    case "authority":
      return "bg-slate-500";
    default:
      return "bg-slate-300";
  }
}

export function emailFromLabel(email: CompetitorEmailRow): string {
  if (email.from_name && email.from_email) {
    return `${email.from_name} <${email.from_email}>`;
  }
  return email.from_email || email.from_name || "Unknown sender";
}

export function emailListPreview(email: CompetitorEmailRow): string {
  return (
    email.ai_summary?.trim() ||
    cleanPreheaderForDisplay(email.preview_text).text ||
    email.plain_text?.trim().slice(0, 120) ||
    "No preview available"
  );
}

const URL_RE = /https?:\/\/[^\s<>"']+/gi;
const URL_FRAGMENT_RE = /https?:\/?\/?/gi;

export function truncateDisplayText(text: string, max = 160): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  const cut = trimmed.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.55 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

export function cleanPreheaderForDisplay(raw: string | null | undefined): {
  text: string;
  raw: string;
  urlCount: number;
  displayCharCount: number;
} {
  const rawText = raw?.trim() ?? "";
  if (!rawText) {
    return { text: "", raw: "", urlCount: 0, displayCharCount: 0 };
  }
  const urls = rawText.match(URL_RE) ?? [];
  const text = rawText
    .replace(URL_RE, " ")
    .replace(URL_FRAGMENT_RE, " ")
    .replace(/\s+/g, " ")
    .trim();
  return {
    text: text || "(tracking links only)",
    raw: rawText,
    urlCount: urls.length,
    displayCharCount: text.length,
  };
}

export function mergeEmailRowUpdate(
  existing: CompetitorEmailRow,
  updated: CompetitorEmailRow,
): CompetitorEmailRow {
  return {
    ...existing,
    ...updated,
    html_body: updated.html_body ?? existing.html_body,
    plain_text: updated.plain_text ?? existing.plain_text,
    ai_deep_analysis: updated.ai_deep_analysis ?? existing.ai_deep_analysis,
    ai_analysis_version: updated.ai_analysis_version ?? existing.ai_analysis_version,
  };
}

export function estimatePlainBodyLength(email: CompetitorEmailRow): number | null {
  const plain = email.plain_text?.trim();
  if (plain) return plain.length;
  const html = email.html_body?.trim();
  if (!html) return null;
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().length;
}

export function formatReceivedDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
