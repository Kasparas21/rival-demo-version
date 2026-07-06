import type { Json } from "@/lib/supabase/types";

export const AGENT_SIGNAL_TYPES = [
  "new_winning_ad",
  "new_email_campaign",
  "organic_spike",
  "new_cta",
  "platform_expansion",
  "cross_competitor_trend",
  "strategy_map_shift",
  "influencer_push",
  "landing_page_change",
] as const;

export type AgentSignalType = (typeof AGENT_SIGNAL_TYPES)[number];

export const AGENT_SIGNAL_SOURCES = [
  "ads",
  "email",
  "organic",
  "strategy_map",
  "cross_competitor",
  "landing_pages",
] as const;

export type AgentSignalSource = (typeof AGENT_SIGNAL_SOURCES)[number];

export type AgentChannelKey = "slack" | "discord" | "email";

export type AgentChannelConfig = {
  enabled?: boolean;
  webhook_url?: string;
};

export type AgentChannelsConfig = {
  slack?: AgentChannelConfig;
  discord?: AgentChannelConfig;
  email?: AgentChannelConfig;
};

export type AgentScrapeCycles = {
  ads: number;
  email: number;
  organic: number;
};

export type AgentBaselineMetrics = {
  ads?: {
    avg_ad_duration_days?: number;
    avg_active_ads?: number;
    platforms?: string[];
  };
  email?: {
    avg_emails_per_week?: number;
    common_hooks?: string[];
  };
  organic?: {
    avg_likes?: number;
    avg_comments?: number;
    avg_shares?: number;
    post_freq_per_week?: number;
  };
};

export type DetectedAgentSignal = {
  signal_type: AgentSignalType;
  source: AgentSignalSource;
  threat_score: number;
  payload: Json;
  screenshot_urls?: string[];
};

export type AgentScrapeResults = {
  newAds?: AgentAdInput[];
  newEmails?: AgentEmailInput[];
  newOrganicPosts?: AgentOrganicPostInput[];
  strategyMapChanged?: boolean;
  landingPageChange?: AgentLandingPageChangeInput;
};

export type AgentLandingPageChangeInput = {
  page: {
    id: string;
    url: string;
    label: string;
    page_type: string;
  };
  snapshot: {
    id: string;
    hero_screenshot_url: string | null;
    screenshot_url: string;
    taken_at: string;
  };
  changeAnalysis: {
    what_changed?: string;
    strategic_interpretation?: string;
    what_to_do?: string;
    urgency?: string;
    threat_score?: number;
    sections_changed?: string[];
  };
  prevScreenshotUrl: string | null;
  newScreenshotUrl: string;
};

export type AgentAdInput = {
  id: string;
  platform: string;
  stable_ad_key: string;
  ad_text: string;
  ad_creative_url: string | null;
  first_seen_at: string;
  last_seen_at: string;
  is_active: boolean;
  ai_extracted_angle: string | null;
  raw_payload: Json;
  platforms?: string[];
  headline?: string | null;
  cta?: string | null;
};

export type AgentEmailInput = {
  id: string;
  subject: string | null;
  preview_text: string | null;
  received_at: string;
  email_type: string | null;
  ai_summary: string | null;
  ai_cta: string | null;
  ai_angle: string | null;
  html_body?: string | null;
};

export type AgentOrganicPostInput = {
  id?: string;
  platform: string;
  post_id: string;
  content: string | null;
  media_urls: string[];
  likes: number;
  comments: number;
  shares: number;
  posted_at: string | null;
};

export type GeneratedAgentMessage = {
  subject: string;
  body_markdown: string;
  body_html: string;
};

export const DEFAULT_AGENT_CHANNELS: AgentChannelsConfig = {
  slack: { enabled: false, webhook_url: "" },
  discord: { enabled: false, webhook_url: "" },
  email: { enabled: false },
};

export const AGENT_DAILY_MESSAGE_LIMIT = 20;
export const AGENT_DUPLICATE_WINDOW_MS = 60 * 60 * 1000;
export const AGENT_COLD_START_CYCLES = 3;
