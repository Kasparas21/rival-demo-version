import { describe, expect, it } from "vitest";

import {
  computeScheduledScrapeDateWindow,
  computeTikTokScheduledScrapeDateWindow,
  utcYmdSpanDays,
} from "@/lib/ad-library/scheduled-scrape-date-window";

describe("computeTikTokScheduledScrapeDateWindow", () => {
  it("floors same-day discovery refresh to at least 30 days", () => {
    const nowMs = Date.parse("2026-07-04T12:00:00.000Z");
    const lastScrapeAt = "2026-07-04T08:00:00.000Z";
    const rolling = computeScheduledScrapeDateWindow(lastScrapeAt, nowMs);
    expect(utcYmdSpanDays(rolling.startYmd, rolling.endYmd)).toBe(1);

    const tiktok = computeTikTokScheduledScrapeDateWindow(lastScrapeAt, nowMs);
    expect(tiktok.endYmd).toBe("2026-07-04");
    expect(utcYmdSpanDays(tiktok.startYmd, tiktok.endYmd)).toBeGreaterThanOrEqual(30);
  });

  it("keeps wider rolling windows unchanged", () => {
    const nowMs = Date.parse("2026-07-04T12:00:00.000Z");
    const lastScrapeAt = "2026-06-01T08:00:00.000Z";
    const rolling = computeScheduledScrapeDateWindow(lastScrapeAt, nowMs);
    const tiktok = computeTikTokScheduledScrapeDateWindow(lastScrapeAt, nowMs);
    expect(tiktok).toEqual(rolling);
  });
});
