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

/** Gap between calibration screenshots on first activation. */
export const ANIMATION_CALIBRATION_GAP_MS = 90_000;
/** Gap between dual quick captures on each scrape. */
export const SCREENSHOT_DUAL_CAPTURE_GAP_MS = 15_000;
export const SCREENSHOT_CAPTURE_DELAY_SEC = 5;
/** If this share of diff pixels fall inside the animation mask, treat as carousel noise. */
export const MASK_NOISE_OVERLAP_THRESHOLD = 0.8;
export const DIFF_REGION_MIN_AREA_PX = 400;
export const DIFF_REGION_MAX_COUNT = 3;
export const DIFF_REGION_PADDING_PX = 12;
export const SECTION_TILE_HEIGHT_PX = 900;
export const SECTION_TILE_OVERLAP_PX = 100;
export const SECTION_TILE_DIFF_THRESHOLD_PCT = 1;

export type AnimationCalibrationStatus = "pending" | "running" | "done" | "failed";

/** Normalized rectangle (0–1) marking animated/volatile page regions. */
export type NormalizedRect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type LandingPageType = "homepage" | "pricing" | "features" | "custom";

export type LandingPageText = {
  headline?: string;
  subheadline?: string;
  cta_text?: string;
  pricing_tiers?: string[];
  full_text?: string;
};

export type VisualChangeRegion = {
  id: string;
  label: string;
  section: string;
  before_crop_url: string;
  after_crop_url: string;
  before_color?: string;
  after_color?: string;
  color_changed: boolean;
};

export type LandingPageChangeAnalysis = {
  what_changed?: string;
  sections_changed?: string[];
  strategic_interpretation?: string;
  what_to_do?: string;
  urgency?: "high" | "medium" | "low";
  threat_score?: number;
  change_confidence?: "noise" | "suspected_ab" | "confirmed";
  visual_changes?: VisualChangeRegion[];
  mask_overlap_pct?: number;
  ignored_animation?: boolean;
};
