import { describe, expect, it } from "vitest";

import { audienceCopySamples } from "@/lib/comparison/audience-inference";
import { describeMetaAudienceEvidence, metaAudienceEvidence } from "@/lib/comparison/meta-audience-evidence";
import { derivedStatsFromRows } from "@/lib/comparison/scraped-ads-derived-stats";

const NOW = Date.parse("2026-10-07T12:00:00Z");
const daysAgo = (d: number) => new Date(NOW - d * 86_400_000).toISOString();

describe("derivedStatsFromRows", () => {
  it("weighs every ad once, counts categories and live totals", () => {
    const rows = [
      // 3 young TikTok ads and 1 old Meta ad: one ad one vote → (2+2+2+90)/4 = 24.
      ...[1, 2, 3].map(() => ({ platform: "tiktok", format: "video", first_seen_at: daysAgo(2), ai_extracted_angle: "price · Hook: x", ai_extracted_launch_date: null })),
      { platform: "meta", format: "image", first_seen_at: daysAgo(90), ai_extracted_angle: "social_proof · Hook: y", ai_extracted_launch_date: null },
    ];
    expect(derivedStatsFromRows(rows, NOW)).toEqual({
      avgAdAgeDays: 24,
      newAdsLast30d: 3,
      videoPercent: 75,
      uniqueAnglesCount: 2,
      activeAds: 4,
      platformCount: 2,
      asOf: new Date(NOW).toISOString(),
    });
  });

  it("dates an ad from its launch date when known", () => {
    const rows = [{ platform: "meta", format: "image", first_seen_at: daysAgo(1), ai_extracted_angle: null, ai_extracted_launch_date: daysAgo(40) }];
    expect(derivedStatsFromRows(rows, NOW)).toMatchObject({ avgAdAgeDays: 40, newAdsLast30d: 0 });
  });
});

describe("metaAudienceEvidence", () => {
  const breakdown = JSON.stringify([
    {
      country: "LT",
      age_gender_breakdowns: [
        { age_range: "25-34", male: 10, female: 30, unknown: null },
        { age_range: "55-64", male: 10, female: 50, unknown: 0 },
      ],
    },
  ]);
  const ads = [
    {
      platform: "meta",
      raw_payload: {
        age_country_gender_reach_breakdown: breakdown,
        age_audience: { min: 25, max: 65 },
        gender_audience: "All",
        location_audience: [{ name: "Vilnius, Lithuania", type: "CITY", excluded: false }],
      },
    },
    { platform: "meta", raw_payload: {} },
    { platform: "google", raw_payload: {} },
  ];

  it("sums published reach by gender, age and country", () => {
    const e = metaAudienceEvidence(ads)!;
    expect(e).toMatchObject({
      adsWithReach: 1,
      metaAds: 2,
      peopleReached: 100,
      genderPct: { female: 80, male: 20, unknown: 0 },
      agePct: [
        { range: "25-34", pct: 40 },
        { range: "55-64", pct: 60 },
      ],
      countryPct: [{ country: "LT", pct: 100 }],
      targeting: {
        ageRanges: [{ label: "25-65+", ads: 1 }],
        genders: [{ label: "All", ads: 1 }],
        locations: [{ label: "Vilnius, Lithuania", ads: 1 }],
      },
    });
    expect(describeMetaAudienceEvidence(e)).toContain("only 1 of 2 active ads: too few");
    const five = metaAudienceEvidence([...Array(5)].map(() => ads[0]!))!;
    expect(describeMetaAudienceEvidence(five)).toContain("80% women, 20% men");
  });

  it("returns null without Meta ads or data", () => {
    expect(metaAudienceEvidence([{ platform: "google", raw_payload: {} }])).toBeNull();
    expect(metaAudienceEvidence([{ platform: "meta", raw_payload: {} }])).toBeNull();
  });
});

describe("audienceCopySamples", () => {
  it("takes longest-running real copy once each, skipping Google scaffolding", () => {
    const ad = (text: string, platform: string, runDays: number) => ({
      platform,
      ad_text: text,
      first_seen_at: daysAgo(runDays),
      last_seen_at: daysAgo(0),
    });
    const samples = audienceCopySamples([
      ad("Short", "meta", 100),
      ad("Free consultation with a 3D scan this month", "meta", 10),
      ad("Free consultation with a 3D scan this month", "meta", 50),
      ad("All-on-4 implants from 3 799 € with payment in parts", "meta", 30),
    ]);
    expect(samples).toEqual([
      "Free consultation with a 3D scan this month",
      "All-on-4 implants from 3 799 € with payment in parts",
    ]);
  });
});
