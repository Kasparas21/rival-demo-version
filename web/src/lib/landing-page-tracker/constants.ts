export const LANDING_PAGE_SCRAPE_INTERVAL_DAYS = 3;
export const PIXEL_DIFF_THRESHOLD = 2;
export const PIXEL_DIFF_NOISE_MAX = 5;
export const LOW_THREAT_MAX = 3;
export const AB_TEST_CONFIRM_DAYS = 7;
export const MEANINGFUL_THREAT_THRESHOLD = 6;
export const MIN_PAGE_TEXT_CHARS = 100;
export const HERO_CROP_HEIGHT_PX = 900;
export const SCREENSHOT_VIEWPORT_WIDTH = 1440;
export const SCREENSHOT_VIEWPORT_HEIGHT = 900;
export const LANDING_PAGE_SCRAPE_BATCH_SIZE = 8;
export const LANDING_PAGE_BUCKET = "landing-page-screenshots";

export type LandingPageType = "homepage" | "pricing" | "features" | "custom";

export type LandingPageText = {
  headline?: string;
  subheadline?: string;
  cta_text?: string;
  pricing_tiers?: string[];
  full_text?: string;
};

export type LandingPageChangeAnalysis = {
  what_changed?: string;
  sections_changed?: string[];
  strategic_interpretation?: string;
  what_to_do?: string;
  urgency?: "high" | "medium" | "low";
  threat_score?: number;
  change_confidence?: "noise" | "suspected_ab" | "confirmed";
};
