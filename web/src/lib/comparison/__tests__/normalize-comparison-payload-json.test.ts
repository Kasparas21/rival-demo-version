import { describe, expect, it } from "vitest";

import type { ComparisonPayloadJson } from "@/lib/comparison/comparison-payload-types";
import { normalizeComparisonPayloadJson } from "@/lib/comparison/normalize-comparison-payload-json";
import type { CompetitorStrategyOverviewPayload } from "@/lib/strategy-overview/payload-types";

import type { ComparisonDerivedStats } from "@/lib/comparison/scraped-ads-derived-stats";

const DERIVED_STUB: ComparisonDerivedStats = {
  avgAdAgeDays: 12,
  newAdsLast30d: 0,
  videoPercent: 40,
  uniqueAnglesCount: 2,
};

function sideStub(payload: unknown): NonNullable<ComparisonPayloadJson["workspace"]> {
  return {
    meta: {
      competitorId: "c1",
      name: "Brand",
      domain: "brand.com",
      logoUrl: null,
      lastScrapedAt: null,
      lastMoveDetectionAt: null,
    },
    payload: payload as CompetitorStrategyOverviewPayload | null,
    recomputing: false,
    recent_moves: [],
    snapshot_count: 0,
    audienceHistory: [],
    derivedStats: DERIVED_STUB,
  };
}

describe("normalizeComparisonPayloadJson", () => {
  it("repairs workspace + competitor when insights were empty shells (cache replay)", () => {
    const malformed = {
      version: 1,
      map: { title: "m" },
      insights: {},
      sourceScrapeBatchId: null,
    } as unknown as CompetitorStrategyOverviewPayload;

    const json: ComparisonPayloadJson = {
      ok: true,
      workspace: sideStub(malformed),
      competitor: sideStub(malformed),
    };

    const out = normalizeComparisonPayloadJson(json)!;
    expect(Array.isArray(out.workspace!.payload!.insights.platform_footprint.platforms)).toBe(true);
    expect(Array.isArray(out.competitor!.payload!.insights.angle_clustering.angles)).toBe(true);
  });
});
