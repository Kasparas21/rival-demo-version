import { describe, expect, it } from "vitest";

import { detectMoves } from "@/lib/comparison/move-detector";
import type { CompetitorStrategyOverviewPayload } from "@/lib/strategy-overview/payload-types";

function minimalPayload(overrides: Partial<CompetitorStrategyOverviewPayload> = {}): CompetitorStrategyOverviewPayload {
  const base: CompetitorStrategyOverviewPayload = {
    version: 1,
    sourceScrapeBatchId: null,
    map: {
      title: "T",
      competitor: { name: "T", domain: "t.com", logoUrl: null },
      totalAdSpend: {
        value: 0,
        currency: "EUR",
        unit: "month",
        confidence: "low",
      },
      spendVsSimilar: "Low",
      spendTrendline: [],
      audienceSignals: { interests: [], ageRange: "", geo: "", targetingType: [] },
      dominantFormat: { format: "video", percentage: 100 },
      toneOfVoice: { primary: "", attributes: [] },
      topAngles: [],
      platformNodes: [],
      funnelEdges: [],
      activeAdCount: 0,
      platformCount: 0,
    },
    insights: {
      platform_footprint: {
        title: "",
        subtitle: "",
        tooltip: "",
        lastUpdated: new Date().toISOString(),
        dataConfidence: "low",
        platforms: [],
        totalActiveAds: 0,
        totalEstSpendEur: 0,
        platformCount: 0,
      },
      budget_allocation: {
        title: "",
        subtitle: "",
        tooltip: "",
        lastUpdated: new Date().toISOString(),
        dataConfidence: "low",
        segments: [],
        totalEstSpendEur: 0,
        insight: "",
      },
      library_activity_timeline: {
        title: "",
        subtitle: "",
        tooltip: "",
        lastUpdated: new Date().toISOString(),
        dataConfidence: "low",
        months: [],
        dataQuality: { realLaunchPct: 0, qualityLabel: "low", warning: null },
      },
      funnel_distribution: {
        title: "",
        subtitle: "",
        tooltip: "",
        lastUpdated: new Date().toISOString(),
        dataConfidence: "low",
        stages: [],
        totalClassified: 0,
        totalAds: 0,
        insufficientData: true,
      },
      angle_clustering: {
        title: "",
        subtitle: "",
        tooltip: "",
        lastUpdated: new Date().toISOString(),
        dataConfidence: "low",
        angles: [],
        unclassifiedPct: 0,
        insufficientData: true,
      },
      voice_tone_position: {
        title: "",
        subtitle: "",
        tooltip: "",
        lastUpdated: new Date().toISOString(),
        dataConfidence: "low",
        competitor: null,
        userBrand: null,
        sampleSize: 0,
      },
      ad_format_mix: {
        title: "",
        subtitle: "",
        tooltip: "",
        lastUpdated: new Date().toISOString(),
        dataConfidence: "low",
        formats: [],
      },
      voice_tone_by_platform: [],
      angles_by_platform: [],
      testing_velocity_by_platform: [],
    },
  };
  return { ...base, ...overrides };
}

describe("detectMoves", () => {
  it("detects new platform", () => {
    const before = minimalPayload({
      insights: {
        ...minimalPayload().insights,
        platform_footprint: {
          ...minimalPayload().insights.platform_footprint,
          platforms: [
            {
              platform: "meta",
              label: "Meta",
              activeAds: 5,
              estSpendEur: 100,
              funnelStage: "MOF",
              spendShare: 100,
            },
          ],
        },
      },
    });
    const after = minimalPayload({
      insights: {
        ...before.insights,
        platform_footprint: {
          ...before.insights.platform_footprint,
          platforms: [
            ...before.insights.platform_footprint.platforms,
            {
              platform: "tiktok",
              label: "TikTok",
              activeAds: 3,
              estSpendEur: 50,
              funnelStage: "TOF",
              spendShare: 30,
            },
          ],
        },
      },
    });
    const moves = detectMoves(before, after);
    expect(moves.some((m) => m.event_type === "new_platform" && m.platform === "tiktok")).toBe(true);
  });

  it("detects budget shift over 20pp", () => {
    const before = minimalPayload({
      insights: {
        ...minimalPayload().insights,
        budget_allocation: {
          ...minimalPayload().insights.budget_allocation,
          segments: [
            { platform: "meta", label: "Meta", pct: 50, estSpendEur: 50, adCount: 5 },
            { platform: "google", label: "Google", pct: 50, estSpendEur: 50, adCount: 5 },
          ],
        },
      },
    });
    const after = minimalPayload({
      insights: {
        ...before.insights,
        budget_allocation: {
          ...before.insights.budget_allocation,
          segments: [
            { platform: "meta", label: "Meta", pct: 80, estSpendEur: 80, adCount: 8 },
            { platform: "google", label: "Google", pct: 20, estSpendEur: 20, adCount: 2 },
          ],
        },
      },
    });
    const moves = detectMoves(before, after);
    expect(moves.some((m) => m.event_type === "budget_shift" && m.platform === "meta")).toBe(true);
  });
});
