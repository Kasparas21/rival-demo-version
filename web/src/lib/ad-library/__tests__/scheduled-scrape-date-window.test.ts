import { describe, expect, it } from "vitest";

import {
  computeScheduledScrapeDateWindow,
  linkedinDateRangeForWindow,
  utcYmdSpanDays,
} from "@/lib/ad-library/scheduled-scrape-date-window";

describe("computeScheduledScrapeDateWindow", () => {
  it("uses last scrape day through today for first refresh", () => {
    const window = computeScheduledScrapeDateWindow(
      "2026-05-16T18:00:00.000Z",
      Date.parse("2026-05-19T04:00:00.000Z")
    );
    expect(window).toEqual({ startYmd: "2026-05-16", endYmd: "2026-05-19" });
  });

  it("uses rolling window for second refresh", () => {
    const window = computeScheduledScrapeDateWindow(
      "2026-05-19T04:00:00.000Z",
      Date.parse("2026-05-22T04:00:00.000Z")
    );
    expect(window).toEqual({ startYmd: "2026-05-19", endYmd: "2026-05-22" });
  });
});

describe("linkedinDateRangeForWindow", () => {
  it("maps short windows to past-week", () => {
    expect(
      linkedinDateRangeForWindow({ startYmd: "2026-05-19", endYmd: "2026-05-22" })
    ).toBe("past-week");
  });

  it("uses past-month for inactive probe", () => {
    expect(
      linkedinDateRangeForWindow(
        { startYmd: "2026-05-01", endYmd: "2026-05-19" },
        { inactiveProbe: true }
      )
    ).toBe("past-month");
  });
});

describe("utcYmdSpanDays", () => {
  it("counts inclusive span", () => {
    expect(utcYmdSpanDays("2026-05-16", "2026-05-19")).toBe(4);
  });
});
