import { describe, expect, it } from "vitest";
import {
  ALL_ADS_API_PLATFORMS,
  channelsQueryToAdsPlatforms,
  channelsReadyForAdsLibraryScan,
  resolveAdsPlatformsForCompetitorView,
  unionAdsPlatformsFromSources,
} from "../channels-to-platforms";

describe("resolveAdsPlatformsForCompetitorView", () => {
  it("uses explicit channels when present", () => {
    expect(resolveAdsPlatformsForCompetitorView("google", null)).toEqual(["google"]);
  });

  it("infers platforms from filled identifiers when channels missing", () => {
    expect(
      resolveAdsPlatformsForCompetitorView("", { google: "https://adstransparency.google.com/..." })
    ).toEqual(["google"]);
  });

  it("falls back to all platforms for cache hydration when selection unknown", () => {
    expect(resolveAdsPlatformsForCompetitorView("", null)).toEqual(ALL_ADS_API_PLATFORMS);
    expect(resolveAdsPlatformsForCompetitorView("", {})).toEqual(ALL_ADS_API_PLATFORMS);
  });
});

describe("channelsQueryToAdsPlatforms", () => {
  it("maps channel ids to API platforms", () => {
    expect(channelsQueryToAdsPlatforms(["meta", "google"])).toEqual(["meta", "google"]);
  });
});

describe("channelsReadyForAdsLibraryScan", () => {
  it("includes TikTok when channel is selected even without a saved advertiser id", () => {
    expect(
      channelsReadyForAdsLibraryScan(["tiktok", "google"], { google: "https://example.com" }),
    ).toEqual(["tiktok", "google"]);
  });

  it("still requires Meta page id or URL", () => {
    expect(channelsReadyForAdsLibraryScan(["meta", "tiktok"], {})).toEqual(["tiktok"]);
  });
});

describe("unionAdsPlatformsFromSources", () => {
  it("keeps platforms from every source instead of letting a partial sidebar context win", () => {
    expect(
      unionAdsPlatformsFromSources(
        { channelsCsv: "meta,tiktok" },
        { channelsCsv: "meta,google,linkedin,pinterest,snapchat" },
      ),
    ).toEqual(["meta", "google", "linkedin", "tiktok", "pinterest", "snapchat"]);
  });
});
