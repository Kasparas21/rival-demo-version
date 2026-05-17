import { describe, expect, it } from "vitest";
import {
  formatGoogleTransparencyRegionImpressionsPerLine,
  googleTransparencyImpressionsCollapsedHeadline,
  summarizeGoogleTransparencyRegionLocations,
  sumGoogleTransparencyImpressionsCapsExcludingUk,
} from "@/lib/ad-library/google-region-stats";

describe("google-region-stats", () => {
  it("UK/GB territories use em dash instead of impression count", () => {
    const lines = formatGoogleTransparencyRegionImpressionsPerLine([
      { region: "GB", impressionsMax: 999_999 },
      { region: "United Kingdom", impressionsMax: 1 },
    ])!;

    const parts = lines.split("\n");
    expect(parts.every((ln) => ln === "United Kingdom · -")).toBe(true);
    expect(parts.length).toBe(2);
    expect(parts.every((ln) => !/\d/.test(ln))).toBe(true);
  });

  it("non-UK regions use · up to {formatted cap}", () => {
    const out = formatGoogleTransparencyRegionImpressionsPerLine([
      { region: "IE", impressionsMax: 1000 },
      { region: "NL", impressionsMax: 1000 },
      { region: "ES", impressionsMax: 2500000 },
    ]);
    expect(out).toContain("Ireland · up to 1,000");
    expect(out).toContain("Netherlands · up to 1,000");
    expect(out).toContain("Spain · up to 2,500,000");
    expect(out).not.toContain("last shown ");
  });

  it("summarizeGoogleTransparencyRegionLocations still dedupes and expands ISO regions", () => {
    expect(
      summarizeGoogleTransparencyRegionLocations([
        { region: "NL" },
        { region: "nl" },
        { region: "GB" },
      ])
    ).toContain("United Kingdom");

    expect(
      summarizeGoogleTransparencyRegionLocations([
        { region: "NL" },
        { region: "GB" },
      ])
    ).toMatch(/Netherlands/);
  });

  it("collapsed headline sums disclosed caps excluding UK territories", () => {
    const stats = [
      { region: "IT", impressionsMax: 1000 },
      { region: "ES", impressionsMax: 1000 },
      { region: "PT", impressionsMax: 1000 },
      { region: "GB" },
      { region: "IE", impressionsMax: 2000 },
      { region: "DE", impressionsMax: 1000 },
      { region: "GR", impressionsMax: 1000 },
      { region: "FR", impressionsMax: 1000 },
    ];
    expect(sumGoogleTransparencyImpressionsCapsExcludingUk(stats)).toBe(8000);
    expect(googleTransparencyImpressionsCollapsedHeadline(stats)).toBe("About 8,000");
  });

  it("when every territory is UK-like or omit caps use regional breakdown headline", () => {
    expect(
      googleTransparencyImpressionsCollapsedHeadline([
        { region: "GB" },
        { region: "UK", impressionsMax: 999 },
      ])
    ).toBe("Regional breakdown · 2 territories");
  });

  it("single-territory disclosure without summed caps keeps short headline", () => {
    expect(googleTransparencyImpressionsCollapsedHeadline([{ region: "GB" }])).toBe("Regional disclosure");
  });
});
