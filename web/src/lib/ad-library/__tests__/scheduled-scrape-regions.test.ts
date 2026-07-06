import { describe, expect, it } from "vitest";

import { inferAdLibraryRegionDefaults } from "@/lib/ad-library/infer-ad-library-regions-from-domain";
import { resolveScheduledScrapeRegions } from "@/lib/ad-library/resolve-scheduled-scrape-regions";
import { scheduledAdsPerRefreshForPlatform } from "@/lib/ad-library/scheduled-ads-per-refresh";

describe("resolveScheduledScrapeRegions", () => {
  it("infers ALL meta country for Lithuanian domains when context has no regions", () => {
    const regions = resolveScheduledScrapeRegions("neptunas.lt", null);
    expect(regions.metaCountry).toBe("ALL");
    expect(regions.tiktokRegion).toBe("LT");
  });

  it("prefers persisted regions from ads_library_context", () => {
    const regions = resolveScheduledScrapeRegions("neptunas.lt", {
      regions: { metaCountry: "LT", googleRegion: "LT" },
    });
    expect(regions.metaCountry).toBe("LT");
    expect(regions.googleRegion).toBe("LT");
  });

  it("matches discovery defaults for unknown TLD", () => {
    const inferred = inferAdLibraryRegionDefaults("example.com");
    const resolved = resolveScheduledScrapeRegions("example.com", null);
    expect(resolved.metaCountry).toBe(inferred.metaCountry);
  });
});

describe("scheduledAdsPerRefreshForPlatform", () => {
  it("uses full sweep caps for active meta/google/tiktok", () => {
    expect(scheduledAdsPerRefreshForPlatform("meta", "SECONDARY")).toBe(1000);
    expect(scheduledAdsPerRefreshForPlatform("google", "PRIMARY")).toBe(500);
    expect(scheduledAdsPerRefreshForPlatform("tiktok", "MINIMAL")).toBe(1000);
  });

  it("uses probe limit for inactive platforms", () => {
    expect(scheduledAdsPerRefreshForPlatform("meta", "INACTIVE")).toBe(50);
    expect(scheduledAdsPerRefreshForPlatform("linkedin", "INACTIVE")).toBe(50);
  });

  it("uses refresh limit for non-sweep platforms", () => {
    expect(scheduledAdsPerRefreshForPlatform("linkedin", "SECONDARY")).toBe(100);
    expect(scheduledAdsPerRefreshForPlatform("pinterest", "PRIMARY")).toBe(100);
  });
});
