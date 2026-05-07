/**
 * Raw shapes returned by Apify ad actors (Facebook / Meta Ad Library).
 * Kept local after removing ScrapeCreators.
 */

export type FacebookAdSnapshot = {
  body?: { text?: string | null };
  cta_text?: string | null;
  cta_type?: string | null;
  display_format?: string | null;
  images?: Array<{ resized_image_url?: string; original_image_url?: string }>;
  videos?: Array<{ video_preview_image_url?: string; video_hd_url?: string; video_sd_url?: string }>;
  cards?: Array<{
    body?: string | null;
    cta_text?: string | null;
    title?: string | null;
    caption?: string | null;
    link_description?: string | null;
    linkDescription?: string | null;
    link_url?: string | null;
    original_image_url?: string | null;
    resized_image_url?: string | null;
    video_preview_image_url?: string | null;
    video_hd_url?: string | null;
    video_sd_url?: string | null;
  }>;
  link_url?: string | null;
  title?: string | null;
  caption?: string | null;
  /** Muted line under link headline in the Ad Library snapshot. */
  link_description?: string | null;
  linkDescription?: string | null;
  page_name?: string | null;
  current_page_name?: string | null;
  page_profile_picture_url?: string | null;
};

export type FacebookAdLibraryItem = {
  ad_archive_id?: string;
  collation_id?: string;
  page_id?: string;
  page_name?: string;
  is_active?: boolean;
  start_date?: number;
  end_date?: number;
  snapshot?: FacebookAdSnapshot;
  publisher_platform?: string[];
  ad_library_url?: string;
  impressions_with_index?: {
    impressions_text?: string | null;
    impressions_index?: number;
  };
};

/** Google Ads Transparency — Apify actor output (aligned with normalizeGoogleApiItem). */
export type GoogleCompanyAdItem = {
  advertiserId?: string;
  creativeId?: string;
  format?: string;
  adUrl?: string;
  advertiserName?: string;
  domain?: string;
  /** Google Ads Transparency “Preview URL” (displayads-formats… / tpc.googlesyndication…). Prefer for `<img>`. */
  previewUrl?: string | null;
  imageUrl?: string | null;
  firstShown?: string;
  lastShown?: string;
  headline?: string | null;
  description?: string | null;
  title?: string | null;
};

/** Legacy ScrapeCreators-shaped row; map Apify LinkedIn items into this for linkedInItemToCard. */
export type LinkedInAdItem = {
  id?: string;
  description?: string | null;
  headline?: string | null;
  poster?: string | null;
  posterTitle?: string | null;
  image?: string | null;
  video?: string | null;
  carouselImages?: string[];
  adType?: string | null;
  advertiser?: string | null;
  advertiserLinkedinPage?: string | null;
  /** LinkedIn Ad Library detail page (preferred for `adUrl` when set). */
  adDetailUrl?: string | null;
  cta?: string | null;
  destinationUrl?: string | null;
  adDuration?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  totalImpressions?: string | null;
  targeting?: Record<string, string>;
};
