/**
 * v2 ad spend estimator: deterministic CPM × impressions model using platform activity features
 * and brand scale score; calibrated via EstimatorConfig (no LLM in core math).
 */

export type {
  BrandFootprint,
  FootprintAdInput,
  PerPlatformSpendEstimate,
  PlatformStats,
  SpendEstimate,
  SupportedPlatform,
} from "@/lib/spend-estimator/types";

export {
  FOOTPRINT_ACTIVE_RECENCY_DAYS,
  FOOTPRINT_MAX_AGE_DAYS,
  isSpendEstimatorV2Enabled,
  LIVE_AD_RECENCY_DAYS,
} from "@/lib/spend-estimator/constants";

export { hasImpressionBandInPayload } from "@/lib/spend-estimator/impression-band";

export {
  distinctLiveCountsByPlatform,
  extractStableCreativeKey,
  isCreativeLive,
  liveCreativeGroupsPerPlatform,
  type LiveCreativeGroup,
  type RowWithCreativePayload,
} from "@/lib/spend-estimator/live-creatives";

export {
  buildBrandFootprintFromAds,
  computeBrandFootprint,
  toSupportedPlatform,
  type BuildBrandFootprintContext,
} from "@/lib/spend-estimator/brand-footprint";

export {
  DEFAULT_ESTIMATOR_CONFIG,
  estimateBrandMonthlySpend,
  estimateBrandMonthlySpendDebug,
  loadEstimatorConfigFromEnv,
  mergeEstimatorConfig,
  META_SMB_IMPRESSIONS_PER_AD_PER_MONTH,
  resolveBrandFactorForFootprint,
  resolveEstimatorConfigForBrand,
  type EstimatorConfig,
  type PlatformSpendDebugRow,
} from "@/lib/spend-estimator/estimate-spend";

export { isSpendEstimatorDebugEnabled, logSpendEstimateDebug } from "@/lib/spend-estimator/debug";
