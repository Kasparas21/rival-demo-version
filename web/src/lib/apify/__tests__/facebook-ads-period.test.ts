import { describe, expect, it } from "vitest";

import { resolveScrapePageAdsPeriod } from "@/lib/apify/facebook-ads";

describe("resolveScrapePageAdsPeriod", () => {
  it("returns empty string for workspace brand initial scrape", () => {
    expect(
      resolveScrapePageAdsPeriod({
        metaWorkspaceBrandInitialScrape: true,
        scrapePageAdsPeriod: "last7d",
      }),
    ).toBe("");
  });

  it("returns empty string when no period is given", () => {
    expect(resolveScrapePageAdsPeriod({})).toBe("");
  });

  it("passes through the actor's own presets", () => {
    for (const preset of ["last24h", "last7d", "last14d", "last30d"]) {
      expect(resolveScrapePageAdsPeriod({ scrapePageAdsPeriod: preset })).toBe(preset);
    }
  });

  it("drops ISO date ranges, which the actor rejects as invalid input", () => {
    expect(resolveScrapePageAdsPeriod({ scrapePageAdsPeriod: "2026-01-01_2026-05-21" })).toBe("");
  });
});
