import { describe, expect, it } from "vitest";

import {
  filterWeeklyScrapeCandidates,
  isEligibleWeeklyScrapeCandidate,
} from "@/lib/ad-library/weekly-scrape-candidates";

describe("weekly-scrape-candidates", () => {
  it("includes saved competitors regardless of is_followed", () => {
    expect(
      isEligibleWeeklyScrapeCandidate({
        is_workspace_brand: false,
      }),
    ).toBe(true);
  });

  it("includes workspace brand rows in nightly scheduled refresh", () => {
    expect(
      isEligibleWeeklyScrapeCandidate({
        is_workspace_brand: true,
      }),
    ).toBe(true);
  });

  it("keeps all saved competitor rows including workspace brand", () => {
    const rows = [
      { id: "a", is_workspace_brand: false },
      { id: "b", is_workspace_brand: true },
      { id: "c", is_workspace_brand: false },
    ];

    expect(filterWeeklyScrapeCandidates(rows).map((r) => r.id)).toEqual(["a", "b", "c"]);
  });
});
