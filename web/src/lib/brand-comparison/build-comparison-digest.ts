import { listStealableAngleRows } from "@/lib/comparison/angle-compare";
import type { ComparisonDerivedStats } from "@/lib/comparison/scraped-ads-derived-stats";
import type { CompetitorStrategyOverviewPayload } from "@/lib/strategy-overview/payload-types";
import { normalizeCompetitorStrategyOverviewPayload } from "@/lib/strategy-overview/normalize-strategy-payload";

type NumericFactsSide = {
  activeAds: number | null;
  platformsActive: number | null;
  modeledSpendEurMid: number | null;
  avgAdAgeDays: number | null;
  newAdsLast30d: number | null;
  videoPercent: number | null;
  uniqueAnglesCount: number | null;
};

function numericFactsForSide(
  payload: CompetitorStrategyOverviewPayload | null,
  derived: ComparisonDerivedStats | null | undefined
): NumericFactsSide {
  return {
    activeAds: payload?.map?.activeAdCount ?? null,
    platformsActive: payload?.map?.platformCount ?? null,
    modeledSpendEurMid: payload?.map?.totalAdSpend?.value ?? null,
    avgAdAgeDays: derived?.avgAdAgeDays ?? null,
    newAdsLast30d: derived?.newAdsLast30d ?? null,
    videoPercent: derived?.videoPercent ?? null,
    uniqueAnglesCount: derived?.uniqueAnglesCount ?? null,
  };
}

function topAngles(payload: CompetitorStrategyOverviewPayload | null, limit = 5) {
  return (payload?.insights?.angles_by_platform ?? [])
    .slice()
    .sort((a, b) => (b.totalCount ?? 0) - (a.totalCount ?? 0))
    .slice(0, limit)
    .map((x) => ({
      angle: x.angle,
      ads: x.totalCount ?? 0,
      platforms: x.platforms ?? [],
      avgLifespanDays: x.avgLifespanDays ?? null,
    }));
}

/** Compact structured summary for Sonnet (strategy payloads — no raw ad copy). */
export function buildComparisonDigest(
  workspace: CompetitorStrategyOverviewPayload | null,
  competitor: CompetitorStrategyOverviewPayload | null,
  opts?: {
    workspaceDerived?: ComparisonDerivedStats | null;
    competitorDerived?: ComparisonDerivedStats | null;
  }
): string {
  const pack = (p: CompetitorStrategyOverviewPayload | null, role: "user" | "competitor") => {
    if (!p) return { role, available: false as const };
    const safe = normalizeCompetitorStrategyOverviewPayload(p);
    const ins = safe.insights;
    return {
      role,
      available: true as const,
      platformNodes: safe.map.platformNodes.map((n) => ({
        platform: n.platform,
        funnelStage: n.funnelStage,
        adCount: n.adCount,
        estSpendEurMid: Math.round(n.estSpendEur),
      })),
      funnelEdges: safe.map.funnelEdges.map((e) => ({
        from: e.from,
        to: e.to,
        confidence: e.confidence,
      })),
      budgetPctByPlatform: ins.budget_allocation.segments.map((s) => ({
        platform: s.platform,
        pct: s.pct,
        adCount: s.adCount,
      })),
      funnelStages: ins.funnel_distribution.stages.map((s) => ({
        stage: s.stage,
        adCount: s.adCount,
        sharePct: s.sharePct,
        platforms: s.platforms,
      })),
      voiceByPlatform: ins.voice_tone_by_platform ?? [],
      anglesByPlatform: (ins.angles_by_platform ?? []).slice(0, 12),
      testingVelocityByPlatform: ins.testing_velocity_by_platform ?? [],
      enrichmentRate: safe.enrichmentRate ?? null,
      totalAds: safe.totalAdCount ?? null,
      audienceInference: safe.audience_inference ?? null,
    };
  };

  const stealableAnglesFromCompetitor = listStealableAngleRows(workspace, competitor).slice(0, 15).map((r) => ({
    angle: r.angle,
    adCount: r.totalCount ?? 0,
    platforms: r.platforms ?? [],
    avgLifespanDays: r.avgLifespanDays ?? null,
  }));

  return JSON.stringify(
    {
      userBrandStrategy: pack(workspace, "user"),
      competitorStrategy: pack(competitor, "competitor"),
      comparisonNumericFacts: {
        user: numericFactsForSide(workspace, opts?.workspaceDerived),
        competitor: numericFactsForSide(competitor, opts?.competitorDerived),
        userTopAngles: topAngles(workspace),
        competitorTopAngles: topAngles(competitor),
        stealableAnglesFromCompetitor,
      },
    },
    null,
    0
  );
}
