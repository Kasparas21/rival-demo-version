import { isAdActiveFromRawPayload } from "@/lib/ad-library/count-active-ads";
import type { AdsLibraryPlatform } from "@/lib/ad-library/ads-library-platform";
import { isCreativeLive } from "@/lib/spend-estimator/live-creatives";

export type CellAdLifecycle = {
  isRunning: boolean;
  runtimeDays: number;
  endedDaysAgo: number | null;
  statusLabel: string;
  sortRuntimeMs: number;
};

function msToWholeDays(deltaMs: number): number {
  return Math.max(0, Math.floor(deltaMs / 86_400_000));
}

export function resolveCellAdLifecycle(
  row: {
    platform: string;
    first_seen_at: string;
    last_seen_at: string;
    is_active: boolean;
    raw_payload?: unknown;
  },
  nowMs = Date.now()
): CellAdLifecycle {
  const platform = row.platform.toLowerCase().trim();
  const firstMs = Date.parse(row.first_seen_at);
  const lastMs = Date.parse(row.last_seen_at);

  let isRunning = isCreativeLive(row, nowMs);
  if (row.raw_payload && typeof row.raw_payload === "object") {
    try {
      isRunning = isAdActiveFromRawPayload(platform as AdsLibraryPlatform, row.raw_payload, nowMs);
    } catch {
      /* keep recency fallback */
    }
  }

  const startMs = Number.isFinite(firstMs) ? firstMs : Number.isFinite(lastMs) ? lastMs : nowMs;
  const endMs = isRunning ? nowMs : Number.isFinite(lastMs) ? lastMs : nowMs;
  const runtimeDays = msToWholeDays(endMs - startMs);
  const endedDaysAgo =
    !isRunning && Number.isFinite(lastMs) ? msToWholeDays(nowMs - lastMs) : null;

  const statusLabel = isRunning
    ? runtimeDays === 0
      ? "Active · started today"
      : `Active · ${runtimeDays}d running`
    : endedDaysAgo != null && endedDaysAgo === 0
      ? `Ended today · ran ${runtimeDays}d`
      : endedDaysAgo != null
        ? `Ended ${endedDaysAgo}d ago · ran ${runtimeDays}d`
        : `Ended · ran ${runtimeDays}d`;

  return {
    isRunning,
    runtimeDays,
    endedDaysAgo,
    statusLabel,
    sortRuntimeMs: Math.max(0, endMs - startMs),
  };
}

export type CellAdSortMode = "active_first" | "longest_running" | "shortest_running" | "recently_ended";

export function sortCellAds<T extends { lifecycle: CellAdLifecycle }>(
  rows: T[],
  mode: CellAdSortMode
): T[] {
  const copy = [...rows];
  copy.sort((a, b) => {
    const la = a.lifecycle;
    const lb = b.lifecycle;
    switch (mode) {
      case "longest_running":
        return lb.sortRuntimeMs - la.sortRuntimeMs || Number(lb.isRunning) - Number(la.isRunning);
      case "shortest_running":
        return la.sortRuntimeMs - lb.sortRuntimeMs || Number(lb.isRunning) - Number(la.isRunning);
      case "recently_ended":
        if (la.isRunning !== lb.isRunning) return Number(lb.isRunning) - Number(la.isRunning);
        if (!la.isRunning && !lb.isRunning) {
          return (la.endedDaysAgo ?? 9999) - (lb.endedDaysAgo ?? 9999);
        }
        return lb.sortRuntimeMs - la.sortRuntimeMs;
      case "active_first":
      default:
        if (la.isRunning !== lb.isRunning) return Number(lb.isRunning) - Number(la.isRunning);
        return lb.sortRuntimeMs - la.sortRuntimeMs;
    }
  });
  return copy;
}
