/**
 * Cap for Meta, LinkedIn, TikTok, Pinterest, Snapchat, and Google Transparency `resultsLimit`
 * in `app/api/ads/library/route.ts` (100 ads per platform).
 */
export const ADS_LIBRARY_MAX_ITEMS_PER_PLATFORM = 100;

/** Google Transparency `resultsLimit` — fixed product cap (no user picker). */
export const GOOGLE_ADS_LIBRARY_DEFAULT_RESULTS_LIMIT = 100;

/** Upper bound passed to the Google Transparency actor (matches per-platform cap). */
export const GOOGLE_ADS_LIBRARY_MAX_ITEMS = 100;

/** Inline preview count per platform on competitor Ads Library (before “View all”). Matches `xl:grid-cols-3` so one row on wide viewports. */
export const META_ADS_INLINE_PREVIEW = 3;

/** Meta “View all” modal: ads rendered per page (DOM capped). */
export const META_ADS_MODAL_PAGE_SIZE = 12;
