import { describe, expect, it } from "vitest";

import { emptyAdsLibraryShell } from "@/lib/ad-library/api-types";
import {
  adsLibraryResponseMissingExpectedPlatforms,
  platformHasScrapedLibraryData,
} from "@/lib/ad-library/library-response-utils";

describe("adsLibraryResponseMissingExpectedPlatforms", () => {
  it("detects meta-only cache when google and linkedin are expected", () => {
    const shell = emptyAdsLibraryShell();
    shell.meta.ads = [{ id: "m1" } as never];
    expect(
      adsLibraryResponseMissingExpectedPlatforms(shell, ["meta", "google", "linkedin"]),
    ).toBe(true);
  });

  it("uses hydrate metadata to decide completeness", () => {
    const shell = emptyAdsLibraryShell();
    shell.meta.ads = [{ id: "m1" } as never];
    shell.google.rows = [{ id: "g1" } as never];
    expect(
      adsLibraryResponseMissingExpectedPlatforms(shell, ["meta", "google", "linkedin"], {
        platforms: [
          { platform: "meta", id: "1", scraped_at: "2026-01-01T00:00:00.000Z" },
          { platform: "google", id: "2", scraped_at: "2026-01-01T00:00:00.000Z" },
          { platform: "linkedin", id: "3", scraped_at: "2026-01-02T00:00:00.000Z" },
        ],
      }),
    ).toBe(true);
    shell.linkedin.ads = [{ id: "l1" } as never];
    expect(
      adsLibraryResponseMissingExpectedPlatforms(shell, ["meta", "google", "linkedin"], {
        platforms: [
          { platform: "meta", id: "1", scraped_at: "2026-01-01T00:00:00.000Z" },
          { platform: "google", id: "2", scraped_at: "2026-01-01T00:00:00.000Z" },
          { platform: "linkedin", id: "3", scraped_at: "2026-01-02T00:00:00.000Z" },
        ],
      }),
    ).toBe(false);
  });
});

describe("platformHasScrapedLibraryData", () => {
  it("returns false for never-scraped platforms with empty shell", () => {
    const shell = emptyAdsLibraryShell();
    expect(platformHasScrapedLibraryData("meta", shell)).toBe(false);
    expect(platformHasScrapedLibraryData("pinterest", shell)).toBe(false);
  });

  it("returns false when scrape failed", () => {
    const shell = emptyAdsLibraryShell();
    shell.meta.error = "Apify actor run aborted";
    expect(platformHasScrapedLibraryData("meta", shell)).toBe(false);
  });

  it("returns true when ads exist", () => {
    const shell = emptyAdsLibraryShell();
    shell.google.rows = [{ id: "g1" } as never];
    expect(platformHasScrapedLibraryData("google", shell)).toBe(true);
  });

  it("returns false for successful empty scrape", () => {
    const shell = emptyAdsLibraryShell();
    expect(platformHasScrapedLibraryData("linkedin", shell)).toBe(false);
    expect(
      platformHasScrapedLibraryData("pinterest", shell, { activeAdCount: 0 }),
    ).toBe(false);
  });

  it("uses activeAdCount while adLib is not loaded yet", () => {
    expect(platformHasScrapedLibraryData("tiktok", null, { activeAdCount: 12 })).toBe(true);
    expect(platformHasScrapedLibraryData("tiktok", null, { activeAdCount: 0 })).toBe(false);
    expect(platformHasScrapedLibraryData("tiktok", null)).toBe(false);
  });
});
