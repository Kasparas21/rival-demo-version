import { describe, expect, it } from "vitest";

import type { BenchmarkEntityMetrics, BenchmarkPayload } from "@/lib/benchmark/benchmark-types";

import {
  applyDemoInsightsBenchmarkFilter,
  isDemoInsightsAllowedCompetitor,
  shouldFilterInsightsToNikeAdidasDemo,
} from "../demo-insights-filter";

function entity(
  partial: Partial<BenchmarkEntityMetrics> & Pick<BenchmarkEntityMetrics, "id" | "name" | "isOwnBrand">,
): BenchmarkEntityMetrics {
  return {
    domain: partial.name.toLowerCase(),
    logoUrl: null,
    brandLogoUrl: null,
    lastScrapedAt: null,
    fingerprint: "fp",
    activityScore: 50,
    activeAdCount: 100,
    newAdsThisPeriod: 5,
    platformsActive: {
      meta: true,
      google: true,
      tiktok: false,
      linkedin: false,
      pinterest: false,
      snapchat: false,
    },
    platformsActiveCount: 2,
    creativeFreshnessDays: 10,
    extractedAngles: [],
    ...partial,
  };
}

function minimalPayload(competitors: BenchmarkEntityMetrics[]): BenchmarkPayload {
  const ownBrand = entity({ id: "nike", name: "Nike", isOwnBrand: true, activityScore: 61, activeAdCount: 1000 });
  const all = [ownBrand, ...competitors];
  return {
    ok: true,
    computedAt: new Date().toISOString(),
    combinedFingerprint: "fp",
    fromCache: false,
    ownBrand,
    competitors,
    entities: all,
    hero: {
      activityScoreYou: 61,
      activityScoreAvg: 50,
      activityScoreLeader: 61,
      activityScoreRankLabel: "#1 of 5",
      activeAdsYou: 1000,
      activeAdsAvg: 400,
      activeAdsRankLabel: "#1 of 5",
      platformsYouLabel: "5 of 6",
      platformsAvg: 3,
      biggestGapLine: "test",
    },
    rankings: {
      activityScore: all.map((e, i) => ({ entityId: e.id, rank: i + 1, of: all.length, percentile: 80 })),
      activeAds: all.map((e, i) => ({ entityId: e.id, rank: i + 1, of: all.length, percentile: 80 })),
      platformsActive: all.map((e, i) => ({ entityId: e.id, rank: i + 1, of: all.length, percentile: 80 })),
    },
    platformOpportunities: ["linkedin"],
    angleGaps: ["Cal AI angle", "PUMA angle"],
    aiSummary: { winning: [], behind: [], biggestOpportunity: "old" },
    recommendedMoves: [],
    staleness: {
      showBanner: false,
      ownBrandStaleDays: null,
      ownBrandLowAdCount: false,
      message: null,
    },
  };
}

describe("demo-insights-filter", () => {
  it("allows only adidas among rivals", () => {
    expect(isDemoInsightsAllowedCompetitor(entity({ id: "a", name: "Adidas", isOwnBrand: false }))).toBe(true);
    expect(isDemoInsightsAllowedCompetitor(entity({ id: "p", name: "Puma", isOwnBrand: false }))).toBe(false);
    expect(isDemoInsightsAllowedCompetitor(entity({ id: "c", name: "Calai", isOwnBrand: false }))).toBe(false);
    expect(isDemoInsightsAllowedCompetitor(entity({ id: "n", name: "Nike", isOwnBrand: true }))).toBe(true);
  });

  it("filters benchmark to nike + adidas for demo owner when debug off", () => {
    const prev = process.env.NEXT_PUBLIC_DEBUG_PLATFORM_CLASSIFICATION;
    process.env.NEXT_PUBLIC_DEBUG_PLATFORM_CLASSIFICATION = "false";
    const email = "attributo@yahoo.com";

    try {
      expect(shouldFilterInsightsToNikeAdidasDemo(email)).toBe(true);
      expect(shouldFilterInsightsToNikeAdidasDemo("other@example.com")).toBe(false);

      const payload = minimalPayload([
        entity({ id: "adidas", name: "Adidas", isOwnBrand: false, activityScore: 57 }),
        entity({ id: "puma", name: "Puma", isOwnBrand: false }),
        entity({ id: "calai", name: "Calai", isOwnBrand: false }),
        entity({ id: "ikea", name: "Ikea", isOwnBrand: false }),
      ]);

      const filtered = applyDemoInsightsBenchmarkFilter(payload, email);
      expect(filtered.competitors.map((c) => c.name)).toEqual(["Adidas"]);
      expect(filtered.entities).toHaveLength(2);
      expect(filtered.hero.activityScoreRankLabel).toBe("#1 of 2");
      expect(filtered.hero.activeAdsRankLabel).toBe("#1 of 2");
    } finally {
      process.env.NEXT_PUBLIC_DEBUG_PLATFORM_CLASSIFICATION = prev;
    }
  });

  it("does not filter when debug is on", () => {
    const prev = process.env.NEXT_PUBLIC_DEBUG_PLATFORM_CLASSIFICATION;
    process.env.NEXT_PUBLIC_DEBUG_PLATFORM_CLASSIFICATION = "true";
    const email = "attributo@yahoo.com";

    try {
      expect(shouldFilterInsightsToNikeAdidasDemo(email)).toBe(false);
      const payload = minimalPayload([
        entity({ id: "adidas", name: "Adidas", isOwnBrand: false }),
        entity({ id: "puma", name: "Puma", isOwnBrand: false }),
      ]);
      const filtered = applyDemoInsightsBenchmarkFilter(payload, email);
      expect(filtered.competitors).toHaveLength(2);
    } finally {
      process.env.NEXT_PUBLIC_DEBUG_PLATFORM_CLASSIFICATION = prev;
    }
  });
});
