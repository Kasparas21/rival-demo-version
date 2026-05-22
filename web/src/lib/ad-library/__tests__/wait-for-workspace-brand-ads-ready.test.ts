import { describe, expect, it } from "vitest";
import type { AdsLibraryResponse } from "../api-types";
import {
  expectedAdsCountsFromScrape,
  isWorkspaceBrandAdsLibraryReady,
} from "../wait-for-workspace-brand-ads-ready";

function shell(partial: Partial<AdsLibraryResponse>): AdsLibraryResponse {
  return {
    ok: true,
    configured: true,
    meta: { ads: [], error: null },
    google: { rows: [], error: null },
    linkedin: { ads: [], error: null },
    tiktok: { ads: [], error: null },
    microsoft: { ads: [], error: null },
    pinterest: { ads: [], error: null },
    snapchat: { ads: [], error: null },
    ...partial,
  };
}

describe("wait-for-workspace-brand-ads-ready", () => {
  it("expects counts only for platforms that scraped successfully", () => {
    const scraped = shell({
      meta: { ads: [{ id: "m1" } as never], error: null },
      google: { rows: [], error: "failed" },
    });
    expect(expectedAdsCountsFromScrape(scraped, ["meta", "google"])).toEqual({ meta: 1 });
  });

  it("is ready when every scraped platform has at least one ad in cache", () => {
    const expected = { meta: 2, google: 40 };
    const partialGoogle = shell({
      meta: { ads: [{ id: "a" }, { id: "b" }] as never[], error: null },
      google: { rows: [{ id: "g1" }] as never[], error: null },
    });
    expect(isWorkspaceBrandAdsLibraryReady(partialGoogle, expected)).toBe(true);

    const missingGoogle = shell({
      meta: { ads: [{ id: "a" }, { id: "b" }] as never[], error: null },
      google: { rows: [], error: null },
    });
    expect(isWorkspaceBrandAdsLibraryReady(missingGoogle, expected)).toBe(false);
  });

  it("allows zero-ad platforms when scrape returned zero", () => {
    const expected = { linkedin: 0 };
    const hydrated = shell({ linkedin: { ads: [], error: null } });
    expect(isWorkspaceBrandAdsLibraryReady(hydrated, expected)).toBe(true);
  });
});
