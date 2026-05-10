import { describe, expect, it } from "vitest";
import {
  canonicalGoogleAdsTransparencyStartUrl,
  extractDomainFromTransparencyDomainSearchUrl,
  isGoogleAdsTransparencyAdvertiserUrl,
} from "@/lib/ad-library/google-transparency-url";

describe("canonicalGoogleAdsTransparencyStartUrl", () => {
  it("accepts advertiser URL and strips query params", () => {
    const raw = "https://adstransparency.google.com/advertiser/AR08888592736429539329?region=ES";
    expect(canonicalGoogleAdsTransparencyStartUrl(raw)).toBe(
      "https://adstransparency.google.com/advertiser/AR08888592736429539329",
    );
  });

  it("accepts www host and normalizes to bare transparency host", () => {
    expect(
      canonicalGoogleAdsTransparencyStartUrl(
        "https://www.adstransparency.google.com/advertiser/AR01234567890123456789",
      ),
    ).toBe("https://adstransparency.google.com/advertiser/AR01234567890123456789");
  });

  it("normalizes advertiser id casing", () => {
    expect(canonicalGoogleAdsTransparencyStartUrl("adstransparency.google.com/advertiser/ar01234567890123456789")).toBe(
      "https://adstransparency.google.com/advertiser/AR01234567890123456789",
    );
  });

  it("accepts scheme-less input", () => {
    expect(canonicalGoogleAdsTransparencyStartUrl("adstransparency.google.com/advertiser/AR1")).toBe(
      "https://adstransparency.google.com/advertiser/AR1",
    );
  });

  it("strips /creative/CR… to advertiser-only URL", () => {
    const raw =
      "https://adstransparency.google.com/advertiser/AR05343765221255151617/creative/CR17553116694019309569?region=anywhere";
    expect(canonicalGoogleAdsTransparencyStartUrl(raw)).toBe(
      "https://adstransparency.google.com/advertiser/AR05343765221255151617",
    );
  });

  it("strips trailing slash on advertiser path", () => {
    expect(canonicalGoogleAdsTransparencyStartUrl("https://adstransparency.google.com/advertiser/AR99/")).toBe(
      "https://adstransparency.google.com/advertiser/AR99",
    );
  });

  it("returns null for transparency home", () => {
    expect(canonicalGoogleAdsTransparencyStartUrl("https://adstransparency.google.com/?region=any")).toBeNull();
  });

  it("returns null for domain search URL (?domain=)", () => {
    expect(
      canonicalGoogleAdsTransparencyStartUrl(
        "https://adstransparency.google.com/?region=any&domain=example.com",
      ),
    ).toBeNull();
    expect(
      canonicalGoogleAdsTransparencyStartUrl(
        "https://adstransparency.google.com/?region=anywhere&domain=voniosguru.com",
      ),
    ).toBeNull();
  });

  it("returns null for domain query with invalid hostname", () => {
    expect(
      canonicalGoogleAdsTransparencyStartUrl(
        "https://adstransparency.google.com/?region=any&domain=evil/path",
      ),
    ).toBeNull();
  });

  it("returns null for bare website domain", () => {
    expect(canonicalGoogleAdsTransparencyStartUrl("nike.com")).toBeNull();
    expect(canonicalGoogleAdsTransparencyStartUrl("https://nike.com")).toBeNull();
  });

  it("returns null for invalid advertiser segment", () => {
    expect(canonicalGoogleAdsTransparencyStartUrl("https://adstransparency.google.com/advertiser/foo")).toBeNull();
  });

  it("returns null for incomplete creative path", () => {
    expect(
      canonicalGoogleAdsTransparencyStartUrl(
        "https://adstransparency.google.com/advertiser/AR05343765221255151617/creative/",
      ),
    ).toBeNull();
  });

  it("returns null for unknown path under advertiser", () => {
    expect(
      canonicalGoogleAdsTransparencyStartUrl(
        "https://adstransparency.google.com/advertiser/AR05343765221255151617/other/stuff",
      ),
    ).toBeNull();
  });
});

describe("extractDomainFromTransparencyDomainSearchUrl", () => {
  it("extracts hostname from domain listing URL", () => {
    expect(
      extractDomainFromTransparencyDomainSearchUrl(
        "https://adstransparency.google.com/?region=anywhere&domain=voniosguru.com",
      ),
    ).toBe("voniosguru.com");
  });

  it("returns null for advertiser URLs", () => {
    expect(
      extractDomainFromTransparencyDomainSearchUrl(
        "https://adstransparency.google.com/advertiser/AR08888592736429539329",
      ),
    ).toBeNull();
  });
});

describe("isGoogleAdsTransparencyAdvertiserUrl", () => {
  it("mirrors canonical non-null", () => {
    expect(isGoogleAdsTransparencyAdvertiserUrl("https://adstransparency.google.com/advertiser/AR1")).toBe(true);
    expect(isGoogleAdsTransparencyAdvertiserUrl("voniosguru.lt")).toBe(false);
  });
});
