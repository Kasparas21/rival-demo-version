import { describe, expect, it } from "vitest";
import {
  mergeWorkspaceScrapeFromSocials,
  scrapeHintsToPlatformIds,
} from "../workspace-ads-setup";

describe("mergeWorkspaceScrapeFromSocials", () => {
  it("does not prefill TikTok, Pinterest, or Snapchat advertiser names from social links", () => {
    const row = mergeWorkspaceScrapeFromSocials(
      "adidas.com",
      {
        websiteUrl: "",
        metaAdsLibraryUrl: "",
        googleAdsTransparencyUrl: "",
        googleAdsDomain: "",
        linkedInUrl: "",
        tiktokKeyword: "",
        pinterestKeyword: "",
        snapchatKeyword: "",
        facebookUrl: "",
        instagramUrl: "",
        tikTokUrl: "",
        youTubeUrl: "",
      },
      [
        { href: "https://www.tiktok.com/@adidas" },
        { href: "https://www.pinterest.com/adidas/" },
        { href: "https://www.snapchat.com/add/adidas" },
      ],
    );

    expect(row.tiktokKeyword).toBe("");
    expect(row.pinterestKeyword).toBe("");
    expect(row.snapchatKeyword).toBe("");
    expect(row.tikTokUrl).toBe("");
  });
});

describe("scrapeHintsToPlatformIds", () => {
  it("uses only explicit keyword fields for TikTok and Pinterest", () => {
    const ids = scrapeHintsToPlatformIds({
      workspaceDomain: "adidas.com",
      channels: ["tiktok", "pinterest", "snapchat"],
      scrape: {
        websiteUrl: "https://adidas.com",
        metaAdsLibraryUrl: "",
        googleAdsTransparencyUrl: "",
        googleAdsDomain: "",
        linkedInUrl: "",
        tiktokKeyword: "",
        pinterestKeyword: "",
        snapchatKeyword: "",
        facebookUrl: "",
        instagramUrl: "",
        tikTokUrl: "https://www.tiktok.com/@adidas",
        youTubeUrl: "",
      },
    });

    expect(ids.tiktok).toBeUndefined();
    expect(ids.pinterest).toBeUndefined();
    expect(ids.snapchat).toBeUndefined();
  });

  it("maps user-entered keywords to platform ids", () => {
    const ids = scrapeHintsToPlatformIds({
      workspaceDomain: "adidas.com",
      channels: ["tiktok", "pinterest", "snapchat"],
      scrape: {
        websiteUrl: "https://adidas.com",
        metaAdsLibraryUrl: "",
        googleAdsTransparencyUrl: "",
        googleAdsDomain: "",
        linkedInUrl: "",
        tiktokKeyword: "Adidas Official",
        pinterestKeyword: "Adidas",
        snapchatKeyword: "adidas",
        facebookUrl: "",
        instagramUrl: "",
        tikTokUrl: "",
        youTubeUrl: "",
      },
    });

    expect(ids.tiktok).toBe("@Adidas Official");
    expect(ids.pinterest).toBe("https://www.pinterest.com/Adidas");
    expect(ids.snapchat).toBe("@adidas");
  });
});
