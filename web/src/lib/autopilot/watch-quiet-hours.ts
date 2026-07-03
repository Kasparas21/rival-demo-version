import type { WatchQuietHours } from "./types";

const DEFAULT_QUIET: WatchQuietHours = {
  start: 22,
  end: 7,
  timezone: "Europe/London",
};

export function parseWatchQuietHours(raw: unknown): WatchQuietHours {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ...DEFAULT_QUIET };
  const o = raw as Record<string, unknown>;
  const start = typeof o.start === "number" && o.start >= 0 && o.start <= 23 ? o.start : DEFAULT_QUIET.start;
  const end = typeof o.end === "number" && o.end >= 0 && o.end <= 23 ? o.end : DEFAULT_QUIET.end;
  const timezone =
    typeof o.timezone === "string" && o.timezone.trim() ? o.timezone.trim() : DEFAULT_QUIET.timezone;
  return { start, end, timezone };
}

/** Hour-of-day (0–23) in the user's configured timezone. */
export function localHourInTimezone(now: Date, timezone: string): number {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      hour12: false,
    }).formatToParts(now);
    const hourPart = parts.find((p) => p.type === "hour");
    const h = hourPart ? Number.parseInt(hourPart.value, 10) : now.getUTCHours();
    return Number.isFinite(h) ? h : now.getUTCHours();
  } catch {
    return now.getUTCHours();
  }
}

/** True when local hour falls inside quiet window (handles overnight spans). */
export function isInQuietHours(now: Date, quiet: WatchQuietHours): boolean {
  const hour = localHourInTimezone(now, quiet.timezone);
  const { start, end } = quiet;
  if (start === end) return false;
  if (start < end) {
    return hour >= start && hour < end;
  }
  return hour >= start || hour < end;
}
