import { describe, expect, it } from "vitest";
import {
  formatMetaPublisherPlatformsLine,
  metaAgeAudienceDetailLabel,
  metaEuRegionDetailLabel,
  metaGenderAudienceDetailLabel,
  metaLocationAudienceDetailLabel,
  metaLocationAudienceRows,
  metaPrimaryDescriptionFromPayload,
  metaPublisherDetailRows,
  metaReachBreakdownDisplayLines,
  metaReachBreakdownDrawerGroups,
  metaTargetMarketFooterLine,
  metaTargetsEuExplicit,
  metaTargetingRegionDisplayLine,
  metaTitleFromPayload,
  metaTotalReachImpressionsLabel,
} from "@/lib/ad-detail/meta-ad-detail-fields";

describe("meta ad detail helpers", () => {
  it("formats impressions from total reach, EU reach, impressions_text, and nested scrape blobs", () => {
    expect(metaTotalReachImpressionsLabel({ total_reach: 41250 })).toBe("41,250");
    expect(metaTotalReachImpressionsLabel({ totalReach: "10,000-25,000" })).toBe("10k – 25k");
    expect(metaTotalReachImpressionsLabel({ reach: { totalEU: "< 5000" } })).toBe("< 5000");
    expect(
      metaTotalReachImpressionsLabel({
        adsLibraryItem: {
          impressions_with_index: {
            impressions_text: "350,000 accounts reached · EU",
          },
        },
      })
    ).toBe("350,000 accounts reached · EU");
    expect(
      metaTotalReachImpressionsLabel({
        outer: {
          scrape: {
            total_reach: 5000,
          },
        },
      })
    ).toBe("5,000");
    expect(metaTotalReachImpressionsLabel({})).toBeNull();
  });

  it("formats publisher_platform as human labels", () => {
    expect(
      formatMetaPublisherPlatformsLine({
        publisher_platform: ["FACEBOOK", "INSTAGRAM", "THREADS"],
      })
    ).toBe("Facebook · Instagram · Threads");
    const rows = metaPublisherDetailRows({ publisher_platform: ["FACEBOOK", "INSTAGRAM"] });
    expect(rows?.map((r) => r.key)).toEqual(["FACEBOOK", "INSTAGRAM"]);
  });

  it("maps EU region when targets_eu is true", () => {
    expect(metaEuRegionDetailLabel({ targets_eu: true })).toBe("EU");
    expect(metaEuRegionDetailLabel({ targetsEu: true })).toBe("EU");
    expect(metaEuRegionDetailLabel({ targets_eu: false })).toBeNull();
  });

  it("formats granular location_audience", () => {
    expect(
      metaLocationAudienceDetailLabel({
        location_audience: [{ name: "France", type: "countries", excluded: false }],
      })
    ).toBe("France");
    expect(metaLocationAudienceDetailLabel({ locationAudience: [{ name: "Belgium", excluded: true }] })).toBe(
      "Exclude Belgium"
    );
  });

  it("reads Meta transparency fields nested anywhere in the scrape blob", () => {
    expect(
      metaLocationAudienceDetailLabel({
        headline: "X",
        adsLibraryItem: {
          location_audience: [{ name: "France", type: "countries", excluded: false }],
          gender_audience: "All",
          age_audience: { min: 18, max: 44 },
        },
      })
    ).toBe("France");
    expect(
      metaLocationAudienceDetailLabel({
        transparency_by_location: {
          uk_transparency: {
            location_audience: [{ name: "United Kingdom", type: "countries", excluded: false }],
          },
        },
      })
    ).toBe("United Kingdom");
    expect(
      metaAgeAudienceDetailLabel({
        snapshot: {},
        targeting: {
          age_audience: { min: 18, max: 44 },
        },
      })
    ).toBe("18–44");
    expect(metaGenderAudienceDetailLabel({ json: { genderAudience: "Men" } })).toBe("Men");
    expect(metaEuRegionDetailLabel({ outer: { targets_eu: true } })).toBe("EU");
  });

  it("reads explicit targets_eu from scraper payloads", () => {
    expect(metaTargetsEuExplicit({ targets_eu: true })).toBe(true);
    expect(metaTargetsEuExplicit({ targetsEu: true })).toBe(true);
    expect(metaTargetsEuExplicit({ targets_eu: false })).toBe(false);
    expect(metaTargetsEuExplicit({ targetsEu: "false" })).toBe(false);
    expect(metaTargetsEuExplicit({ targets_eu: "true" })).toBe(true);
    expect(metaTargetsEuExplicit({})).toBeNull();
  });

  it("dedupes location_audience rows for lists", () => {
    expect(
      metaLocationAudienceRows({
        location_audience: [
          { name: "France", type: "countries", excluded: false },
          { name: "France", type: "countries", excluded: false },
          { name: "Spain", excluded: false },
        ],
      })
    ).toEqual([
      { name: "France", type: "countries" },
      { name: "Spain" },
    ]);
  });

  it("flattens age_country_gender_reach_breakdown for detail lists", () => {
    expect(
      metaReachBreakdownDisplayLines({
        age_country_gender_reach_breakdown: [
          { age_range: "25-34", country: "DE", female: 1, male: 2 },
        ],
      })
    ).toEqual(["DE · 25-34 · Female 1 · Male 2"]);

    expect(
      metaReachBreakdownDisplayLines({
        age_country_gender_reach_breakdown: [
          {
            country: "FR",
            age_gender_breakdowns: [{ age_range: "35-44", female: 5, male: 0 }],
          },
        ],
      })
    ).toEqual(["FR · 35-44 · Female 5 · Male 0"]);

    expect(
      metaReachBreakdownDisplayLines({
        outer: {
          deep: {
            ageCountryGenderReachBreakdown: [{ gender: "female", percentage: "12%" }],
          },
        },
      })
    ).toEqual(["female · 12%"]);
  });

  it("groups demographic breakdown by country and reads reach rows inside array-wrapped scrape blobs", () => {
    const gbBreakdown = {
      country: "GB",
      age_gender_breakdowns: [
        { age_range: "Unknown", male: 6, female: null, unknown: 3 },
        { age_range: "18-24", male: 14761, female: 1177, unknown: 402 },
      ],
    };

    expect(
      metaReachBreakdownDrawerGroups({
        age_country_gender_reach_breakdown: [gbBreakdown],
      })
    ).toEqual([
      {
        headline: "GB",
        lines: [],
        countRows: [
          { ageRange: "18-24", female: 1177, male: 14761, unknown: 402 },
          { ageRange: "Unknown", female: null, male: 6, unknown: 3 },
        ],
      },
    ]);

    const shuffledBands = ["45-54", "18-24", "Unknown", "65+", "55-64", "35-44", "25-34"];
    expect(
      metaReachBreakdownDrawerGroups({
        age_country_gender_reach_breakdown: [
          {
            country: "GB",
            age_gender_breakdowns: shuffledBands.map((age_range) => ({
              age_range,
              male: 1,
              female: 1,
              unknown: 1,
            })),
          },
        ],
      })[0].countRows?.map((r) => r.ageRange)
    ).toEqual(["18-24", "25-34", "35-44", "45-54", "55-64", "65+", "Unknown"]);

    expect(
      metaReachBreakdownDrawerGroups({
        results: [
          {
            adsLibraryItem: {
              age_country_gender_reach_breakdown: [
                { country: "IE", age_gender_breakdowns: [{ age_range: "45-54", male: 100, female: 200 }] },
              ],
            },
          },
        ],
      })
    ).toEqual([
      {
        headline: "IE",
        lines: [],
        countRows: [{ ageRange: "45-54", female: 200, male: 100, unknown: null }],
      },
    ]);
  });

  it("reads location_audience rows nested inside arrays", () => {
    expect(
      metaLocationAudienceRows({
        results: [
          {
            adsLibraryItem: {
              location_audience: [{ name: "United Kingdom", type: "countries", excluded: false }],
            },
          },
        ],
      })
    ).toEqual([{ name: "United Kingdom", type: "countries" }]);
  });

  it("formats age_audience numeric bands", () => {
    expect(metaAgeAudienceDetailLabel({ age_audience: { min: 18, max: 44 } })).toBe("18–44");
    expect(metaAgeAudienceDetailLabel({ ageAudience: { min: 25 } })).toBe("25+");
  });

  it("passes through gender_audience copy from the scraper", () => {
    expect(metaGenderAudienceDetailLabel({ gender_audience: "All" })).toBe("All");
    expect(metaGenderAudienceDetailLabel({ genderAudience: "Men" })).toBe("Men");
  });

  it("prefers granular locations when EU flag also set", () => {
    expect(
      metaTargetingRegionDisplayLine({
        targets_eu: true,
        location_audience: [{ name: "France" }],
      })
    ).toBe("France");
    expect(metaTargetingRegionDisplayLine({ targets_eu: true })).toBe("EU");
  });

  it("builds a compact footer line for scraped targeting", () => {
    expect(
      metaTargetMarketFooterLine({
        location_audience: [{ name: "France" }],
        age_audience: { min: 18, max: 44 },
        gender_audience: "All",
      })
    ).toBe("France · 18–44 · All");
    expect(metaTargetMarketFooterLine({ targets_eu: true })).toBe("EU");
  });

  it("extracts Meta title (link headline)", () => {
    expect(metaTitleFromPayload({ headline: "Samba Classic Boots" })).toBe("Samba Classic Boots");
    expect(metaTitleFromPayload({ linkHeadline: "A", headline: "B" })).toBe("A");
    expect(metaTitleFromPayload({})).toBeNull();
  });

  it("extracts Meta primary description", () => {
    expect(metaPrimaryDescriptionFromPayload({ desc: "Take it up a notch" })).toBe("Take it up a notch");
    expect(metaPrimaryDescriptionFromPayload({})).toBeNull();
  });
});
