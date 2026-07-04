/** UTC calendar date `YYYY-MM-DD` from a timestamp. */
export function msToUtcYmd(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export type ScheduledScrapeDateWindow = {
  startYmd: string;
  endYmd: string;
};

/**
 * Rolling window for scheduled refresh scrapes: from last scrape day through today (UTC).
 * First refresh after discovery uses discovery classify time as `lastScrapeAt`.
 */
export function computeScheduledScrapeDateWindow(
  lastScrapeAtIso: string,
  nowMs = Date.now()
): ScheduledScrapeDateWindow {
  const lastMs = Date.parse(lastScrapeAtIso);
  const endYmd = msToUtcYmd(nowMs);
  const startYmd = Number.isNaN(lastMs) ? endYmd : msToUtcYmd(lastMs);
  if (startYmd > endYmd) {
    return { startYmd: endYmd, endYmd };
  }
  return { startYmd, endYmd };
}

/** Days between two UTC YMD strings (inclusive of end day as +1 for range length). */
export function utcYmdSpanDays(startYmd: string, endYmd: string): number {
  const s = Date.parse(`${startYmd}T00:00:00.000Z`);
  const e = Date.parse(`${endYmd}T00:00:00.000Z`);
  if (Number.isNaN(s) || Number.isNaN(e)) return 7;
  return Math.max(1, Math.round((e - s) / 86_400_000) + 1);
}

/** LinkedIn actor preset closest to the rolling window length. */
export function linkedinDateRangeForWindow(
  window: ScheduledScrapeDateWindow,
  opts?: { inactiveProbe?: boolean }
): string {
  if (opts?.inactiveProbe) return "past-month";
  const days = utcYmdSpanDays(window.startYmd, window.endYmd);
  if (days <= 8) return "past-week";
  if (days <= 31) return "past-month";
  return "past-year";
}

/** TikTok scheduled scrapes need a minimum window — same-day discovery + refresh can be 1 day. */
export function computeTikTokScheduledScrapeDateWindow(
  lastScrapeAtIso: string,
  nowMs = Date.now(),
  minDays = 30,
): ScheduledScrapeDateWindow {
  const window = computeScheduledScrapeDateWindow(lastScrapeAtIso, nowMs);
  if (utcYmdSpanDays(window.startYmd, window.endYmd) >= minDays) {
    return window;
  }
  const endMs = Date.parse(`${window.endYmd}T12:00:00.000Z`);
  const start = new Date(endMs);
  start.setUTCDate(start.getUTCDate() - (minDays - 1));
  return { startYmd: msToUtcYmd(start.getTime()), endYmd: window.endYmd };
}
