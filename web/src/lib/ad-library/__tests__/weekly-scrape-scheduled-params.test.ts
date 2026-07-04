import { describe, expect, it } from "vitest";

import { FULL_SWEEP_ADS_PER_PLATFORM, INACTIVE_PROBE_ADS_PER_PLATFORM } from "@/lib/ad-library/constants";
import { buildParallelScrapeScalars } from "@/lib/ad-library/weekly-scrape-scheduled-params";

describe("buildParallelScrapeScalars", () => {
  it("uses full ACTIVE sweeps (no date window) for meta/google so absence can mark kills", () => {
    const nowMs = Date.parse("2026-07-03T12:00:00.000Z");
    const nowStamp = new Date(nowMs).toISOString();

    const classificationByPlatform = new Map([
      ["meta", "MINIMAL"],
      ["google", "PRIMARY"],
      ["tiktok", "SECONDARY"],
    ] as const);

    const lastScrapeByPlatform = new Map([
      ["meta", "2026-06-27T04:00:00.000Z"],
      ["google", "2026-07-01T04:00:00.000Z"],
      ["tiktok", "2026-06-30T04:00:00.000Z"],
    ] as const);

    const scalars = buildParallelScrapeScalars(
      ["meta", "google", "tiktok"],
      classificationByPlatform,
      lastScrapeByPlatform,
      "2026-06-01T00:00:00.000Z",
      nowStamp,
      nowMs,
    );

    expect(scalars.metaMaxAds).toBe(FULL_SWEEP_ADS_PER_PLATFORM);
    expect(scalars.googleResultsLimit).toBe(FULL_SWEEP_ADS_PER_PLATFORM);
    expect(scalars.metaStartDate).toBe("");
    expect(scalars.metaEndDate).toBe("");
    expect(scalars.tiktokMaxAds).toBe(100);
    expect(scalars.tiktokStartDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(scalars.tiktokEndDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(scalars.tiktokStartDate <= scalars.tiktokEndDate).toBe(true);
  });

  it("keeps the cheap probe limit for INACTIVE platforms", () => {
    const nowMs = Date.parse("2026-07-03T12:00:00.000Z");
    const nowStamp = new Date(nowMs).toISOString();

    const scalars = buildParallelScrapeScalars(
      ["meta"],
      new Map([["meta", "INACTIVE"]] as const),
      new Map([["meta", "2026-06-01T04:00:00.000Z"]] as const),
      "2026-06-01T00:00:00.000Z",
      nowStamp,
      nowMs,
    );

    expect(scalars.metaMaxAds).toBe(INACTIVE_PROBE_ADS_PER_PLATFORM);
  });

  it("keeps LinkedIn on windowed date-range presets", () => {
    const nowMs = Date.parse("2026-07-03T12:00:00.000Z");
    const nowStamp = new Date(nowMs).toISOString();

    const scalars = buildParallelScrapeScalars(
      ["linkedin"],
      new Map([["linkedin", "SECONDARY"]] as const),
      new Map([["linkedin", "2026-06-27T04:00:00.000Z"]] as const),
      "2026-06-01T00:00:00.000Z",
      nowStamp,
      nowMs,
    );

    expect(["past-week", "past-month", "past-year"]).toContain(scalars.linkedinDateRange);
  });
});
