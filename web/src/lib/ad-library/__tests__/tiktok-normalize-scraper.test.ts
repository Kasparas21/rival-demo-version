import { describe, expect, it } from "vitest";

import {
  mergeTikTokStructuredTargeting,
  tiktokApifyItemToCard,
} from "@/lib/ad-library/normalize";

/** Fixture from `data_xplorer/tiktok-ads-scraper` library docs (fetchDetails). */
const LIBRARY_ROW_FIXTURE: Record<string, unknown> = {
  "AD ID": "1867625146670401",
  "Advertiser Name": "COCA COLA HBC POLSKA SP Z O O",
  "Ad Title": "Wygrywaj!",
  "AD Preview": "https://p16-common-sign.tiktokcdn.com/preview.jpg",
  "Ad Dates": [
    { FirstShown: "2026-06-12", FirstShownTimestamp: 1781222400 },
    { LastShown: "2026-06-14", LastShownTimestamp: 1781395200 },
  ],
  "Ad Audience": { raw: "1M-10M", min: 1000000, max: 10000000 },
  "Ad Reach": {
    total_region: 1,
    total_impressions: { raw: "1M-10M", min: 1000000, max: 10000000 },
    by_country: [],
  },
  "Ad Targeting": {
    regions: ["PL"],
    age: ["18-24", "25-34", "35-44"],
    gender: ["female", "male", "unknown"],
  },
  Advertiser: {
    name: "COCA COLA HBC POLSKA SP Z O O",
    adv_biz_ids: "6876461641299395330",
  },
  "Ad Target Audience Size": { raw: "11.7M-14.2M", min: 11700000, max: 14200000 },
  "Ad Detail URL": "https://library.tiktok.com/ads/detail/?ad_id=1867625146670401",
  "Ad Media": [
    "Video 1: https://library.tiktok.com/api/v1/cdn/video.mp4",
    "Image 1: https://p16-common-sign.tiktokcdn.com/cover.jpg",
  ],
};

describe("mergeTikTokStructuredTargeting (scraper string arrays)", () => {
  it("maps Ad Targeting string arrays to card fields", () => {
    expect(mergeTikTokStructuredTargeting(LIBRARY_ROW_FIXTURE)).toEqual({
      targetRegion: "Poland (PL)",
      targetAge: "18-24, 25-34, 35-44",
      targetGender: "Female, Male, Unknown",
    });
  });
});

describe("tiktokApifyItemToCard (scraper library row)", () => {
  it("maps metric objects, Ad Title, and nested Advertiser", () => {
    const card = tiktokApifyItemToCard(LIBRARY_ROW_FIXTURE, 0, {
      brandName: "Coca-Cola",
      brandDomain: "coca-cola.com",
    });
    expect(card).not.toBeNull();
    expect(card!.id).toBe("1867625146670401");
    expect(card!.headline).toBe("Wygrywaj!");
    expect(card!.advertiser).toBe("COCA COLA HBC POLSKA SP Z O O");
    expect(card!.uniqueUsersSeen).toBe("1M-10M");
    expect(card!.targetAudienceSize).toBe("11.7M-14.2M");
    expect(card!.targetRegion).toBe("Poland (PL)");
    expect(card!.targetAge).toBe("18-24, 25-34, 35-44");
    expect(card!.targetGender).toBe("Female, Male, Unknown");
    expect(card!.img).toContain("tiktokcdn.com");
  });
});
