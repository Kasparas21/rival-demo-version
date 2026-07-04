import type { AdsLibraryPlatform } from "./ads-library-platform";

/** Default per-platform count when scrape settings / API body omit a limit (cheap / fast first run). */
export const ADS_LIBRARY_DEFAULT_ITEMS_PER_PLATFORM = 10;

/**
 * Upper bound for Meta, LinkedIn, TikTok, Pinterest, Snapchat, and Google Transparency `resultsLimit`
 * in `app/api/ads/library/route.ts`.
 */
export const ADS_LIBRARY_MAX_ITEMS_PER_PLATFORM = 1000;

/**
 * Full active-ads sweep cap for meta/google/tiktok refreshes. A sweep that returns fewer ads than
 * this cap is exhaustive, which is what makes "absent from scrape → killed" sound.
 */
export const FULL_SWEEP_ADS_PER_PLATFORM = 1000;

/** Google Transparency `resultsLimit` when the client omits `googleResultsLimit`. */
export const GOOGLE_ADS_LIBRARY_DEFAULT_RESULTS_LIMIT = 25;

/** Upper bound passed to the Google Transparency actor (matches per-platform cap). */
export const GOOGLE_ADS_LIBRARY_MAX_ITEMS = 500;

/** Platforms with configured first-discovery scrape counts (excludes `microsoft`). */
export type InitialScrapePlatform = Exclude<AdsLibraryPlatform, "microsoft">;

/** Per-platform ad count for the first discovery scrape when a competitor profile is added. */
export const INITIAL_ADS_PER_PLATFORM = {
  meta: 500,
  google: 500,
  tiktok: 500,
  pinterest: 400,
  linkedin: 300,
  snapchat: 300,
} as const satisfies Record<InitialScrapePlatform, number>;

export function getInitialAdsCount(platform: InitialScrapePlatform): number {
  return INITIAL_ADS_PER_PLATFORM[platform];
}

/** Per-platform ad count for scheduled refresh scrapes (not initial discovery). */
export const REFRESH_ADS_PER_PLATFORM = 100;

/** Pro/Admin manual force-rescrape: full active sweep per platform. */
export const MANUAL_REFRESH_ADS_PER_PLATFORM = FULL_SWEEP_ADS_PER_PLATFORM;

/** Workspace “Rescrape ads” — small refresh per platform (not full discovery). */
export const WORKSPACE_RESCRAPE_ADS_PER_PLATFORM = {
  meta: 10,
  google: 25,
  linkedin: 10,
  tiktok: 10,
  pinterest: 10,
  snapchat: 10,
} as const satisfies Partial<Record<InitialScrapePlatform, number>>;

/** Quick monthly probe for INACTIVE platforms. */
export const INACTIVE_PROBE_ADS_PER_PLATFORM = 50;

/** High-coverage override: platforms with this many active ads count toward the 5-platform threshold. */
export const HIGH_COVERAGE_ACTIVE_THRESHOLD = 30;

/** Minimum platforms at high-coverage threshold before top-3 override applies. */
export const HIGH_COVERAGE_MIN_PLATFORMS = 5;

/** Days between full classification reviews. */
export const CLASSIFICATION_REVIEW_INTERVAL_DAYS = 30;

/** Days between INACTIVE monthly probes. */
export const INACTIVE_PROBE_INTERVAL_DAYS = 30;

type CadencePlatform = InitialScrapePlatform;

export const PRIMARY_SECONDARY_REFRESH_INTERVAL_DAYS: Record<CadencePlatform, number> = {
  meta: 3,
  google: 3,
  tiktok: 7,
  pinterest: 21,
  linkedin: 21,
  snapchat: 21,
};

export const MINIMAL_REFRESH_INTERVAL_DAYS: Record<CadencePlatform, number> = {
  meta: 6,
  google: 6,
  tiktok: 14,
  pinterest: 42,
  linkedin: 42,
  snapchat: 42,
};

/**
 * Max creatives kept per platform after incremental merges (LRU prune by last-seen).
 * Default: max(5× per-scrape cap, 500).
 */
export const ADS_LIBRARY_MERGED_CAP_PER_PLATFORM = Math.max(ADS_LIBRARY_MAX_ITEMS_PER_PLATFORM * 5, 500);

/** Inline preview grids — align with competitor Ads Library (max 3 cards per row on md+). */
export const META_ADS_INLINE_PREVIEW = 3;

/** Meta “View all” modal: ads rendered per page (DOM capped). */
export const META_ADS_MODAL_PAGE_SIZE = 12;

/** Expanded platform-ads modal — lazy-loaded batch size (Foreplay-style infinite scroll). */
export const PLATFORM_ADS_MODAL_BATCH_SIZE = 24;
