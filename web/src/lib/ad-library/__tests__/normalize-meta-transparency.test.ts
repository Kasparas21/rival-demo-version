import { describe, expect, it } from "vitest";
import { coerceFacebookDatasetRow, facebookItemToMetaCard } from "@/lib/ad-library/normalize";

describe("Meta transparency persistence", () => {
  it("copies transparency_by_location onto coerced rows and Meta cards", () => {
    const ukTransparency = {
      location_audience: [
        { name: "United Kingdom", num_obfuscated: 0, type: "countries", excluded: false },
      ],
      gender_audience: "All",
      age_audience: { min: 18, max: 65 },
      total_reach: 3859374,
      age_country_gender_reach_breakdown: [
        {
          country: "GB",
          age_gender_breakdowns: [
            { age_range: "25-34", male: 100, female: 90, unknown: 5 },
          ],
        },
      ],
    };

    const raw = {
      ad_archive_id: "2220464445086250",
      page_id: "434174436675167",
      page_name: "Apple",
      transparency_by_location: {
        br_transparency: null,
        eu_transparency: null,
        uk_transparency: ukTransparency,
      },
      snapshot: {
        body: { text: "Heat-forged aluminium." },
      },
    };

    const item = coerceFacebookDatasetRow(raw);
    expect(item.transparency_by_location?.uk_transparency).toEqual(ukTransparency);
    expect(item.location_audience?.some((x) => x.name === "United Kingdom")).toBe(true);
    expect(item.gender_audience).toBe("All");
    expect(item.age_audience?.min).toBe(18);
    expect(item.age_audience?.max).toBe(65);

    const card = facebookItemToMetaCard(item, 0);
    expect(card).not.toBeNull();
    expect(card!.transparency_by_location?.uk_transparency).toEqual(ukTransparency);
    expect(card!.location_audience?.some((x) => x.name === "United Kingdom")).toBe(true);
  });

  it("does not invent transparency when Meta returns null regional blobs", () => {
    const raw = {
      ad_archive_id: "955003577328648",
      page_id: "434174436675167",
      page_name: "Apple",
      transparency_by_location: {
        br_transparency: null,
        eu_transparency: null,
        uk_transparency: null,
      },
      snapshot: {
        body: { text: "Ceramic Shield." },
      },
    };

    const item = coerceFacebookDatasetRow(raw);
    expect(item.location_audience?.length ?? 0).toBe(0);
    expect(item.gender_audience).toBeUndefined();
    expect(item.age_audience).toBeUndefined();
    expect(item.transparency_by_location?.uk_transparency).toBeNull();
  });
});
