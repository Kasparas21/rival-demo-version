/**
 * Cap for Meta, LinkedIn, TikTok (and generic `MAX_ADS` in `app/api/ads/library/route.ts`).
 * Google default/max use {@link GOOGLE_ADS_LIBRARY_DEFAULT_RESULTS_LIMIT} / {@link GOOGLE_ADS_LIBRARY_MAX_ITEMS}.
 */
export const ADS_LIBRARY_MAX_ITEMS_PER_PLATFORM = 50;

/** Default Google Transparency `resultsLimit` when the client does not choose another value. */
export const GOOGLE_ADS_LIBRARY_DEFAULT_RESULTS_LIMIT = 50;

/** Google Ads Transparency Apify `resultsLimit` — actor allows up to 1000; app caps at 500. */
export const GOOGLE_ADS_LIBRARY_MAX_ITEMS = 500;

/** Inline preview count per platform on competitor Ads Library (before “View all”). Matches `xl:grid-cols-3` so one row on wide viewports. */
export const META_ADS_INLINE_PREVIEW = 3;

/** Meta “View all” modal: ads rendered per page (DOM capped). */
export const META_ADS_MODAL_PAGE_SIZE = 12;
