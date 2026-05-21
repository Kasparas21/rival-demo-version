import { describe, expect, it } from "vitest";

import {
  getInitialAdsCount,
  INITIAL_ADS_PER_PLATFORM,
  WORKSPACE_RESCRAPE_ADS_PER_PLATFORM,
} from "@/lib/ad-library/constants";
import {
  applyInitialScrapeLimits,
  applyWorkspaceRescrapeLimits,
  defaultScrapeRequestFields,
} from "@/lib/ad-library/scrape-request-fields";

describe("INITIAL_ADS_PER_PLATFORM", () => {
  it("matches launch table for each platform", () => {
    expect(INITIAL_ADS_PER_PLATFORM.meta).toBe(500);
    expect(INITIAL_ADS_PER_PLATFORM.google).toBe(500);
    expect(INITIAL_ADS_PER_PLATFORM.tiktok).toBe(500);
    expect(INITIAL_ADS_PER_PLATFORM.pinterest).toBe(400);
    expect(INITIAL_ADS_PER_PLATFORM.linkedin).toBe(300);
    expect(INITIAL_ADS_PER_PLATFORM.snapchat).toBe(300);
  });

  it("getInitialAdsCount returns map values", () => {
    expect(getInitialAdsCount("meta")).toBe(500);
    expect(getInitialAdsCount("google")).toBe(500);
    expect(getInitialAdsCount("pinterest")).toBe(400);
    expect(getInitialAdsCount("linkedin")).toBe(300);
  });
});

describe("applyInitialScrapeLimits", () => {
  it("overrides max-ad fields but preserves region and date settings", () => {
    const base = {
      ...defaultScrapeRequestFields(),
      metaCountry: "DE",
      linkedinDateRange: "past-month",
      tiktokStartDate: "2024-01-01",
    };
    const applied = applyInitialScrapeLimits(base);

    expect(applied.metaMaxAds).toBe(500);
    expect(applied.linkedinMaxAds).toBe(300);
    expect(applied.tiktokMaxAds).toBe(500);
    expect(applied.pinterestMaxResults).toBe(400);
    expect(applied.snapchatMaxItems).toBe(300);

    expect(applied.metaCountry).toBe("DE");
    expect(applied.linkedinDateRange).toBe("past-month");
    expect(applied.tiktokStartDate).toBe("2024-01-01");
  });

  it("does not change microsoft max (not part of initial map)", () => {
    const base = { ...defaultScrapeRequestFields(), microsoftMaxSearchResults: 24 };
    const applied = applyInitialScrapeLimits(base);
    expect(applied.microsoftMaxSearchResults).toBe(24);
  });
});

describe("applyWorkspaceRescrapeLimits", () => {
  it("uses small per-platform caps for workspace rescrape", () => {
    const base = {
      ...defaultScrapeRequestFields(),
      metaMaxAds: 500,
      linkedinMaxAds: 300,
      tiktokMaxAds: 500,
      pinterestMaxResults: 400,
      snapchatMaxItems: 300,
    };
    const applied = applyWorkspaceRescrapeLimits(base);

    expect(applied.metaMaxAds).toBe(WORKSPACE_RESCRAPE_ADS_PER_PLATFORM.meta);
    expect(applied.linkedinMaxAds).toBe(WORKSPACE_RESCRAPE_ADS_PER_PLATFORM.linkedin);
    expect(applied.tiktokMaxAds).toBe(WORKSPACE_RESCRAPE_ADS_PER_PLATFORM.tiktok);
    expect(applied.pinterestMaxResults).toBe(WORKSPACE_RESCRAPE_ADS_PER_PLATFORM.pinterest);
    expect(applied.snapchatMaxItems).toBe(WORKSPACE_RESCRAPE_ADS_PER_PLATFORM.snapchat);
    expect(WORKSPACE_RESCRAPE_ADS_PER_PLATFORM.google).toBe(25);
  });
});
