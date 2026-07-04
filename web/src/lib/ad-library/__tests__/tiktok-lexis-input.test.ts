import { describe, expect, it } from "vitest";

import {
  buildLexisTikTokActorInput,
  isLexisTikTokActor,
  lexisMaxPagesForAdCap,
} from "@/lib/apify/tiktok-lexis-input";

describe("isLexisTikTokActor", () => {
  it("matches lexis actor id", () => {
    expect(isLexisTikTokActor("lexis-solutions/tiktok-ads-scraper")).toBe(true);
    expect(isLexisTikTokActor("data_xplorer/tiktok-ads-scraper")).toBe(false);
  });
});

describe("lexisMaxPagesForAdCap", () => {
  it("maps ad caps to a small page count (hard cap 5)", () => {
    expect(lexisMaxPagesForAdCap(12)).toBe(1);
    expect(lexisMaxPagesForAdCap(100)).toBe(2);
    expect(lexisMaxPagesForAdCap(300)).toBe(5);
    expect(lexisMaxPagesForAdCap(500)).toBe(5);
  });
});

describe("buildLexisTikTokActorInput", () => {
  it("uses advertiserName from saved text token", () => {
    const { input, confirmedAdvertiserQuery } = buildLexisTikTokActorInput({
      brandName: "Adidas",
      brandDomain: "adidas.com",
      savedTiktok: "ADIDAS AG",
      region: "GB",
      maxAds: 100,
    });
    expect(input.advertiserName).toBe("ADIDAS AG");
    expect(input.country).toBe("GB");
    expect(input.maxPages).toBeGreaterThan(0);
    expect(input.quickSearch).toBe(false);
    expect(input).not.toHaveProperty("startDate");
    expect(input).not.toHaveProperty("endDate");
    expect(confirmedAdvertiserQuery).toBe("ADIDAS AG");
  });

  it("parses advertiser from library URL", () => {
    const url =
      "https://library.tiktok.com/ads?region=GB&adv_name=IKEA%20AG&adv_biz_ids=6876509201124819714&query_type=2";
    const { input } = buildLexisTikTokActorInput({
      brandName: "IKEA",
      savedTiktok: url,
      region: "CH",
      maxAds: 50,
    });
    expect(input.advertiserName).toBe("IKEA AG");
    expect(input.country).toBe("CH");
  });
});
