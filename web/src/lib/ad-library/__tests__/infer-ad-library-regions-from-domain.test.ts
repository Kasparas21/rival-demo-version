import { describe, expect, it } from "vitest";
import {
  inferAdLibraryRegionDefaults,
  inferIso2FromCompetitorDomain,
} from "../infer-ad-library-regions-from-domain";

describe("inferAdLibraryRegionDefaults", () => {
  it("defaults Meta, Google, LinkedIn, and TikTok to all countries regardless of TLD", () => {
    expect(inferAdLibraryRegionDefaults("https://supabase.de")).toMatchObject({
      metaCountry: "ALL",
      googleRegion: "anywhere",
      linkedinCountryCode: "",
      tiktokRegion: "all",
    });
    expect(inferAdLibraryRegionDefaults("https://example.com")).toMatchObject({
      metaCountry: "ALL",
      googleRegion: "anywhere",
      linkedinCountryCode: "",
      tiktokRegion: "all",
    });
  });

  it("guesses Pinterest from ccTLD when supported", () => {
    expect(inferAdLibraryRegionDefaults("https://brand.lt").pinterestCountry).toBe("LT");
    expect(inferAdLibraryRegionDefaults("https://brand.com").pinterestCountry).toBe("DE");
  });
});

describe("inferIso2FromCompetitorDomain", () => {
  it("reads ccTLD when not generic", () => {
    expect(inferIso2FromCompetitorDomain("shop.lt")).toBe("LT");
  });
});
