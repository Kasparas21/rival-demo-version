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

/** Meta Ad Library API / scraper geographic targeting snippet. */
export type MetaLocationAudienceEntry = {
  name: string;
  type?: string;
  excluded?: boolean;
};

/** `age_audience` when the actor exposes numeric bounds (e.g. 18–44). */
export type MetaAgeAudienceBounds = {
  min?: number;
  max?: number;
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
  gender_audience?: string;
  targets_eu?: boolean;
  location_audience?: MetaLocationAudienceEntry[];
  age_audience?: MetaAgeAudienceBounds;
  ad_library_url?: string;
  /** Band or label from EU / WW disclosures when the actor exposes it (persisted for detail drawer). */
  impressionsRange?: string | null;
  /** Demographic reach blobs when scraped (persisted for detail drawer). */
  age_country_gender_reach_breakdown?: unknown[];
  /** Nested regional disclosures (`uk_transparency`, `eu_transparency`, …) — persist so detail drawer can harvest after flattening. */
  transparency_by_location?: Record<string, unknown> | null;
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
  /** First YouTube watch/embed id found anywhere in the raw creative payload (for poster thumbnails). */
  youtubeVideoId?: string | null;
  /** Direct MP4/WebM (`googlevideo.com/videoplayback`, etc.) from `videoUrl` or nested payload. */
  creativeVideoUrl?: string | null;
  firstShown?: string;
  lastShown?: string;
  headline?: string | null;
  description?: string | null;
  title?: string | null;
  /** From actor `includeRegionEnrichment` / nested geo fields — human-readable for UI. */
  libraryRegionSummary?: string;
  /** From actor `includeTargetingLocations` / targeting blobs — human-readable for UI. */
  libraryTargetingSummary?: string;
};

/** Row from LinkedIn transparency scrapers — audience by country when disclosed. */
export type LinkedInCountryShare = {
  country: string;
  percentage: string;
};

/** Row from e.g. `adTargetingAudience` — language, location, criteria. */
export type LinkedInAudienceTargetingRow = {
  type: string;
  value: string;
  status?: string;
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
  /** Company logo from transparency (e.g. ivanvs actor `advertiser.logo`). */
  advertiserLogo?: string | null;
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
  /** Structured rows from `adTargetingAudience` (data_xplorer actor). */
  targetingAudience?: LinkedInAudienceTargetingRow[];
  /** Country + share when scraper exposes breakdown objects. */
  countryDistribution?: LinkedInCountryShare[];
  /** LinkedIn company / org id from transparency actor when present (for advertiser verification). */
  advertiserCompanyId?: string | null;
};
