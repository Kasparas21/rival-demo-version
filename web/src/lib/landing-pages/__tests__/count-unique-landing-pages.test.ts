import { describe, expect, it } from "vitest";

import {
  collectUniqueLandingPageKeysFromAds,
  landingPageKeyFromAd,
} from "@/lib/landing-pages/count-unique-landing-pages";

describe("count-unique-landing-pages", () => {
  it("treats different paths and query params as different landing pages", () => {
    const keys = collectUniqueLandingPageKeysFromAds([
      {
        platform: "meta",
        raw_payload: {
          destinationUrl: "https://offer.example.com/page-a?city=vln",
        },
      },
      {
        platform: "meta",
        raw_payload: {
          destinationUrl: "https://offer.example.com/page-a?city=all",
        },
      },
      {
        platform: "meta",
        raw_payload: {
          destinationUrl: "https://offer.example.com/page-b",
        },
      },
    ]);

    expect(keys.size).toBe(3);
  });

  it("dedupes the same normalized landing page across ads", () => {
    const a = landingPageKeyFromAd({
      platform: "meta",
      raw_payload: { destinationUrl: "https://offer.example.com/" },
    });
    const b = landingPageKeyFromAd({
      platform: "meta",
      raw_payload: { destinationUrl: "https://offer.example.com" },
    });

    expect(a).toBeTruthy();
    expect(a).toBe(b);
    expect(
      collectUniqueLandingPageKeysFromAds([
        { platform: "meta", raw_payload: { destinationUrl: "https://offer.example.com/" } },
        { platform: "meta", raw_payload: { destinationUrl: "https://offer.example.com" } },
      ]).size,
    ).toBe(1);
  });
});
