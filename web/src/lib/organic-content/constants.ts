import type { OrganicPlatform } from "./types";

export const ORGANIC_SCRAPE_MAX_ITEMS = 20;
export const ORGANIC_FIRST_SCRAPE_POST_LIMIT = 5;
export const ORGANIC_SCRAPE_INTERVAL_DAYS = 3;
export const ORGANIC_INSIGHTS_MAX_TOKENS = 1000;
export const ORGANIC_FEED_PAGE_SIZE = 20;

export const ORGANIC_ACTOR_IDS: Record<OrganicPlatform, string> = {
  linkedin: process.env.APIFY_ORGANIC_LINKEDIN_ACTOR?.trim() || "curious_coder/linkedin-post-scraper",
  twitter: process.env.APIFY_ORGANIC_TWITTER_ACTOR?.trim() || "apidojo/twitter-scraper",
  instagram: process.env.APIFY_ORGANIC_INSTAGRAM_ACTOR?.trim() || "sones/instagram-posts-scraper-lowcost",
  tiktok: process.env.APIFY_ORGANIC_TIKTOK_ACTOR?.trim() || "clockworks/tiktok-scraper",
  facebook: process.env.APIFY_ORGANIC_FACEBOOK_ACTOR?.trim() || "apify/facebook-posts-scraper",
  youtube: process.env.APIFY_ORGANIC_YOUTUBE_ACTOR?.trim() || "streamers/youtube-scraper",
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
  youtube: "https://youtube.com/@channel",
};
