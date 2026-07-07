/**
 * Apify `maxTotalChargeUsd` is a per-run spending **cap**, not a minimum bill.
 * Pay-per-event actors may require the cap query param to be >= a floor (often $3).
 */

/** Lowest `maxTotalChargeUsd` Apify accepts for xtdata/twitter-x-scraper API starts. */
export const APIFY_TWITTER_MIN_SPEND_CAP_USD = 3;

/** Typical Shorts scrape is ~$0.01–0.05 for 30 items ($0.40 / 1K records). */
export const ORGANIC_YOUTUBE_SHORTS_DEFAULT_SPEND_CAP_USD = 1;

export function twitterOrganicSpendCapUsd(): number {
  const parsed = Number.parseFloat(process.env.APIFY_ORGANIC_TWITTER_MAX_CHARGE_USD?.trim() ?? "");
  if (Number.isFinite(parsed) && parsed >= APIFY_TWITTER_MIN_SPEND_CAP_USD) {
    return parsed;
  }
  return APIFY_TWITTER_MIN_SPEND_CAP_USD;
}

export function youtubeShortsSpendCapUsd(): number {
  const parsed = Number.parseFloat(process.env.APIFY_ORGANIC_YOUTUBE_MAX_CHARGE_USD?.trim() ?? "");
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return ORGANIC_YOUTUBE_SHORTS_DEFAULT_SPEND_CAP_USD;
}
