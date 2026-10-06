import { describe, expect, it } from "vitest";

import { advertiserNameMatchesBrand, brandMatchCandidates, domainBrandLabel } from "@/lib/ad-library/advertiser-name-match";

describe("advertiserNameMatchesBrand", () => {
  it("accepts the brand's own legal and regional entities", () => {
    expect(advertiserNameMatchesBrand("NIKE Retail B.V.", ["Nike"])).toBe(true);
    expect(advertiserNameMatchesBrand("Nike, Inc.", ["Nike"])).toBe(true);
    expect(advertiserNameMatchesBrand("Rothy's Inc", ["rothys"])).toBe(true);
    expect(advertiserNameMatchesBrand("All Birds", ["Allbirds"])).toBe(true);
    expect(advertiserNameMatchesBrand("Allbirds Japan", ["Allbirds"])).toBe(true);
    expect(advertiserNameMatchesBrand("adidas AG", ["adidas"])).toBe(true);
  });

  it("rejects lookalikes and resellers returned by name searches", () => {
    expect(advertiserNameMatchesBrand("Nikenza Viceconte, PhD", ["Nike"])).toBe(false);
    expect(advertiserNameMatchesBrand("Nike Boor", ["Nike Boots"])).toBe(false);
    expect(advertiserNameMatchesBrand("Unisport A/S", ["Nike"])).toBe(false);
    expect(advertiserNameMatchesBrand("sportschnapper.at", ["Nike"])).toBe(false);
    expect(advertiserNameMatchesBrand("Work With Nike", ["Nike"])).toBe(false);
    expect(advertiserNameMatchesBrand("Nike DEI Workplace Discrimination", ["Nike"])).toBe(false);
    expect(advertiserNameMatchesBrand("", ["Nike"])).toBe(false);
  });

  it("ignores one-letter candidates", () => {
    expect(advertiserNameMatchesBrand("X Corp", ["x"])).toBe(false);
  });
});

describe("brandMatchCandidates / domainBrandLabel", () => {
  it("drops blanks and generic placeholders", () => {
    expect(brandMatchCandidates("Nike", "", null, "Admin", "nike")).toEqual(["Nike", "nike"]);
  });

  it("reads the label from a domain", () => {
    expect(domainBrandLabel("https://www.rothys.com/shop")).toBe("rothys");
    expect(domainBrandLabel(null)).toBeNull();
  });
});
