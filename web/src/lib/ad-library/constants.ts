/** Default per-platform count when scrape settings / API body omit a limit (cheap / fast first run). */
export const ADS_LIBRARY_DEFAULT_ITEMS_PER_PLATFORM = 10;

/**
 * Upper bound for Meta, LinkedIn, TikTok, Pinterest, Snapchat, and Google Transparency `resultsLimit`
 * in `app/api/ads/library/route.ts`.
 */
export const ADS_LIBRARY_MAX_ITEMS_PER_PLATFORM = 100;

/** Google Transparency `resultsLimit` when the client omits `googleResultsLimit`. */
export const GOOGLE_ADS_LIBRARY_DEFAULT_RESULTS_LIMIT = 25;

/** Upper bound passed to the Google Transparency actor (matches per-platform cap). */
export const GOOGLE_ADS_LIBRARY_MAX_ITEMS = 100;

/**
 * Max creatives kept per platform after incremental merges (LRU prune by last-seen).
 * Default: max(5× per-scrape cap, 500).
 */
export const ADS_LIBRARY_MERGED_CAP_PER_PLATFORM = Math.max(ADS_LIBRARY_MAX_ITEMS_PER_PLATFORM * 5, 500);

/** Inline preview count per platform on competitor Ads Library (before “View all”). Matches `xl:grid-cols-3` so one row on wide viewports. */
export const META_ADS_INLINE_PREVIEW = 3;

/** Meta “View all” modal: ads rendered per page (DOM capped). */
export const META_ADS_MODAL_PAGE_SIZE = 12;
