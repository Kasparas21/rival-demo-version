/** Include ads with any activity (first or last seen) on or after this rolling window (UTC). */
export const FOOTPRINT_MAX_AGE_DAYS = 365;

/**
 * A creative counts as "live" for Strategy Map + spend footprint when `is_active` OR
 * `last_seen_at` is within this many days (aligns map `adCount` with v2 `active_ads`).
 */
export const LIVE_AD_RECENCY_DAYS = 45;

/** @deprecated use LIVE_AD_RECENCY_DAYS; kept for any external docs still referencing the old name */
export const FOOTPRINT_ACTIVE_RECENCY_DAYS = LIVE_AD_RECENCY_DAYS;

export function isSpendEstimatorV2Enabled(): boolean {
  const v = process.env.STRATEGY_SPEND_ESTIMATOR_V2?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}
