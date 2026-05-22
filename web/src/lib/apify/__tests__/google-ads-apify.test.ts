import { describe, expect, it } from "vitest";
import {
  extractGoogleApifyFailureMessage,
  isLikelyGoogleAdRow,
  readGoogleResidentialProxyGroups,
} from "@/lib/apify/google-ads";

describe("google Apify error rows", () => {
  it("detects captcha / proxy failure status rows", () => {
    const msg = extractGoogleApifyFailureMessage({
      status:
        "Failed to fetch ads for advertiser AR11867219592055095297: Unable to reach Google Ads Transparency (blocked after 5 proxy rotations).",
      advertiserName: null,
      headline: null,
    });
    expect(msg).toMatch(/Unable to reach Google Ads Transparency/i);
  });

  it("does not treat real ad rows as failures", () => {
    expect(
      isLikelyGoogleAdRow({
        headline: "Summer sale",
        previewUrl: "https://example.com/preview.jpg",
      }),
    ).toBe(true);
    expect(
      isLikelyGoogleAdRow({
        status: "Failed to fetch ads",
        headline: null,
      }),
    ).toBe(false);
  });
});

describe("google residential proxy config", () => {
  it("defaults to RESIDENTIAL unless APIFY_GOOGLE_USE_RESIDENTIAL=false", () => {
    const prev = process.env.APIFY_GOOGLE_USE_RESIDENTIAL;
    delete process.env.APIFY_GOOGLE_USE_RESIDENTIAL;
    expect(readGoogleResidentialProxyGroups()).toEqual(["RESIDENTIAL"]);

    process.env.APIFY_GOOGLE_USE_RESIDENTIAL = "false";
    expect(readGoogleResidentialProxyGroups()).toEqual([]);

    if (prev === undefined) delete process.env.APIFY_GOOGLE_USE_RESIDENTIAL;
    else process.env.APIFY_GOOGLE_USE_RESIDENTIAL = prev;
  });
});
