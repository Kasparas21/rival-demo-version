import { describe, expect, it } from "vitest";

import {
  normalizeCompetitorStrategyOverviewPayload,
  normalizeInsightCardsPayload,
  normalizeStrategyMapPayload,
} from "@/lib/strategy-overview/normalize-strategy-payload";
import type {
  CompetitorStrategyOverviewPayload,
  InsightCardsPayload,
  StrategyMapPayload,
} from "@/lib/strategy-overview/payload-types";

/** Minimal map that used to crash sidebar + flow when fields were missing */
function partialMap(overrides: Partial<StrategyMapPayload> = {}): StrategyMapPayload {
  return {
    title: "T",
    competitor: { name: "N", domain: "d.example", logoUrl: null },
    totalAdSpend: {
      value: 1,
      low: 1,
      high: 2,
      currency: "EUR",
      unit: "month",
      confidence: "low",
      brandScaleScore: 1,
    },
    spendVsSimilar: "Medium",
    spendTrendline: [1],
    dominantFormat: { format: "video", percentage: 50 },
    toneOfVoice: { primary: "p", attributes: ["a"] },
    topAngles: [{ angle: "x", rank: 1 }],
    funnelEdges: [],
    platformNodes: [],
    activeAdCount: 3,
    platformCount: 1,
    ...overrides,
  } as StrategyMapPayload;
}

describe("normalizeStrategyMapPayload", () => {
  it("fills audienceSignals.interests when missing (prevents .interests on undefined)", () => {
    const m = partialMap({});

    const out = normalizeStrategyMapPayload(m);

    expect(Array.isArray(out.audienceSignals.interests)).toBe(true);
    expect(() => out.audienceSignals.interests.slice(0, 5)).not.toThrow();
  });

  it("defaults platformNodes and funnelEdges to [] when absent (prevents .map on undefined)", () => {
    const m = partialMap({});
    Reflect.deleteProperty(m as object, "platformNodes");
    Reflect.deleteProperty(m as object, "funnelEdges");

    const out = normalizeStrategyMapPayload(m);

    expect(Array.isArray(out.platformNodes)).toBe(true);
    expect(Array.isArray(out.funnelEdges)).toBe(true);
    expect(() => out.platformNodes.map((n) => n.adCount)).not.toThrow();
    expect(() => out.funnelEdges.map((e) => e.from)).not.toThrow();
  });

  it("returns clone fallback map for null input", () => {
    const out = normalizeStrategyMapPayload(null as unknown as StrategyMapPayload);

    expect(out.activeAdCount).toBe(0);
    expect(out.platformNodes).toEqual([]);
    expect(Array.isArray(out.audienceSignals.interests)).toBe(true);
  });
});

describe("normalizeInsightCardsPayload", () => {
  it("fills card shells so move-detector / inference never read undefined nested arrays", () => {
    const out = normalizeInsightCardsPayload({});

    expect(Array.isArray(out.platform_footprint.platforms)).toBe(true);
    expect(() => out.platform_footprint.platforms.map((x) => x.platform)).not.toThrow();
    expect(Array.isArray(out.budget_allocation.segments)).toBe(true);
    expect(() => out.budget_allocation.segments.map((s) => s.platform)).not.toThrow();
    expect(Array.isArray(out.angle_clustering.angles)).toBe(true);
    expect(() => out.angle_clustering.angles.find(() => false)).not.toThrow();
  });

  it("repairs platform_footprint object missing platforms array", () => {
    const out = normalizeInsightCardsPayload({
      platform_footprint: { title: "PF" } as InsightCardsPayload["platform_footprint"],
    });
    expect(out.platform_footprint.title).toBe("PF");
    expect(out.platform_footprint.platforms).toEqual([]);
  });
});

describe("normalizeCompetitorStrategyOverviewPayload", () => {
  it("nulls audience_inference when segments is not an array", () => {
    const p = {
      version: 1,
      map: partialMap({}),
      insights: {} as CompetitorStrategyOverviewPayload["insights"],
      audience_inference: {
        primarySegmentName: "Test",
        segments: undefined,
        summary: "x",
      } as unknown as CompetitorStrategyOverviewPayload["audience_inference"],
      sourceScrapeBatchId: null,
    } as CompetitorStrategyOverviewPayload;

    const out = normalizeCompetitorStrategyOverviewPayload(p);
    expect(out.audience_inference).toBeNull();
  });

  it("injects map when missing instead of passthrough undefined map", () => {
    const p = {
      version: 1,
      insights: {} as CompetitorStrategyOverviewPayload["insights"],
      sourceScrapeBatchId: null,
    } as unknown as CompetitorStrategyOverviewPayload;

    const out = normalizeCompetitorStrategyOverviewPayload(p);

    expect(out.map).toBeDefined();
    expect(typeof out.map.activeAdCount).toBe("number");
    expect(Array.isArray(out.map.platformNodes)).toBe(true);
    expect(Array.isArray(out.insights.budget_allocation.segments)).toBe(true);
  });

  it("signals?.interests is safe after normalization (evaluation order)", () => {
    const raw = partialMap({});
    Reflect.deleteProperty(raw as object, "audienceSignals");
    const p: CompetitorStrategyOverviewPayload = {
      version: 1,
      map: raw,
      insights: {} as CompetitorStrategyOverviewPayload["insights"],
      sourceScrapeBatchId: null,
    };

    const out = normalizeCompetitorStrategyOverviewPayload(p);

    const signals = out.map.audienceSignals;
    const labels = Array.isArray(signals?.interests) ? signals.interests : [];
    expect(() => labels.slice(0, 5)).not.toThrow();
  });
});
