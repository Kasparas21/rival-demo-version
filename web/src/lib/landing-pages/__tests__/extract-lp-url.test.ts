import { describe, expect, it } from "vitest";

import { extractLandingPageUrl } from "../extract-lp-url";

describe("extractLandingPageUrl — snapchat", () => {
  it("returns null for Snapchat Ads Gallery URLs", () => {
    const payload = {
      adUrl: "https://adsgallery.snap.com/?advertiser=adidas",
    };
    expect(extractLandingPageUrl("snapchat", payload)).toBeNull();
  });

  it("returns null for snapchat.com/ads library URLs", () => {
    const payload = {
      adUrl: "https://www.snapchat.com/ads/some-ad-id",
    };
    expect(extractLandingPageUrl("snapchat", payload)).toBeNull();
  });

  it("returns normalized URL for off-platform destinations", () => {
    const payload = {
      adUrl: "https://www.adidas.com/us?utm_source=snap",
    };
    expect(extractLandingPageUrl("snapchat", payload)).toBe("https://adidas.com/us");
  });
});
