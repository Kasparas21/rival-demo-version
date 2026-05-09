import { PLATFORM_CPM_EUR_RANGE } from "@/lib/strategy-overview/adBenchmarks";
import type { BrandFootprint, PerPlatformSpendEstimate, PlatformStats, SpendEstimate, SupportedPlatform } from "@/lib/spend-estimator/types";

const PLATFORMS: SupportedPlatform[] = [
  "meta",
  "google",
  "youtube",
  "tiktok",
  "linkedin",
  "pinterest",
  "snapchat",
  "microsoft",
];

export type EstimatorConfig = {
  cpmMid: Record<SupportedPlatform, number>;
  cpmLow: Record<SupportedPlatform, number>;
  cpmHigh: Record<SupportedPlatform, number>;
  impressionsPerAdPerMonth: Record<SupportedPlatform, number>;
  activityWeights: {
    a1_active_ads: number;
    a2_median_days: number;
    a3_new_creatives_30d: number;
  };
  brandScaleBase: number;
  brandScaleSlope: number;
};

export type PlatformSpendDebugRow = {
  platform: SupportedPlatform;
  activityIndex: number;
  Fp: number;
  brandFactor: number;
  impressions: number;
  spendLow: number;
  spendMid: number;
  spendHigh: number;
};

function buildDefaultCpmAndImpressions(): Pick<
  EstimatorConfig,
  "cpmMid" | "cpmLow" | "cpmHigh" | "impressionsPerAdPerMonth"
> {
  const cpmMid = {} as Record<SupportedPlatform, number>;
  const cpmLow = {} as Record<SupportedPlatform, number>;
  const cpmHigh = {} as Record<SupportedPlatform, number>;
  const impressionsPerAdPerMonth = {} as Record<SupportedPlatform, number>;

  for (const p of PLATFORMS) {
    const b = PLATFORM_CPM_EUR_RANGE[p];
    cpmLow[p] = b.low;
    cpmHigh[p] = b.high;
    cpmMid[p] = (b.low + b.high) / 2;
    impressionsPerAdPerMonth[p] = b.impressionsPerAdPerMonth;
  }
  return { cpmMid, cpmLow, cpmHigh, impressionsPerAdPerMonth };
}

const baseTables = buildDefaultCpmAndImpressions();

export const DEFAULT_ESTIMATOR_CONFIG: EstimatorConfig = {
  ...baseTables,
  activityWeights: {
    a1_active_ads: 1,
    a2_median_days: 0.35,
    a3_new_creatives_30d: 0.5,
  },
  brandScaleBase: 0.5,
  brandScaleSlope: 0.25,
};

/** Meta SMB: CPM EUR 2–5 (mid 3.5); impressions/ad/mo below global 8k. Draft used 1200/ad/mo but under-shoots this band; 3000 targets ~€400–€800 mid for ~40 live SMB ads. Override via `STRATEGY_ESTIMATOR_CONFIG_JSON`. */
export const META_SMB_IMPRESSIONS_PER_AD_PER_MONTH = 3000;

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 !== 0 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

function activityIndex(stats: PlatformStats, w: EstimatorConfig["activityWeights"]): number {
  const { active_ads, median_days_active, new_creatives_30d } = stats;
  return (
    w.a1_active_ads * Math.log(1 + active_ads) +
    w.a2_median_days * Math.log(1 + median_days_active) +
    w.a3_new_creatives_30d * Math.log(1 + new_creatives_30d)
  );
}

export function resolveBrandFactorForFootprint(footprint: BrandFootprint, config: EstimatorConfig): number {
  const rawBrandFactor = config.brandScaleBase + config.brandScaleSlope * footprint.brand_scale_score;
  let brandFactor = rawBrandFactor;
  if (footprint.platform_stats.length === 1) {
    brandFactor = Math.min(brandFactor, 1.5);
  }
  return Math.max(0.5, Math.min(brandFactor, 3));
}

export function resolveEstimatorConfigForBrand(
  footprint: BrandFootprint,
  baseConfig: EstimatorConfig
): { config: EstimatorConfig; meta_smb_profile: boolean } {
  const metaStats = footprint.platform_stats.find((p) => p.platform === "meta");
  const isMetaOnly = footprint.platform_stats.length === 1 && metaStats != null;
  const isSmallLocalMeta =
    isMetaOnly && metaStats.active_ads <= 50 && footprint.brand_scale_score <= 3;

  if (!isSmallLocalMeta) {
    return { config: baseConfig, meta_smb_profile: false };
  }

  return {
    meta_smb_profile: true,
    config: {
      ...baseConfig,
      impressionsPerAdPerMonth: {
        ...baseConfig.impressionsPerAdPerMonth,
        meta: META_SMB_IMPRESSIONS_PER_AD_PER_MONTH,
      },
      cpmMid: { ...baseConfig.cpmMid, meta: 3.5 },
      cpmLow: { ...baseConfig.cpmLow, meta: 2 },
      cpmHigh: { ...baseConfig.cpmHigh, meta: 5 },
      brandScaleBase: baseConfig.brandScaleBase,
      brandScaleSlope: Math.min(baseConfig.brandScaleSlope, 0.2),
    },
  };
}

export function estimateBrandMonthlySpend(
  footprint: BrandFootprint,
  config: EstimatorConfig = DEFAULT_ESTIMATOR_CONFIG
): SpendEstimate {
  const { config: configForCalc, meta_smb_profile } = resolveEstimatorConfigForBrand(footprint, config);
  const statsList = footprint.platform_stats;
  const indices = statsList.map((s) => activityIndex(s, configForCalc.activityWeights));
  const nonZero = indices.filter((i) => i > 0);
  const medianActivity = nonZero.length > 0 ? median(nonZero) : 1;
  const maxIdx = Math.max(0, ...indices);

  const brandFactor = resolveBrandFactorForFootprint(footprint, configForCalc);

  const perPlatform: PerPlatformSpendEstimate[] = [];

  for (let i = 0; i < statsList.length; i++) {
    const stats = statsList[i]!;
    const ai = indices[i]!;
    let Fp = medianActivity > 0 ? ai / medianActivity : 1;
    if (ai === 0 && maxIdx > 0) Fp = 0.75;

    const baseImpressionsPerAd = configForCalc.impressionsPerAdPerMonth[stats.platform];
    const impressions = stats.active_ads * baseImpressionsPerAd * Fp * brandFactor;

    const cpmMid = configForCalc.cpmMid[stats.platform];
    const cpmLow = configForCalc.cpmLow[stats.platform];
    const cpmHigh = configForCalc.cpmHigh[stats.platform];

    const spendMid = (impressions / 1000) * cpmMid;
    const spendLow = (impressions / 1000) * cpmLow;
    const spendHigh = (impressions / 1000) * cpmHigh;

    perPlatform.push({
      platform: stats.platform,
      low: Math.round(spendLow),
      mid: Math.round(spendMid),
      high: Math.round(spendHigh),
    });
  }

  const total = perPlatform.reduce(
    (acc, p) => ({
      low: acc.low + p.low,
      mid: acc.mid + p.mid,
      high: acc.high + p.high,
    }),
    { low: 0, mid: 0, high: 0 }
  );

  return {
    competitor_id: footprint.competitor_id,
    total,
    perPlatform,
    model: "cpm_footprint_v2",
    assumptions: {
      cpm_table: "PLATFORM_CPM_EUR_RANGE_v2",
      brand_scale_score: footprint.brand_scale_score,
      meta_smb_profile: meta_smb_profile || undefined,
    },
  };
}

export function estimateBrandMonthlySpendDebug(
  footprint: BrandFootprint,
  config: EstimatorConfig = DEFAULT_ESTIMATOR_CONFIG
): { estimate: SpendEstimate; platformDebug: PlatformSpendDebugRow[] } {
  const { config: configForCalc, meta_smb_profile } = resolveEstimatorConfigForBrand(footprint, config);
  const statsList = footprint.platform_stats;
  const indices = statsList.map((s) => activityIndex(s, configForCalc.activityWeights));
  const nonZero = indices.filter((i) => i > 0);
  const medianActivity = nonZero.length > 0 ? median(nonZero) : 1;
  const maxIdx = Math.max(0, ...indices);

  const brandFactor = resolveBrandFactorForFootprint(footprint, configForCalc);

  const perPlatform: PerPlatformSpendEstimate[] = [];

  for (let i = 0; i < statsList.length; i++) {
    const stats = statsList[i]!;
    const ai = indices[i]!;
    let Fp = medianActivity > 0 ? ai / medianActivity : 1;
    if (ai === 0 && maxIdx > 0) Fp = 0.75;

    const baseImpressionsPerAd = configForCalc.impressionsPerAdPerMonth[stats.platform];
    const impressions = stats.active_ads * baseImpressionsPerAd * Fp * brandFactor;

    const cpmMid = configForCalc.cpmMid[stats.platform];
    const cpmLow = configForCalc.cpmLow[stats.platform];
    const cpmHigh = configForCalc.cpmHigh[stats.platform];

    const spendMid = (impressions / 1000) * cpmMid;
    const spendLow = (impressions / 1000) * cpmLow;
    const spendHigh = (impressions / 1000) * cpmHigh;

    perPlatform.push({
      platform: stats.platform,
      low: Math.round(spendLow),
      mid: Math.round(spendMid),
      high: Math.round(spendHigh),
    });
  }

  const total = perPlatform.reduce(
    (acc, p) => ({
      low: acc.low + p.low,
      mid: acc.mid + p.mid,
      high: acc.high + p.high,
    }),
    { low: 0, mid: 0, high: 0 }
  );

  const estimate: SpendEstimate = {
    competitor_id: footprint.competitor_id,
    total,
    perPlatform,
    model: "cpm_footprint_v2",
    assumptions: {
      cpm_table: "PLATFORM_CPM_EUR_RANGE_v2",
      brand_scale_score: footprint.brand_scale_score,
      meta_smb_profile: meta_smb_profile || undefined,
    },
  };

  const platformDebug: PlatformSpendDebugRow[] = [];
  for (let i = 0; i < statsList.length; i++) {
    const stats = statsList[i]!;
    const ai = indices[i]!;
    let Fp = medianActivity > 0 ? ai / medianActivity : 1;
    if (ai === 0 && maxIdx > 0) Fp = 0.75;
    const baseImpressionsPerAd = configForCalc.impressionsPerAdPerMonth[stats.platform];
    const impressions = stats.active_ads * baseImpressionsPerAd * Fp * brandFactor;
    const cpmMid = configForCalc.cpmMid[stats.platform];
    const cpmLow = configForCalc.cpmLow[stats.platform];
    const cpmHigh = configForCalc.cpmHigh[stats.platform];
    platformDebug.push({
      platform: stats.platform,
      activityIndex: ai,
      Fp,
      brandFactor,
      impressions,
      spendLow: (impressions / 1000) * cpmLow,
      spendMid: (impressions / 1000) * cpmMid,
      spendHigh: (impressions / 1000) * cpmHigh,
    });
  }
  return { estimate, platformDebug };
}

/** Deep-merge partial overrides (one level for activityWeights). */
export function mergeEstimatorConfig(base: EstimatorConfig, patch: Partial<EstimatorConfig>): EstimatorConfig {
  return {
    ...base,
    ...patch,
    cpmMid: { ...base.cpmMid, ...patch.cpmMid },
    cpmLow: { ...base.cpmLow, ...patch.cpmLow },
    cpmHigh: { ...base.cpmHigh, ...patch.cpmHigh },
    impressionsPerAdPerMonth: { ...base.impressionsPerAdPerMonth, ...patch.impressionsPerAdPerMonth },
    activityWeights: { ...base.activityWeights, ...patch.activityWeights },
  };
}

/**
 * Optional JSON override: `STRATEGY_ESTIMATOR_CONFIG_JSON` — partial EstimatorConfig (merge with defaults).
 * Invalid JSON is ignored.
 */
export function loadEstimatorConfigFromEnv(): EstimatorConfig {
  let cfg = DEFAULT_ESTIMATOR_CONFIG;
  const raw = process.env.STRATEGY_ESTIMATOR_CONFIG_JSON?.trim();
  if (!raw) return cfg;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      cfg = mergeEstimatorConfig(DEFAULT_ESTIMATOR_CONFIG, parsed as Partial<EstimatorConfig>);
    }
  } catch {
    /* ignore */
  }
  return cfg;
}
