import { describe, expect, it } from "vitest";

import { readTiktokRegionFromAdsLibraryContext } from "@/lib/ad-library/read-region-from-ads-library-context";

describe("readTiktokRegionFromAdsLibraryContext", () => {
  it("reads tiktokRegion from context.regionPrefs", () => {
    expect(
      readTiktokRegionFromAdsLibraryContext(
        { regionPrefs: { tiktokRegion: "DE" } },
        "example.com",
      ),
    ).toBe("DE");
  });

  it("infers all countries when context has no region", () => {
    expect(readTiktokRegionFromAdsLibraryContext({}, "adidas.de")).toBe("all");
  });

  it("defaults to all for generic TLD", () => {
    expect(readTiktokRegionFromAdsLibraryContext(null, "nike.com")).toBe("all");
  });
});
