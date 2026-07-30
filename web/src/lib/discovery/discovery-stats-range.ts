import type { DiscoveryDatePreset } from "./types";

const DAY_MS = 86_400_000;

export type DiscoveryStatsRangeInput = {
  datePreset: DiscoveryDatePreset;
  statsDateFrom: string | null;
  statsDateTo: string | null;
};

export type DiscoveryStatsRange = {
  startMs: number;
  endMs: number;
  dateFrom: string;
  dateTo: string;
  label: string;
};

function parseYmd(ymd: string): number | null {
  const ms = Date.parse(`${ymd.trim()}T00:00:00.000Z`);
  return Number.isFinite(ms) ? ms : null;
}

function ymdFromMs(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function startOfUtcMonth(ms: number): number {
  const d = new Date(ms);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
}

function presetStart(preset: DiscoveryDatePreset, nowMs: number): number | null {
  if (preset === "all") return null;
  if (preset === "today") {
    const d = new Date(nowMs);
    d.setUTCHours(0, 0, 0, 0);
    return d.getTime();
  }
  const days =
    preset === "3d"
      ? 3
      : preset === "4d"
        ? 4
        : preset === "7d"
          ? 7
          : preset === "30d"
            ? 30
            : 90;
  return nowMs - days * DAY_MS;
}

function presetLabel(preset: DiscoveryDatePreset, from: string, to: string): string {
  switch (preset) {
    case "today":
      return "Today";
    case "3d":
      return "Last 3 days";
    case "4d":
      return "Last 4 days";
    case "7d":
      return "Last 7 days";
    case "30d":
      return "Last 30 days";
    case "90d":
      return "Last 90 days";
    case "all":
      return "All time";
    default:
      return `${from} → ${to}`;
  }
}

export function resolveDiscoveryStatsRange(
  input: DiscoveryStatsRangeInput,
  nowMs = Date.now(),
): DiscoveryStatsRange {
  const customFrom = input.statsDateFrom?.trim() || null;
  const customTo = input.statsDateTo?.trim() || null;

  if (customFrom || customTo) {
    const endMs = customTo ? parseYmd(customTo)! + DAY_MS - 1 : nowMs;
    const startMs = customFrom ? parseYmd(customFrom)! : presetStart("30d", nowMs) ?? nowMs - 30 * DAY_MS;
    const dateFrom = ymdFromMs(startMs);
    const dateTo = ymdFromMs(customTo ? parseYmd(customTo)! : nowMs);
    return {
      startMs,
      endMs,
      dateFrom,
      dateTo,
      label: `${dateFrom} → ${dateTo}`,
    };
  }

  const presetStartMs = presetStart(input.datePreset, nowMs);
  const startMs = presetStartMs ?? 0;
  const endMs = nowMs;
  const dateFrom = presetStartMs != null ? ymdFromMs(startMs) : "all";
  const dateTo = ymdFromMs(nowMs);

  return {
    startMs,
    endMs,
    dateFrom,
    dateTo,
    label: presetLabel(input.datePreset, dateFrom, dateTo),
  };
}

export const DISCOVERY_STATS_DATE_PRESETS: {
  id: DiscoveryDatePreset;
  label: string;
}[] = [
  { id: "today", label: "Today" },
  { id: "7d", label: "This week" },
  { id: "30d", label: "This month" },
  { id: "90d", label: "Last 90 days" },
  { id: "all", label: "All time" },
];

export function inStatsRange(ms: number, range: DiscoveryStatsRange): boolean {
  if (range.dateFrom === "all") return true;
  return ms >= range.startMs && ms <= range.endMs;
}
