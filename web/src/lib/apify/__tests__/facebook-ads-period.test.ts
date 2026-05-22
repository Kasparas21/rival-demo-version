import { describe, expect, it } from "vitest";

import { resolveScrapePageAdsPeriod } from "@/lib/apify/facebook-ads";

describe("resolveScrapePageAdsPeriod", () => {
  it("returns empty string for workspace brand initial scrape", () => {
    expect(
      resolveScrapePageAdsPeriod({
        metaWorkspaceBrandInitialScrape: true,
        metaStartDate: "2026-05-21",
        metaEndDate: "2026-05-21",
      }),
    ).toBe("");
  });

  it("derives ISO date range for normal discovery scrapes", () => {
    expect(
      resolveScrapePageAdsPeriod({
        metaStartDate: "2026-01-01",
        metaEndDate: "2026-05-21",
      }),
    ).toBe("2026-01-01_2026-05-21");
  });

  it("prefers explicit scrapePageAdsPeriod when provided", () => {
    expect(
      resolveScrapePageAdsPeriod({
        scrapePageAdsPeriod: "last30d",
        metaStartDate: "2026-01-01",
        metaEndDate: "2026-05-21",
      }),
    ).toBe("last30d");
  });
});
