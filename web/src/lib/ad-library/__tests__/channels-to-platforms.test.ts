import { describe, expect, it } from "vitest";
import {
  ALL_ADS_API_PLATFORMS,
  channelsQueryToAdsPlatforms,
  resolveAdsPlatformsForCompetitorView,
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
