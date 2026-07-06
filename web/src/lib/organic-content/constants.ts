import type { OrganicPlatform } from "./types";

export const ORGANIC_SCRAPE_MAX_ITEMS = 30;
/** calm_builder/youtube-scraper pay-per-event minimum charge per run */
export const ORGANIC_YOUTUBE_MIN_CHARGE_USD = 0.5;

/** Shorts: calm_builder (channel /shorts tab). Long-form: apidojo (channel /videos). */
export const ORGANIC_YOUTUBE_SHORTS_ACTOR =
  process.env.APIFY_ORGANIC_YOUTUBE_SHORTS_ACTOR?.trim() ||
  process.env.APIFY_ORGANIC_YOUTUBE_ACTOR?.trim() ||
  "calm_builder/youtube-scraper";
export const ORGANIC_YOUTUBE_VIDEOS_ACTOR =
  process.env.APIFY_ORGANIC_YOUTUBE_VIDEOS_ACTOR?.trim() || "apidojo/youtube-scraper";
/** xtdata/twitter-x-scraper is pay-per-event; Apify rejects runs below $3 max charge. */
export const ORGANIC_TWITTER_MAX_TOTAL_CHARGE_USD = Math.max(
  3,
  Number.parseFloat(process.env.APIFY_ORGANIC_TWITTER_MAX_CHARGE_USD?.trim() ?? "5") || 5,
);
export const ORGANIC_FIRST_SCRAPE_POST_LIMIT = 10;
export const ORGANIC_SCRAPE_INTERVAL_DAYS = 3;
export const ORGANIC_INSIGHTS_MAX_TOKENS = 4096;
export const ORGANIC_FEED_PAGE_SIZE = 20;
/** Inline preview count per platform section (matches Ads Library teaser grid). */
export const ORGANIC_POSTS_INLINE_PREVIEW = 3;

export const ORGANIC_ACTOR_IDS: Record<OrganicPlatform, string> = {
  linkedin:
    process.env.APIFY_ORGANIC_LINKEDIN_ACTOR?.trim() || "harvestapi/linkedin-company-posts",
  twitter: process.env.APIFY_ORGANIC_TWITTER_ACTOR?.trim() || "xtdata/twitter-x-scraper",
  instagram: process.env.APIFY_ORGANIC_INSTAGRAM_ACTOR?.trim() || "sones/instagram-posts-scraper-lowcost",
  tiktok: process.env.APIFY_ORGANIC_TIKTOK_ACTOR?.trim() || "clockworks/tiktok-scraper",
  facebook: process.env.APIFY_ORGANIC_FACEBOOK_ACTOR?.trim() || "apify/facebook-posts-scraper",
  youtube: ORGANIC_YOUTUBE_SHORTS_ACTOR,
};

export const ORGANIC_PLATFORM_LABELS: Record<OrganicPlatform, string> = {
  linkedin: "LinkedIn",
  twitter: "Twitter / X",
  instagram: "Instagram",
  tiktok: "TikTok",
  facebook: "Facebook",
  youtube: "YouTube",
};

export const ORGANIC_PLATFORM_PLACEHOLDERS: Record<OrganicPlatform, string> = {
  linkedin: "https://linkedin.com/company/yourcompetitor",
  twitter: "@handle",
  instagram: "@handle",
  tiktok: "@handle",
  facebook: "https://facebook.com/page",
  youtube: "@channel",
};
