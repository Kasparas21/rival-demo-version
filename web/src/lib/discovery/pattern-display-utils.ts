import { parseUtcWeekStartYmd, utcWeekStartYmd, DAY_MS } from "./pattern-week-utils";
import type { DiscoveryPatternMetrics } from "./types";

export type PatternsDisplayPrefs = {
  timezone: string;
  compare: boolean;
};

export const PATTERNS_TIMEZONE_OPTIONS = [
  { id: "local", label: "Local" },
  { id: "UTC", label: "UTC" },
  { id: "Europe/Vilnius", label: "Vilnius" },
  { id: "Europe/London", label: "London" },
  { id: "Europe/Berlin", label: "Berlin" },
  { id: "America/New_York", label: "New York" },
  { id: "America/Chicago", label: "Chicago" },
  { id: "America/Los_Angeles", label: "Los Angeles" },
  { id: "Asia/Singapore", label: "Singapore" },
] as const;

export function patternsPrefsStorageKey(brandId: string): string {
  return `rival_patterns_prefs_${brandId}`;
}

export function resolvePatternsTimezone(stored: string): string {
  if (stored === "local" || !stored.trim()) {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
  return stored;
}

export function loadPatternsDisplayPrefs(brandId: string): PatternsDisplayPrefs {
  if (typeof window === "undefined") {
    return { timezone: "local", compare: true };
  }
  try {
    const raw = localStorage.getItem(patternsPrefsStorageKey(brandId));
    if (!raw) return { timezone: "local", compare: true };
    const parsed = JSON.parse(raw) as Partial<PatternsDisplayPrefs>;
    return {
      timezone: typeof parsed.timezone === "string" ? parsed.timezone : "local",
      compare: parsed.compare !== false,
    };
  } catch {
    return { timezone: "local", compare: true };
  }
}

export function savePatternsDisplayPrefs(brandId: string, prefs: PatternsDisplayPrefs): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(patternsPrefsStorageKey(brandId), JSON.stringify(prefs));
}

export function formatWeekLabel(weekStart: string, timeZone: string): string {
  const d = new Date(`${weekStart}T00:00:00.000Z`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone });
}

export function formatWeekRange(weekStart: string, timeZone: string): string {
  const startMs = parseUtcWeekStartYmd(weekStart);
  const endMs = startMs + 6 * DAY_MS;
  const fmt = (ms: number) =>
    new Date(ms).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone,
    });
  return `${fmt(startMs)} – ${fmt(endMs)}`;
}

export function getPriorWeekStart(weekStart: string): string {
  return utcWeekStartYmd(parseUtcWeekStartYmd(weekStart) - 7 * DAY_MS);
}

export function findPriorWeekMetrics(
  history: DiscoveryPatternMetrics[],
  weekStart: string,
): DiscoveryPatternMetrics | null {
  const priorWeek = getPriorWeekStart(weekStart);
  return history.find((h) => h.week_start === priorWeek) ?? null;
}

export function formatDelta(delta: number): string {
  if (delta > 0) return `+${delta}`;
  return String(delta);
}

export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}
