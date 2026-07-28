import { describe, expect, it } from "vitest";

import { emptyAdsLibraryShell } from "@/lib/ad-library/api-types";
import {
  applyDisabledScrapePlatformErrors,
  isScrapeEnabledForPlatform,
  prepareAdsLibraryScrapePlatforms,
  SCRAPE_DISABLED_PLATFORM_MESSAGE,
  stripDisabledPlatformsFromScrapeSet,
} from "@/lib/ad-library/disabled-scrape-platforms";

describe("disabled-scrape-platforms", () => {
  it("disables linkedin, tiktok, pinterest, and snapchat only", () => {
    expect(isScrapeEnabledForPlatform("meta")).toBe(true);
    expect(isScrapeEnabledForPlatform("google")).toBe(true);
    expect(isScrapeEnabledForPlatform("linkedin")).toBe(false);
    expect(isScrapeEnabledForPlatform("tiktok")).toBe(false);
    expect(isScrapeEnabledForPlatform("pinterest")).toBe(false);
    expect(isScrapeEnabledForPlatform("snapchat")).toBe(false);
  });

  it("strips disabled platforms from scrape sets", () => {
    const next = stripDisabledPlatformsFromScrapeSet(
      new Set(["meta", "linkedin", "google", "tiktok"]),
    );
    expect([...next].sort()).toEqual(["google", "meta"]);
  });

  it("marks disabled requested platforms with a stable error", () => {
    const out = emptyAdsLibraryShell();
    applyDisabledScrapePlatformErrors(out, new Set(["meta", "pinterest", "snapchat"]));
    expect(out.meta.error).toBeNull();
    expect(out.pinterest.error).toBe(SCRAPE_DISABLED_PLATFORM_MESSAGE);
    expect(out.snapchat.error).toBe(SCRAPE_DISABLED_PLATFORM_MESSAGE);
  });

  it("prepareAdsLibraryScrapePlatforms removes disabled platforms and sets errors", () => {
    const out = emptyAdsLibraryShell();
    const prepared = prepareAdsLibraryScrapePlatforms({
      out,
      platformsRequested: new Set(["meta", "linkedin"]),
      platformsNeedingScrape: new Set(["meta", "linkedin"]),
    });
    expect([...prepared]).toEqual(["meta"]);
    expect(out.linkedin.error).toBe(SCRAPE_DISABLED_PLATFORM_MESSAGE);
  });
});
