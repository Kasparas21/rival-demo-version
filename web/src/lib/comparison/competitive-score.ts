import type { CompetitorStrategyOverviewPayload, StrategyPlatform } from "@/lib/strategy-overview/payload-types";

const SUPPORTED_PLATFORMS: StrategyPlatform[] = ["meta", "google", "tiktok", "linkedin", "pinterest", "snapchat"];
const WEIGHT = 0.25;

export type SubscoreKey = "platformCoverage" | "funnelCoverage" | "testingVelocity" | "angleDiversity";

function platformSet(p: CompetitorStrategyOverviewPayload | null): Set<StrategyPlatform> {
  if (!p) return new Set();
  return new Set(p.insights.platform_footprint.platforms.map((x) => x.platform));
}

function funnelStagesCovered(p: CompetitorStrategyOverviewPayload | null): number {
  if (!p) return 0;
  return p.insights.funnel_distribution.stages.filter((s) => s.adCount > 0).length;
}

function newAdsLast30(p: CompetitorStrategyOverviewPayload | null): number {
  if (!p) return 0;
  return (p.insights.testing_velocity_by_platform ?? []).reduce((s, x) => s + x.newIn30, 0);
}

function distinctAngles(p: CompetitorStrategyOverviewPayload | null): number {
  if (!p) return 0;
  const fromByPlatform = p.insights.angles_by_platform ?? [];
  if (fromByPlatform.length > 0) return fromByPlatform.length;
  return p.insights.angle_clustering.angles.filter((a) => a.angle !== "Unclassified").length;
}

/**
 * Scores are always from the workspace (user) perspective vs the viewed competitor.
 * Values in [0, 1]; overall is 0–100.
 */
export function computeCompetitiveSubscores(
  user: CompetitorStrategyOverviewPayload | null,
  competitor: CompetitorStrategyOverviewPayload | null
): {
  scores: Record<SubscoreKey, number>;
  overall: number;
  worst: SubscoreKey;
  best: SubscoreKey;
  deltas: Record<SubscoreKey, { user: number; competitor: number; gap: number }>;
} {
  const Pu = platformSet(user);
  const Pc = platformSet(competitor);

  const platformCoverage = Pu.size / SUPPORTED_PLATFORMS.length;

  const userStages = funnelStagesCovered(user);
  const compStages = funnelStagesCovered(competitor);
  const funnelCoverage =
    compStages > 0
      ? Math.min(1, userStages / Math.max(compStages, 1)) * (userStages / 3)
      : userStages / 3;

  const uN = newAdsLast30(user);
  const cN = newAdsLast30(competitor);
  let testingVelocity = 0;
  if (uN === 0 && cN === 0) {
    testingVelocity = 0;
  } else if (cN === 0 && uN > 0) {
    testingVelocity = Math.min(1, uN / 10);
  } else if (cN > 0) {
    testingVelocity = Math.min(1, uN / cN / 1.5);
  }

  const uA = distinctAngles(user);
  const cA = distinctAngles(competitor);
  let angleDiversity = 0;
  if (uA === 0 && cA === 0) {
    angleDiversity = 0;
  } else if (cA === 0 && uA > 0) {
    angleDiversity = Math.min(1, uA / 5);
  } else if (cA > 0) {
    angleDiversity = Math.min(1, uA / cA / 1.5);
  }

  const scores: Record<SubscoreKey, number> = {
    platformCoverage,
    funnelCoverage,
    testingVelocity,
    angleDiversity,
  };

  const overall = Math.round(
    (platformCoverage + funnelCoverage + testingVelocity + angleDiversity) * WEIGHT * 100
  );

  const keys = Object.keys(scores) as SubscoreKey[];
  let worst: SubscoreKey = keys[0]!;
  let best: SubscoreKey = keys[0]!;
  for (const key of keys) {
    if (scores[key]! < scores[worst]!) worst = key;
    if (scores[key]! > scores[best]!) best = key;
  }

  const deltas: Record<SubscoreKey, { user: number; competitor: number; gap: number }> = {
    platformCoverage: { user: Pu.size, competitor: Pc.size, gap: Pc.size - Pu.size },
    funnelCoverage: { user: userStages, competitor: compStages, gap: compStages - userStages },
    testingVelocity: { user: uN, competitor: cN, gap: cN - uN },
    angleDiversity: { user: uA, competitor: cA, gap: cA - uA },
  };

  return { scores, overall, worst, best, deltas };
}

export const SUBSCORE_LABELS: Record<SubscoreKey, string> = {
  platformCoverage: "Platform coverage",
  funnelCoverage: "Funnel coverage",
  testingVelocity: "Testing velocity",
  angleDiversity: "Angle diversity",
};
