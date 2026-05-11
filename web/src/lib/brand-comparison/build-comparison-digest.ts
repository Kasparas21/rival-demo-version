import type { CompetitorStrategyOverviewPayload } from "@/lib/strategy-overview/payload-types";

/** Compact structured summary for Sonnet (strategy payloads — no raw ad copy). */
export function buildComparisonDigest(
  workspace: CompetitorStrategyOverviewPayload | null,
  competitor: CompetitorStrategyOverviewPayload | null
): string {
  const pack = (p: CompetitorStrategyOverviewPayload | null, role: "user" | "competitor") => {
    if (!p) return { role, available: false as const };
    const ins = p.insights;
    return {
      role,
      available: true as const,
      platformNodes: p.map.platformNodes.map((n) => ({
        platform: n.platform,
        funnelStage: n.funnelStage,
        adCount: n.adCount,
        estSpendEurMid: Math.round(n.estSpendEur),
      })),
      funnelEdges: p.map.funnelEdges.map((e) => ({
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
      enrichmentRate: p.enrichmentRate ?? null,
      totalAds: p.totalAdCount ?? null,
      audienceInference: p.audience_inference ?? null,
    };
  };

  return JSON.stringify(
    {
      userBrandStrategy: pack(workspace, "user"),
      competitorStrategy: pack(competitor, "competitor"),
    },
    null,
    0
  );
}
