import { describe, expect, it } from "vitest";

import {
  buildTikTokAdLibraryDetailUrl,
  isTikTokAdLibraryId,
  resolveTikTokAdIdFromPayload,
  resolveTikTokAdLibraryUrlFromPayload,
  tiktokAdIdFromLibraryUrl,
} from "@/lib/ad-library/tiktok-ad-library-url";

describe("buildTikTokAdLibraryDetailUrl", () => {
  it("uses ?ad_id= query format", () => {
    expect(buildTikTokAdLibraryDetailUrl("1867625146670401")).toBe(
      "https://library.tiktok.com/ads/detail/?ad_id=1867625146670401",
    );
  });

  it("falls back to ads search when id is not numeric", () => {
    expect(buildTikTokAdLibraryDetailUrl("tt-0")).toBe("https://library.tiktok.com/ads");
  });
});

describe("tiktokAdIdFromLibraryUrl", () => {
  it("parses ?ad_id= query param", () => {
    expect(
      tiktokAdIdFromLibraryUrl("https://library.tiktok.com/ads/detail/?ad_id=1867625146670401"),
    ).toBe("1867625146670401");
  });

  it("parses legacy /detail/{id} path", () => {
    expect(tiktokAdIdFromLibraryUrl("https://library.tiktok.com/ads/detail/1867625146670401")).toBe(
      "1867625146670401",
    );
  });
});

describe("resolveTikTokAdLibraryUrlFromPayload", () => {
  it("normalizes scraper detail URL to canonical query format", () => {
    expect(
      resolveTikTokAdLibraryUrlFromPayload({
        id: "1867625146670401",
        adUrl: "https://library.tiktok.com/ads/detail/?ad_id=1867625146670401",
      }),
    ).toBe("https://library.tiktok.com/ads/detail/?ad_id=1867625146670401");
  });

  it("builds from numeric adId when library URL missing", () => {
    expect(
      resolveTikTokAdLibraryUrlFromPayload({
        adId: "1868064758433793",
        id: "1868064758433793",
      }),
    ).toBe("https://library.tiktok.com/ads/detail/?ad_id=1868064758433793");
  });

  it("rejects synthetic tt-N ids", () => {
    expect(resolveTikTokAdIdFromPayload({ id: "tt-0" })).toBeNull();
    expect(isTikTokAdLibraryId("tt-0")).toBe(false);
  });
});
