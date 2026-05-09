import type { BrandFootprint } from "@/lib/spend-estimator/types";
import {
  estimateBrandMonthlySpendDebug,
  loadEstimatorConfigFromEnv,
  type EstimatorConfig,
} from "@/lib/spend-estimator/estimate-spend";

export function isSpendEstimatorDebugEnabled(): boolean {
  const v = process.env.STRATEGY_SPEND_ESTIMATOR_DEBUG?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

/** Logs footprint summary, per-platform impressions math, and spend ranges when STRATEGY_SPEND_ESTIMATOR_DEBUG is set. */
export function logSpendEstimateDebug(label: string, footprint: BrandFootprint, config?: EstimatorConfig): void {
  if (!isSpendEstimatorDebugEnabled()) return;
  const cfg = config ?? loadEstimatorConfigFromEnv();
  const { estimate, platformDebug } = estimateBrandMonthlySpendDebug(footprint, cfg);
  console.log(
    `[spend-estimator-v2] ${label}`,
    JSON.stringify(
      {
        competitor_id: footprint.competitor_id,
        brand_scale_score: footprint.brand_scale_score,
        platform_stats: footprint.platform_stats,
        estimate,
        platformDebug,
      },
      null,
      2
    )
  );
}
