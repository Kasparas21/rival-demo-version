import { describe, expect, it } from "vitest";

import { libraryPreviewUrlFromScrapedRow } from "@/lib/saved-ads/library-preview-url";

describe("libraryPreviewUrlFromScrapedRow", () => {
  it("reads Meta img from scraped raw_payload like the detail drawer", () => {
    const url = libraryPreviewUrlFromScrapedRow({
      platform: "meta",
      ad_creative_url: null,
      raw_payload: {
        id: "123",
        headline: "Nike Court Legacy Lift Women's Shoes",
        desc: "Shop Nike",
        cta: "Install Now",
        subtext: "nike.com",
        img: "",
        isVideo: false,
        adLibraryUrl: "https://www.facebook.com/ads/library/?id=123",
        pageName: "Nike",
        snapshot: {
          cards: [{ original_image_url: "https://scontent.xx.fbcdn.net/v/shoe.jpg" }],
        },
      },
    });
    expect(url).toBe("https://scontent.xx.fbcdn.net/v/shoe.jpg");
  });

  it("falls back to ad_creative_url for still images", () => {
    const url = libraryPreviewUrlFromScrapedRow({
      platform: "meta",
      ad_creative_url: "https://scontent.xx.fbcdn.net/v/hero.jpg",
      raw_payload: { id: "x", img: "", isVideo: false },
    });
    expect(url).toBe("https://scontent.xx.fbcdn.net/v/hero.jpg");
  });
});
