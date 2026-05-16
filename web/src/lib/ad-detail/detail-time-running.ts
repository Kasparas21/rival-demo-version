import { parseGoogleShownSummaryRange } from "@/lib/ad-library/google-shown-range";
import { parseLooseDateStringToUtcMs } from "@/lib/ad-detail/detail-field-format";
import { buildGoogleFamilyAdDetailFields } from "@/lib/ad-detail/google-family-ad-detail-fields";
import {
  linkedInRunDaysFromPublication,
  pinterestRunDaysFromPayload,
  snapchatRunDaysFromPayload,
} from "@/lib/ad-detail/linkedin-pinterest-snapchat-detail-rows";

const MS_PER_DAY = 86400000;

export type DetailRunningApiSlice = {
  lifespan_days: number;
  first_seen_at: string;
  last_seen_at: string;
  is_killed: boolean;
};

function daySpanFromUtcMs(startMs: number, endMs: number): number {
  return Math.max(0, Math.floor((endMs - startMs) / MS_PER_DAY));
}

function utcCalendarFromSeenIso(iso: string | null | undefined): number | null {
  if (!iso?.trim()) return null;
  const d = new Date(iso.trim());
  if (Number.isNaN(d.getTime())) return null;
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function utcCalendarFromEpoch(epochMs: number): number | null {
  const d = new Date(epochMs);
  if (Number.isNaN(d.getTime())) return null;
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function utcCalendarToday(): number {
  const n = new Date();
  return Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate());
}

function metaRunDays(rawPayload: unknown, api: DetailRunningApiSlice): number | null {
  if (!rawPayload || typeof rawPayload !== "object" || Array.isArray(rawPayload)) return null;
  const p = rawPayload as Record<string, unknown>;
  const s = p.startedAt;
  if (typeof s !== "number" || !Number.isFinite(s)) return null;

  const epochMs = s > 1e12 ? s : s * 1000;
  const startCal = utcCalendarFromEpoch(epochMs);
  if (startCal == null) return null;

  const endCal = api.is_killed ? utcCalendarFromSeenIso(api.last_seen_at) ?? utcCalendarToday() : utcCalendarToday();

  return daySpanFromUtcMs(startCal, endCal);
}

function tikTokRunDays(rawPayload: unknown, api: DetailRunningApiSlice): number | null {
  if (!rawPayload || typeof rawPayload !== "object" || Array.isArray(rawPayload)) return null;
  const p = rawPayload as Record<string, unknown>;

  const fs = typeof p.flightStartMs === "number" && Number.isFinite(p.flightStartMs) ? p.flightStartMs : null;
  const fe = typeof p.flightEndMs === "number" && Number.isFinite(p.flightEndMs) ? p.flightEndMs : null;

  if (fs != null) {
    const startCal = utcCalendarFromEpoch(fs);
    if (startCal == null) return null;
    let endCal: number;
    if (fe != null) {
      const ec = utcCalendarFromEpoch(fe);
      if (ec == null) return null;
      endCal = ec;
    } else {
      endCal =
        api.is_killed ?
          utcCalendarFromSeenIso(api.last_seen_at) ?? utcCalendarToday()
        : utcCalendarToday();
    }
    return daySpanFromUtcMs(startCal, endCal);
  }

  const firstStr = typeof p.firstShown === "string" ? p.firstShown.trim() : "";
  const lastStr = typeof p.lastShown === "string" ? p.lastShown.trim() : "";
  const startMs = parseLooseDateStringToUtcMs(firstStr);
  if (startMs == null) return null;
  const endMs =
    parseLooseDateStringToUtcMs(lastStr) ??
    (api.is_killed ? utcCalendarFromSeenIso(api.last_seen_at) ?? utcCalendarToday() : utcCalendarToday());
  return daySpanFromUtcMs(startMs, endMs);
}

function googleRunningDays(platform: string, rawPayload: unknown, api: DetailRunningApiSlice): number | null {
  const pl = platform.trim().toLowerCase();
  if (pl !== "google" && pl !== "youtube") return null;

  const g = buildGoogleFamilyAdDetailFields(platform, rawPayload);

  let startUtcMs: number | null = null;

  if (g.firstShownIso) {
    const d = new Date(g.firstShownIso);
    if (!Number.isNaN(d.getTime())) {
      startUtcMs = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    }
  }

  if (startUtcMs == null && rawPayload && typeof rawPayload === "object" && !Array.isArray(rawPayload)) {
    const p = rawPayload as Record<string, unknown>;
    const firstShownRaw =
      typeof p.firstShown === "string" && p.firstShown.trim() ? p.firstShown.trim() : null;
    const summary =
      typeof p.shownSummary === "string" && p.shownSummary.trim() ? p.shownSummary.trim() : null;
    const fromSummary = parseGoogleShownSummaryRange(summary);
    startUtcMs =
      parseLooseDateStringToUtcMs(firstShownRaw) ?? parseLooseDateStringToUtcMs(fromSummary.first ?? null);
  }

  if (startUtcMs == null) return null;

  let endUtcMs: number;

  if (!api.is_killed) {
    endUtcMs = utcCalendarToday();
  } else {
    let libEndUtcMs: number | null = null;

    if (g.lastShownIso) {
      const de = new Date(g.lastShownIso);
      if (!Number.isNaN(de.getTime())) {
        libEndUtcMs = Date.UTC(de.getUTCFullYear(), de.getUTCMonth(), de.getUTCDate());
      }
    }

    if (libEndUtcMs == null && rawPayload && typeof rawPayload === "object" && !Array.isArray(rawPayload)) {
      const p = rawPayload as Record<string, unknown>;
      const lastShownRaw =
        typeof p.lastShown === "string" && p.lastShown.trim() ? p.lastShown.trim() : null;
      const summary =
        typeof p.shownSummary === "string" && p.shownSummary.trim() ? p.shownSummary.trim() : null;
      const lastShownLabel =
        typeof p.lastShownLabel === "string" && p.lastShownLabel.trim() ? p.lastShownLabel.trim() : null;
      const fromSummary = parseGoogleShownSummaryRange(summary);
      const lastStr = lastShownRaw || fromSummary.last || lastShownLabel;
      libEndUtcMs =
        typeof lastStr === "string" ? (parseLooseDateStringToUtcMs(lastStr) ?? null) : null;
    }

    const apiLastUtc = utcCalendarFromSeenIso(api.last_seen_at);
    const cand = [libEndUtcMs, apiLastUtc].filter((x): x is number => x != null);
    endUtcMs = cand.length ? Math.max(...cand) : utcCalendarToday();
  }

  return daySpanFromUtcMs(startUtcMs, endUtcMs);
}

/**
 * Payload-first “time running” in whole days. Falls back to API `lifespan_days` from DB first/last_seen.
 */
export function resolveDetailRunningDays(
  platform: string,
  rawPayload: unknown,
  api: DetailRunningApiSlice
): number {
  const pl = platform.trim().toLowerCase();

  if (pl === "google" || pl === "youtube") {
    const g = googleRunningDays(platform, rawPayload, api);
    if (g != null) return g;
    return api.lifespan_days;
  }

  if (pl === "meta") {
    const m = metaRunDays(rawPayload, api);
    if (m != null) return m;
    return api.lifespan_days;
  }

  if (pl === "tiktok") {
    const t = tikTokRunDays(rawPayload, api);
    if (t != null) return t;
    return api.lifespan_days;
  }

  if (pl === "linkedin") {
    const v = linkedInRunDaysFromPublication(rawPayload);
    if (v != null) return v;
    return api.lifespan_days;
  }

  if (pl === "pinterest") {
    const v = pinterestRunDaysFromPayload(rawPayload);
    if (v != null) return v;
    return api.lifespan_days;
  }

  if (pl === "snapchat") {
    const v = snapchatRunDaysFromPayload(rawPayload);
    if (v != null) return v;
    return api.lifespan_days;
  }

  return api.lifespan_days;
}
