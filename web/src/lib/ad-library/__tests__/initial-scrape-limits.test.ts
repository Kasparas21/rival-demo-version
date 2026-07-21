import { describe, expect, it } from "vitest";

import {
  getInitialAdsCount,
  INITIAL_ADS_PER_PLATFORM,
  WORKSPACE_RESCRAPE_ADS_PER_PLATFORM,
} from "@/lib/ad-library/constants";
import {
  applyInitialScrapeLimits,
  applyWorkspaceRescrapeLimits,
  buildInitialDiscoveryScrapeFields,
  defaultScrapeRequestFields,
  INITIAL_DISCOVERY_META_STATUS,
} from "@/lib/ad-library/scrape-request-fields";

describe("INITIAL_ADS_PER_PLATFORM", () => {
  it("matches launch table for each platform", () => {
    expect(INITIAL_ADS_PER_PLATFORM.meta).toBe(2000);
    expect(INITIAL_ADS_PER_PLATFORM.google).toBe(500);
    expect(INITIAL_ADS_PER_PLATFORM.tiktok).toBe(500);
    expect(INITIAL_ADS_PER_PLATFORM.pinterest).toBe(400);
    expect(INITIAL_ADS_PER_PLATFORM.linkedin).toBe(300);
    expect(INITIAL_ADS_PER_PLATFORM.snapchat).toBe(300);
  });

  it("getInitialAdsCount returns map values", () => {
    expect(getInitialAdsCount("meta")).toBe(2000);
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

    expect(applied.metaMaxAds).toBe(2000);
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

describe("INITIAL_DISCOVERY_META_STATUS", () => {
  it("is ALL for first discovery scrape", () => {
    expect(INITIAL_DISCOVERY_META_STATUS).toBe("ALL");
  });
});

describe("buildInitialDiscoveryScrapeFields", () => {
  it("applies initial caps and widens date filters for historical ads", () => {
    const base = {
      ...defaultScrapeRequestFields(),
      metaCountry: "DE",
      linkedinDateRange: "past-month",
      tiktokStartDate: "2024-01-01",
      metaStartDate: "2025-01-01",
      metaEndDate: "2025-06-01",
      pinterestStartDate: "2025-01-01",
      pinterestEndDate: "2025-06-01",
      snapchatStartDate: "2025-01-01",
      snapchatEndDate: "2025-06-01",
      microsoftStartDate: "2025-01-01",
      microsoftEndDate: "2025-06-01",
    };
    const applied = buildInitialDiscoveryScrapeFields(base);

    expect(applied.metaMaxAds).toBe(2000);
    expect(applied.linkedinMaxAds).toBe(300);
    expect(applied.tiktokMaxAds).toBe(500);

    expect(applied.metaCountry).toBe("DE");
    expect(applied.linkedinDateRange).toBe("all-time");
    expect(applied.metaStartDate).toBe("");
    expect(applied.metaEndDate).toBe("");
    expect(applied.pinterestStartDate).toBe("");
    expect(applied.pinterestEndDate).toBe("");
    expect(applied.snapchatStartDate).toBe("");
    expect(applied.snapchatEndDate).toBe("");
    expect(applied.microsoftStartDate).toBe("");
    expect(applied.microsoftEndDate).toBe("");
    expect(applied.tiktokStartDate).not.toBe("2024-01-01");
    expect(applied.tiktokEndDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
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
