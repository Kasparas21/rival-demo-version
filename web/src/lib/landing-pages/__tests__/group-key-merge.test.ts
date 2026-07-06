import { describe, expect, it } from "vitest";

import { extractGoogleHostnameLandingKey, extractLandingPageUrl } from "../extract-lp-url";
import { landingPageGroupKey } from "../normalize-url";

describe("landing page group key merge across platforms", () => {
  it("merges Google hostname and Meta apex destination into one key", () => {
    const googlePayload = { type: "google", url: "adidas.com" };
    const metaPayload = { destinationUrl: "https://adidas.com/" };

    const googleHost = extractGoogleHostnameLandingKey("google", googlePayload);
    const metaLp = extractLandingPageUrl("meta", metaPayload);

    expect(googleHost).toBeTruthy();
    expect(metaLp).toBeTruthy();

    const googleKey = landingPageGroupKey(googleHost!);
    const metaKey = landingPageGroupKey(metaLp!);

    expect(googleKey).toBe(metaKey);
  });

  it("does not merge Google hostname with deep Meta paths", () => {
    const googlePayload = { type: "google", url: "adidas.com" };
    const metaPayload = { destinationUrl: "https://adidas.com/hr/sale" };

    const googleKey = landingPageGroupKey(extractGoogleHostnameLandingKey("google", googlePayload)!);
    const metaKey = landingPageGroupKey(extractLandingPageUrl("meta", metaPayload)!);

    expect(googleKey).not.toBe(metaKey);
  });
});
