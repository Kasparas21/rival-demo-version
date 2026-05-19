import { describe, expect, it } from "vitest";

import {
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
    expect(p.tiktokStartDate).toBe("2026-05-19");
    expect(p.snapchatEndDate).toBe("2026-05-19");
  });
});
