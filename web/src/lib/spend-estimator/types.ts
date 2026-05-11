/**
 * v2 ad spend estimator: deterministic CPM × impressions model using platform activity features
 * and brand scale score; calibrated via EstimatorConfig (no LLM in core math).
 */

export type SupportedPlatform =
  | "meta"
  | "google"
  | "tiktok"
  | "linkedin"
  | "pinterest"
  | "snapchat";

export type PlatformStats = {
  platform: SupportedPlatform;
  active_ads: number;
  median_days_active: number;
  p25_days_active: number;
  p75_days_active: number;
  new_creatives_30d: number;
  new_creatives_90d: number;
  has_impression_band: boolean;
};

export type BrandFootprint = {
  competitor_id: string;
  user_id: string;
  brand_domain: string | null;
  brand_name: string;
  last_scraped_at: string | null;
  platform_stats: PlatformStats[];
  brand_scale_score: number;
};

export type PerPlatformSpendEstimate = {
  platform: SupportedPlatform;
  low: number;
  mid: number;
  high: number;
};

export type SpendEstimate = {
  competitor_id: string;
  total: { low: number; mid: number; high: number };
  perPlatform: PerPlatformSpendEstimate[];
  model: "cpm_footprint_v2";
  assumptions: {
    cpm_table: "PLATFORM_CPM_EUR_RANGE_v2";
    brand_scale_score: number;
    /** True when v2 applied the Meta small/local (SMB) CPM + impressions profile. */
    meta_smb_profile?: boolean;
    note?: string;
  };
};

/** Row shape from scraped_ads (subset) for footprint + raw_payload checks. */
export type FootprintAdInput = {
  id: string;
  platform: string;
  first_seen_at: string;
  last_seen_at: string;
  is_active: boolean;
  raw_payload: unknown;
};
