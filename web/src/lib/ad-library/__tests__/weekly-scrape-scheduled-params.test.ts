import { describe, expect, it } from "vitest";

import { FULL_SWEEP_ADS_PER_PLATFORM, INACTIVE_PROBE_ADS_PER_PLATFORM } from "@/lib/ad-library/constants";
import { buildParallelScrapeScalars } from "@/lib/ad-library/weekly-scrape-scheduled-params";

describe("buildParallelScrapeScalars", () => {
  it("uses a full ACTIVE sweep (no date window) for meta so absence can mark kills", () => {
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
    expect(scalars.tiktokMaxAds).toBe(FULL_SWEEP_ADS_PER_PLATFORM);
    expect(scalars.metaStartDate).toBe("");
    expect(scalars.metaEndDate).toBe("");
    /** TikTok and Google lifecycles come from each ad's own shown dates, so refreshes only need the window. */
    expect(scalars.tiktokStartDate).toBe("2026-06-30");
    expect(scalars.tiktokEndDate).toBe("2026-07-03");
    /** Google lifecycle is per-creative last-shown, so a refresh only needs creatives shown since the last scrape. */
    expect(scalars.googleStartDate).toBe("2026-07-01");
    expect(scalars.googleEndDate).toBe("2026-07-03");
  });

  it("keeps a full TikTok sweep for a competitor never scraped on TikTok", () => {
    const nowMs = Date.parse("2026-07-03T12:00:00.000Z");
    const scalars = buildParallelScrapeScalars(
      ["tiktok"],
      new Map([["tiktok", "PRIMARY"]] as const),
      new Map(),
      "2026-06-01T00:00:00.000Z",
      new Date(nowMs).toISOString(),
      nowMs,
    );
    expect(scalars.tiktokMaxAds).toBe(FULL_SWEEP_ADS_PER_PLATFORM);
    expect(scalars.tiktokStartDate).toBe("");
    expect(scalars.tiktokEndDate).toBe("");
  });

  it("keeps a full Google sweep for a competitor never scraped on Google", () => {
    const nowMs = Date.parse("2026-07-03T12:00:00.000Z");
    const scalars = buildParallelScrapeScalars(
      ["google"],
      new Map([["google", "PRIMARY"]] as const),
      new Map(),
      "2026-06-01T00:00:00.000Z",
      new Date(nowMs).toISOString(),
      nowMs,
    );
    expect(scalars.googleResultsLimit).toBe(FULL_SWEEP_ADS_PER_PLATFORM);
    expect(scalars.googleStartDate).toBe("");
    expect(scalars.googleEndDate).toBe("");
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
