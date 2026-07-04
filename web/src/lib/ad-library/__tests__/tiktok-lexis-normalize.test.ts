import { describe, expect, it } from "vitest";

import {
  isLexisTikTokDatasetRow,
  mergeTikTokStructuredTargeting,
  tiktokApifyItemToCard,
} from "@/lib/ad-library/normalize";

/** Sample row from `lexis-solutions/tiktok-ads-scraper` (IKEA AG, CH). */
const LEXIS_ROW: Record<string, unknown> = {
  adId: "1868064758433793",
  status: "active",
  adTitle: "IKEA AG",
  adLandingUrl: "https://www.ikea.com/ch/fr/p/example",
  adVideoUrl: "https://library.tiktok.com/api/v1/cdn/video.mp4",
  adVideoCover: "https://p16-common-sign.tiktokcdn.com/cover.jpg",
  adImageUrls: ["https://p16-common-sign.tiktokcdn.com/cover.jpg"],
  adStartDate: 1782000000000,
  adEndDate: 1783036800000,
  advertiserId: "6876509201124819714",
  advertiserName: "IKEA AG",
  advertiserTtUser: {
    username: "ikeaswitzerland",
    display_name: "IKEA Switzerland",
    follower_count: "68.3K",
  },
  advertiserLocation: "Switzerland",
  adImpressions: "10K-100K",
  advertiserPaidForBy: "IKEA AG",
  adEstimatedAudience: "1.3M-1.6M",
  targetingByLocation: [{ region: "CH", impressions: "99K", breakdowns: [] }],
  targetingByAge: [{ region: "CH", "18-24": true, "25-34": true, "35-44": true, "45-54": true, "55+": true }],
  targetingByGender: [{ region: "CH", female: true, male: true, unknown: true }],
};

describe("isLexisTikTokDatasetRow", () => {
  it("detects lexis camelCase rows", () => {
    expect(isLexisTikTokDatasetRow(LEXIS_ROW)).toBe(true);
    expect(isLexisTikTokDatasetRow({ "AD ID": "1", "Advertiser Name": "X" })).toBe(false);
  });
});

describe("mergeTikTokStructuredTargeting (lexis)", () => {
  it("reads targetingByAge and targetingByGender", () => {
    const t = mergeTikTokStructuredTargeting(LEXIS_ROW);
    expect(t.targetAge).toContain("18-24");
    expect(t.targetGender).toContain("Female");
    expect(t.targetRegion).toContain("Switzerland");
  });
});

describe("tiktokApifyItemToCard (lexis)", () => {
  it("maps impressions, dates, TikTok account, and landing URL", () => {
    const card = tiktokApifyItemToCard(LEXIS_ROW, 0, { brandName: "IKEA", brandDomain: "ikea.com" });
    expect(card).not.toBeNull();
    expect(card!.id).toBe("1868064758433793");
    expect(card!.advertiser).toBe("IKEA AG");
    expect(card!.impressions).toBe("10K-100K");
    expect(card!.uniqueUsersSeen).toBe("10K-100K");
    expect(card!.targetAudienceSize).toBe("1.3M-1.6M");
    expect(card!.videoUrl).toContain("library.tiktok.com");
    expect(card!.adUrl).toBe("https://library.tiktok.com/ads/detail/?ad_id=1868064758433793");
    expect(card!.flightStartMs).toBe(1782000000000);
    expect(card!.tiktokUsername).toBe("ikeaswitzerland");
    expect(card!.tiktokDisplayName).toBe("IKEA Switzerland");
    expect(card!.landingUrl).toContain("ikea.com");
    expect(card!.libraryStatus).toBe("active");
    expect(card!.desc).toBe("—");
    expect(card!.desc).not.toContain("ikea.com");
  });

  it("does not put landing/tracking URL in desc (video overlay source)", () => {
    const card = tiktokApifyItemToCard(
      {
        ...LEXIS_ROW,
        adLandingUrl: "https://m.exactag.com/cl.aspx?extProvApi=ikeach-tiktok&extProvId=384",
      },
      0,
    );
    expect(card!.desc).toBe("—");
    expect(card!.landingUrl).toContain("exactag.com");
  });
});
