import { describe, expect, it } from "vitest";

import {
  buildChannelSignals,
  organicTargetStage,
  tokenOverlapScore,
  type ChannelAggregates,
} from "@/lib/strategy-overview/channel-signals";
import type { StrategyMapPayload } from "@/lib/strategy-overview/payload-types";

function baseMap(overrides: Partial<StrategyMapPayload> = {}): StrategyMapPayload {
  return {
    title: "Test",
    competitor: { name: "Acme", domain: "acme.com", logoUrl: null },
    totalAdSpend: {
      value: 1000,
      low: 500,
      high: 1500,
      currency: "EUR",
      unit: "month",
      confidence: "medium",
    },
    spendVsSimilar: "Medium",
    spendTrendline: [],
    audienceSignals: { interests: [], ageRange: "18-65", geo: "US", targetingType: [] },
    dominantFormat: { format: "Video", percentage: 60 },
    toneOfVoice: { primary: "Bold", attributes: [] },
    topAngles: [{ angle: "Free trial discount offer", rank: 1 }],
    platformNodes: [],
    funnelCells: [
      {
        id: "meta:TOF",
        platform: "meta",
        label: "Meta",
        funnelStage: "TOF",
        adCount: 40,
        estSpendEur: 5000,
        estSpendEurLow: 4000,
        estSpendEurHigh: 6000,
        sampleAdIds: [],
        cellConfidence: "high",
        position: { x: 0, y: 0 },
      },
      {
        id: "meta:BOF",
        platform: "meta",
        label: "Meta",
        funnelStage: "BOF",
        adCount: 12,
        estSpendEur: 2000,
        estSpendEurLow: 1500,
        estSpendEurHigh: 2500,
        sampleAdIds: [],
        cellConfidence: "high",
        position: { x: 0, y: 0 },
      },
    ],
    funnelEdges: [],
    activeAdCount: 52,
    platformCount: 1,
    ...overrides,
  };
}

describe("organicTargetStage", () => {
  it("routes LinkedIn organic to MOF", () => {
    expect(organicTargetStage("linkedin")).toBe("MOF");
  });

  it("routes short-form organic to TOF", () => {
    expect(organicTargetStage("instagram")).toBe("TOF");
    expect(organicTargetStage("tiktok")).toBe("TOF");
  });
});

describe("tokenOverlapScore", () => {
  it("returns 0 when either set is empty", () => {
    expect(tokenOverlapScore(new Set(), new Set(["a"]))).toBe(0);
  });

  it("scores partial overlap", () => {
    const a = new Set(["discount", "trial"]);
    const b = new Set(["discount", "offer", "free"]);
    expect(tokenOverlapScore(a, b)).toBe(0.5);
  });
});

describe("buildChannelSignals", () => {
  const aggregates: ChannelAggregates = {
    email: {
      emailCount: 8,
      emailsPerWeek: 2.5,
      dominantType: "promotional",
      dominantAngle: "urgency",
      offerSharePct: 50,
      lastEmailAt: new Date().toISOString(),
      espDetected: "Klaviyo",
    },
    organic: [
      {
        platform: "instagram",
        postCount: 12,
        postsPerWeek: 3,
        avgEngagement: 2400,
        lastPostAt: new Date().toISOString(),
      },
    ],
    organicThemes: ["Behind-the-scenes product drops drive strong engagement"],
  };

  it("creates organic node paired to meta when meta ads exist", () => {
    const signals = buildChannelSignals(aggregates, baseMap());
    expect(signals.organicNodes).toHaveLength(1);
    expect(signals.organicNodes[0]!.pairedPaidPlatform).toBe("meta");
    expect(signals.organicNodes[0]!.postCount).toBe(12);
  });

  it("creates organic_to_paid edge to meta TOF", () => {
    const signals = buildChannelSignals(aggregates, baseMap());
    const edge = signals.channelEdges.find((e) => e.kind === "organic_to_paid");
    expect(edge?.from).toBe("organic:instagram");
    expect(edge?.to).toBe("meta:TOF");
    expect(edge!.confidence).toBeGreaterThan(0.4);
  });

  it("creates paid_to_email edge from strongest BOF cell", () => {
    const signals = buildChannelSignals(aggregates, baseMap());
    const edge = signals.channelEdges.find((e) => e.kind === "paid_to_email");
    expect(edge?.from).toBe("meta:BOF");
    expect(edge?.to).toBe("email");
    expect(signals.emailNode?.emailCount).toBe(8);
  });

  it("skips organic edge when post count is below threshold", () => {
    const lowOrganic: ChannelAggregates = {
      ...aggregates,
      organic: [{ ...aggregates.organic[0]!, postCount: 1 }],
    };
    const signals = buildChannelSignals(lowOrganic, baseMap());
    expect(signals.channelEdges.filter((e) => e.kind === "organic_to_paid")).toHaveLength(0);
  });

  it("targets LinkedIn organic at MOF when available", () => {
    const map = baseMap({
      funnelCells: [
        {
          id: "linkedin:MOF",
          platform: "linkedin",
          label: "LinkedIn",
          funnelStage: "MOF",
          adCount: 5,
          estSpendEur: 1000,
          estSpendEurLow: 800,
          estSpendEurHigh: 1200,
          sampleAdIds: [],
          cellConfidence: "medium",
          position: { x: 0, y: 0 },
        },
      ],
    });
    const signals = buildChannelSignals(
      {
        ...aggregates,
        organic: [
          {
            platform: "linkedin",
            postCount: 10,
            postsPerWeek: 2,
            avgEngagement: 500,
            lastPostAt: new Date().toISOString(),
          },
        ],
      },
      map,
    );
    const edge = signals.channelEdges.find((e) => e.kind === "organic_to_paid");
    expect(edge?.to).toBe("linkedin:MOF");
  });
});
