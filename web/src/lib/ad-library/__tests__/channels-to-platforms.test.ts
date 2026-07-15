import { describe, expect, it } from "vitest";
import {
  ALL_ADS_API_PLATFORMS,
  channelsQueryToAdsPlatforms,
  filterPlatformIdsToEnabledChannels,
  resolveAdsPlatformsForCompetitorView,
  resolveCompetitorTrackedAdsPlatforms,
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

describe("resolveCompetitorTrackedAdsPlatforms", () => {
  it("uses explicit settings channels when present", () => {
    expect(resolveCompetitorTrackedAdsPlatforms("meta,google", null)).toEqual(["meta", "google"]);
  });

  it("defaults to Meta + Google when selection is unknown", () => {
    expect(resolveCompetitorTrackedAdsPlatforms("", null)).toEqual(["meta", "google"]);
    expect(resolveCompetitorTrackedAdsPlatforms("", {})).toEqual(["meta", "google"]);
  });

  it("infers a partial platform set from filled identifiers", () => {
    expect(
      resolveCompetitorTrackedAdsPlatforms("", { tiktok: "@brand" }),
    ).toEqual(["tiktok"]);
  });
});

describe("channelsQueryToAdsPlatforms", () => {
  it("maps channel ids to API platforms", () => {
    expect(channelsQueryToAdsPlatforms(["meta", "google"])).toEqual(["meta", "google"]);
  });
});

describe("filterPlatformIdsToEnabledChannels", () => {
  it("drops ids for disabled channels", () => {
    expect(
      filterPlatformIdsToEnabledChannels(
        { meta: "1", tiktok: "@brand", google: "g" },
        "meta,google",
      ),
    ).toEqual({ meta: "1", google: "g" });
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
