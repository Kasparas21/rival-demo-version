import { describe, expect, it } from "vitest";

import {
  buildTikTokApifyLibraryQuery,
  parseTikTokAdsLibraryUrl,
} from "@/lib/apify/tiktok-apify-input";

describe("parseTikTokAdsLibraryUrl", () => {
  it("extracts adv_biz_ids and adv_name from library URL", () => {
    const url =
      "https://library.tiktok.com/ads?region=FR&adv_name=LEVI%20STRAUSS%20%26%20CO.&adv_biz_ids=6886458055832109825&query_type=2";
    expect(parseTikTokAdsLibraryUrl(url)).toEqual({
      advertiserBizId: "6886458055832109825",
      advName: "LEVI STRAUSS & CO.",
      queryType: "2",
    });
  });

  it("returns empty for non-library URLs", () => {
    expect(parseTikTokAdsLibraryUrl("https://example.com")).toEqual({});
  });
});

describe("buildTikTokApifyLibraryQuery", () => {
  it("uses url queryType for pasted library URL and passes advertiserBizId", () => {
    const url =
      "https://library.tiktok.com/ads?region=GB&adv_name=ADIDAS&adv_biz_ids=6886458055832109825&query_type=2";
    expect(
      buildTikTokApifyLibraryQuery({
        brandName: "Adidas",
        brandDomain: "adidas.com",
        savedTiktok: url,
      }),
    ).toEqual({
      queryType: "url",
      query: url,
      advertiserBizId: "6886458055832109825",
    });
  });

  it("maps numeric token to advertiserBizId with brand name query", () => {
    expect(
      buildTikTokApifyLibraryQuery({
        brandName: "Adidas",
        brandDomain: "adidas.com",
        savedTiktok: "6886458055832109825",
      }),
    ).toEqual({
      queryType: "2",
      query: "Adidas",
      advertiserBizId: "6886458055832109825",
    });
  });

  it("uses advertiser name queryType for text token", () => {
    expect(
      buildTikTokApifyLibraryQuery({
        brandName: "Nike",
        brandDomain: "nike.com",
        savedTiktok: "NIKE INC",
      }),
    ).toEqual({
      queryType: "2",
      query: "NIKE INC",
    });
  });

  it("falls back to brand label when no saved tiktok", () => {
    expect(
      buildTikTokApifyLibraryQuery({
        brandName: "Admin",
        brandDomain: "adidas.de",
      }),
    ).toEqual({
      queryType: "2",
      query: "Adidas",
    });
  });
});
