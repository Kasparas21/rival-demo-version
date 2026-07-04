import { describe, expect, it } from "vitest";

import {
  buildManualRefreshLibraryBodyForPlatform,
  buildManualRefreshScrapeParams,
  computeManualRefreshTodayWindow,
} from "@/lib/ad-library/manual-refresh-date-window";

describe("computeManualRefreshTodayWindow", () => {
  it("uses UTC today for start and end", () => {
    const ms = Date.parse("2026-05-19T15:30:00.000Z");
    expect(computeManualRefreshTodayWindow(ms)).toEqual({
      startYmd: "2026-05-19",
      endYmd: "2026-05-19",
    });
  });
});

describe("buildManualRefreshScrapeParams", () => {
  it("sets ACTIVE meta and past-day LinkedIn", () => {
    const window = { startYmd: "2026-05-19", endYmd: "2026-05-19" };
    const p = buildManualRefreshScrapeParams(window);
    expect(p.metaStatus).toBe("ACTIVE");
    expect(p.metaStartDate).toBe("2026-05-19");
    expect(p.metaEndDate).toBe("2026-05-19");
    expect(p.linkedinDateRange).toBe("past-day");
    expect(p.tiktokEndDate).toBe("2026-05-19");
    expect(p.tiktokStartDate).toBe("2025-05-19");
    expect(p.snapchatEndDate).toBe("2026-05-19");
  });
});

describe("buildManualRefreshLibraryBodyForPlatform", () => {
  it("omits Meta date window for page-id manual refresh", () => {
    const body = buildManualRefreshLibraryBodyForPlatform("meta");
    expect(body.intent).toBe("manual");
    expect(body.metaStatus).toBe("ACTIVE");
    expect(body.metaMaxAds).toBeGreaterThan(0);
    expect(body).not.toHaveProperty("metaStartDate");
    expect(body).not.toHaveProperty("metaEndDate");
  });

  it("uses 300-ad cap for TikTok manual refresh", () => {
    const body = buildManualRefreshLibraryBodyForPlatform("tiktok");
    expect(body.tiktokMaxAds).toBe(300);
    expect(body.tiktokStartDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(body.tiktokEndDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
