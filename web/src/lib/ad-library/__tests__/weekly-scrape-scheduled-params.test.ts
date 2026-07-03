import { describe, expect, it } from "vitest";

import { buildParallelScrapeScalars } from "@/lib/ad-library/weekly-scrape-scheduled-params";

describe("buildParallelScrapeScalars", () => {
  it("applies per-platform classification limits when multiple platforms are due", () => {
    const nowMs = Date.parse("2026-07-03T12:00:00.000Z");
    const nowStamp = new Date(nowMs).toISOString();

    const classificationByPlatform = new Map([
      ["meta", "MINIMAL"],
      ["google", "PRIMARY"],
    ] as const);

    const lastScrapeByPlatform = new Map([
      ["meta", "2026-06-27T04:00:00.000Z"],
      ["google", "2026-07-01T04:00:00.000Z"],
    ] as const);

    const scalars = buildParallelScrapeScalars(
      ["meta", "google"],
      classificationByPlatform,
      lastScrapeByPlatform,
      "2026-06-01T00:00:00.000Z",
      nowStamp,
      nowMs,
    );

    expect(scalars.metaMaxAds).toBe(100);
    expect(scalars.googleResultsLimit).toBe(100);
    expect(scalars.metaStartDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(scalars.metaEndDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
