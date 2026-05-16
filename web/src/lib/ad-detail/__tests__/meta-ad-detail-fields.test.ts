import { describe, expect, it } from "vitest";
import {
  formatMetaPublisherPlatformsLine,
  metaAgeAudienceDetailLabel,
  metaEuRegionDetailLabel,
  metaGenderAudienceDetailLabel,
  metaLocationAudienceDetailLabel,
  metaPrimaryDescriptionFromPayload,
  metaPublisherDetailRows,
  metaTargetMarketFooterLine,
  metaTargetingRegionDisplayLine,
  metaTitleFromPayload,
} from "@/lib/ad-detail/meta-ad-detail-fields";

describe("meta ad detail helpers", () => {
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
