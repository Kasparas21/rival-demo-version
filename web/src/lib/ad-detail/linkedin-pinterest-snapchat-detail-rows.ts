/**
 * Extra “Details” tab rows for LinkedIn / Pinterest / Snapchat (mirrors {@link buildTikTokAdLibraryDetailRows}).
 */

import type { PinterestTargetingRow } from "@/lib/ad-library/normalize";

export type LibraryPlatformDetailRow = { label: string; value: string };

const MS_PER_DAY = 86400000;

function parseLinkedInSlashDateToUtcMs(s: string | null | undefined): number | null {
  if (!s?.trim()) return null;
  const t = s.trim();
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t);
  if (m) {
    const month = Number(m[1]) - 1;
    const day = Number(m[2]);
    const year = Number(m[3]);
    const ms = Date.UTC(year, month, day);
    if (!Number.isNaN(ms)) return ms;
  }
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return null;
  return d.getTime();
}

/** Calendar-day span from `publicationStart` to `publicationEnd` or today (still running). */
export function linkedInRunDaysFromPublication(rawPayload: unknown): number | null {
  if (!rawPayload || typeof rawPayload !== "object") return null;
  const p = rawPayload as Record<string, unknown>;
  const pubStart = typeof p.publicationStart === "string" ? p.publicationStart : null;
  const pubEnd = typeof p.publicationEnd === "string" ? p.publicationEnd : null;
  const startMs = parseLinkedInSlashDateToUtcMs(pubStart);
  if (startMs == null) return null;
  const endMs = parseLinkedInSlashDateToUtcMs(pubEnd) ?? Date.now();
  return Math.max(0, Math.floor((endMs - startMs) / MS_PER_DAY));
}

function parseLooseDateToUtcMs(s: string | null | undefined): number | null {
  if (!s?.trim()) return null;
  const d = new Date(s.trim());
  if (Number.isNaN(d.getTime())) return null;
  return d.getTime();
}

function pinterestRunWindow(rawPayload: unknown): { startLabel: string | null; endLabel: string | null } {
  if (!rawPayload || typeof rawPayload !== "object" || Array.isArray(rawPayload)) {
    return { startLabel: null, endLabel: null };
  }

  const p = rawPayload as Record<string, unknown>;
  const disclosureWindow = typeof p.disclosureWindow === "string" ? p.disclosureWindow.trim() : "";
  if (!disclosureWindow) return { startLabel: null, endLabel: null };

  const ran = /^Ran\s+(.+?)\s+[–-]\s+(.+)$/i.exec(disclosureWindow);
  if (ran) return { startLabel: ran[1].trim(), endLabel: ran[2].trim() };

  const from = /^From\s+(.+)$/i.exec(disclosureWindow);
  if (from) return { startLabel: from[1].trim(), endLabel: null };

  return { startLabel: null, endLabel: null };
}

export function pinterestRunStartFromPayload(rawPayload: unknown): string | null {
  return pinterestRunWindow(rawPayload).startLabel;
}

export function pinterestRunDaysFromPayload(rawPayload: unknown): number | null {
  const { startLabel, endLabel } = pinterestRunWindow(rawPayload);
  const startMs = parseLooseDateToUtcMs(startLabel);
  if (startMs == null) return null;
  const endMs = parseLooseDateToUtcMs(endLabel) ?? Date.now();
  return Math.max(0, Math.floor((endMs - startMs) / MS_PER_DAY));
}

/** Calendar-day span for Snapchat EU Ads Gallery ads from normalized card `startDateLabel` / `endDateLabel`. */
export function snapchatRunDaysFromPayload(rawPayload: unknown): number | null {
  if (!rawPayload || typeof rawPayload !== "object" || Array.isArray(rawPayload)) return null;
  const p = rawPayload as Record<string, unknown>;
  const startLabel = typeof p.startDateLabel === "string" ? p.startDateLabel.trim() : "";
  if (!startLabel || /^n\/?a$/i.test(startLabel)) return null;

  const startMs = parseLooseDateToUtcMs(startLabel);
  if (startMs == null) return null;

  const endLabel = typeof p.endDateLabel === "string" ? p.endDateLabel.trim() : "";
  let endMs: number | null = null;
  if (endLabel && !/^n\/?a$/i.test(endLabel)) endMs = parseLooseDateToUtcMs(endLabel);

  const endEffective = endMs ?? Date.now();
  return Math.max(0, Math.floor((endEffective - startMs) / MS_PER_DAY));
}

function push(rows: LibraryPlatformDetailRow[], label: string, v: unknown) {
  if (typeof v !== "string" || !v.trim()) return;
  rows.push({ label, value: v.trim() });
}

function isPinterestTargetingRow(x: unknown): x is PinterestTargetingRow {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return typeof o.label === "string" && typeof o.value === "string";
}

/** LinkedIn targeting rows from `linkedinAudienceTargeting` (publication, impressions, breakdown are canonical). */
export function buildLinkedInLibraryDetailRows(rawPayload: unknown): LibraryPlatformDetailRow[] {
  if (!rawPayload || typeof rawPayload !== "object" || Array.isArray(rawPayload)) return [];
  const p = rawPayload as Record<string, unknown>;
  const rows: LibraryPlatformDetailRow[] = [];

  const aud = p.linkedinAudienceTargeting;
  if (Array.isArray(aud)) {
    for (const x of aud) {
      if (!x || typeof x !== "object") continue;
      const o = x as Record<string, unknown>;
      const t = typeof o.type === "string" ? o.type.trim() : "";
      const v = typeof o.value === "string" ? o.value.trim() : "";
      const st = typeof o.status === "string" ? o.status.trim() : "";
      if (!t || !v) continue;
      const typeNorm = t.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
      if (typeNorm === "criteria") continue;
      const value = st ? `${v} (${st})` : v;
      rows.push({ label: t, value });
    }
  }

  return rows.filter((r) => r.value !== "—");
}

/** Pinterest targeting-only rows (`reachSummary`, impressions, Countries → Detail tab canonically). */
export function buildPinterestLibraryDetailRows(rawPayload: unknown): LibraryPlatformDetailRow[] {
  if (!rawPayload || typeof rawPayload !== "object" || Array.isArray(rawPayload)) return [];
  const p = rawPayload as Record<string, unknown>;
  const rows: LibraryPlatformDetailRow[] = [];

  const tr = p.targetingRows;
  if (Array.isArray(tr)) {
    let n = 0;
    for (const x of tr) {
      if (!isPinterestTargetingRow(x)) continue;
      if (!x.label.trim() || !x.value.trim()) continue;
      const labelRaw = x.label.trim();
      const labelNorm = labelRaw.toLowerCase().replace(/\s+/g, "");
      if (labelNorm === "countries" || labelNorm === "country") continue;
      if (labelNorm === "pinnerlisttypes") continue;
      const valueRaw = x.value.trim();
      const value =
        labelRaw.toLowerCase().replace(/\s+/g, "") === "genders" &&
        valueRaw.split(/,\s*/).some((part) => part.trim().toUpperCase() === "UNSPECIFIED")
          ? "UNSPECIFIED"
          : valueRaw;
      rows.push({ label: labelRaw, value });
      n += 1;
      if (n >= 12) break;
    }
  }

  return rows;
}

/** Snapchat — only supplemental tail rows (`impressionsLabel`, region, Run start surfaced canonically). */
export function buildSnapchatLibraryDetailRows(rawPayload: unknown): LibraryPlatformDetailRow[] {
  if (!rawPayload || typeof rawPayload !== "object" || Array.isArray(rawPayload)) return [];
  const p = rawPayload as Record<string, unknown>;
  const rows: LibraryPlatformDetailRow[] = [];

  push(rows, "Flight end", p.endDateLabel);

  return rows;
}
