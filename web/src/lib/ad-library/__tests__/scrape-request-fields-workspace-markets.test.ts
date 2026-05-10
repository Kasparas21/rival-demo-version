import { describe, expect, it } from "vitest";

import {
  mergeScrapeFieldsWithWorkspaceMarkets,
  primaryWorkspaceAdMarketIso2,
} from "@/lib/ad-library/scrape-request-fields";

const base = {
  metaMaxAds: 10,
  metaCountry: "US",
  metaStartDate: "",
  metaEndDate: "",
  metaSortBy: "impressions_desc",
  linkedinMaxAds: 10,
  linkedinDateRange: "past-year",
  linkedinCountryCode: "",
  tiktokMaxAds: 10,
  tiktokStartDate: "",
  tiktokEndDate: "",
  microsoftMaxSearchResults: 10,
  microsoftCountryCode: "66",
  microsoftStartDate: "",
  microsoftEndDate: "",
  pinterestMaxResults: 10,
  pinterestStartDate: "",
  pinterestEndDate: "",
  pinterestGender: "ALL",
  pinterestAge: "ALL",
  snapchatMaxItems: 10,
  snapchatCountry: "DE",
  snapchatStartDate: "",
  snapchatEndDate: "",
};

describe("primaryWorkspaceAdMarketIso2", () => {
  it("returns null for empty or missing list", () => {
    expect(primaryWorkspaceAdMarketIso2(undefined)).toBeNull();
    expect(primaryWorkspaceAdMarketIso2(null)).toBeNull();
    expect(primaryWorkspaceAdMarketIso2([])).toBeNull();
  });

  it("returns first valid ISO2 uppercased", () => {
    expect(primaryWorkspaceAdMarketIso2(["lt"])).toBe("LT");
    expect(primaryWorkspaceAdMarketIso2(["  lt  ", "de"])).toBe("LT");
  });

  it("treats ALL / ANYWHERE as ALL", () => {
    expect(primaryWorkspaceAdMarketIso2(["ALL"])).toBe("ALL");
    expect(primaryWorkspaceAdMarketIso2(["anywhere"])).toBe("ALL");
  });

  it("skips invalid tokens until first ISO2", () => {
    expect(primaryWorkspaceAdMarketIso2(["nope", "", "LITHUANIA", "LT"])).toBe("LT");
  });

  it("returns null when no valid token", () => {
    expect(primaryWorkspaceAdMarketIso2(["bad", "LITHUANIA"])).toBeNull();
  });
});

describe("mergeScrapeFieldsWithWorkspaceMarkets", () => {
  it("overrides metaCountry from workspace markets", () => {
    const merged = mergeScrapeFieldsWithWorkspaceMarkets(base, ["LT"]);
    expect(merged.metaCountry).toBe("LT");
    expect(merged.metaMaxAds).toBe(base.metaMaxAds);
  });

  it("leaves base unchanged when markets missing", () => {
    const merged = mergeScrapeFieldsWithWorkspaceMarkets(base, []);
    expect(merged).toEqual(base);
  });
});
