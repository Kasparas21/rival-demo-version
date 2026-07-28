import type { AdPerformanceSort } from "@/lib/ad-library/ad-performance-ranking";
import type { Json } from "@/lib/supabase/types";

export type DiscoverySort = AdPerformanceSort | "shuffle";

export type DiscoveryStatusFilter = "all" | "active" | "retired";

export type DiscoveryFormatFilter = "all" | "video" | "image";

export type DiscoveryDatePreset = "7d" | "30d" | "90d" | "all";

export type DiscoveryAdDto = {
  id: string;
  competitor_id: string;
  competitor_name: string;
  competitor_domain: string | null;
  competitor_logo_url: string | null;
  /** Set when aggregating across clients so ads show which workspace they belong to. */
  client_brand_name?: string | null;
  platform: string;
  format: string;
  ad_text: string;
  ad_creative_url: string | null;
  archived_creative_url: string | null;
  first_seen_at: string;
  last_seen_at: string;
  is_active: boolean;
  is_killed: boolean;
  impressions_index: number | null;
  is_ultimate_winner: boolean;
  raw_payload: Json;
};

export type DiscoveryCompetitorChip = {
  id: string;
  name: string;
  domain: string | null;
  logo_url: string | null;
  ad_count: number;
};

/** Aggregated market pulse for the current filtered discovery feed. */
export type DiscoveryMarketStats = {
  total_ads: number;
  active_ads: number;
  retired_ads: number;
  competitors_tracked: number;
  /** Ads whose first_seen_at falls in the last 7 days. */
  new_this_week: number;
  /** Ads whose first_seen_at falls in the prior 7-day window. */
  new_last_week: number;
  new_week_over_week_delta: number;
  /** Percent change in new launches vs prior week; null when prior week had zero launches. */
  new_week_over_week_pct: number | null;
  retired_this_week: number;
  net_change_this_week: number;
  ultimate_winners: number;
  video_percent: number;
  top_competitor_name: string | null;
  top_competitor_ad_count: number;
  avg_impressions_index: number | null;
  hottest_competitor_name: string | null;
  hottest_competitor_new_this_week: number;
};

export type DiscoveryFeedQuery = {
  brandId: string;
  /** Empty = active brand only. Otherwise union competitors from these brand workspaces. */
  clientBrandIds: string[];
  offset: number;
  limit: number;
  sort: DiscoverySort;
  shuffleSeed: string;
  platforms: string[];
  format: DiscoveryFormatFilter;
  status: DiscoveryStatusFilter;
  ultimateOnly: boolean;
  query: string;
  competitorFilterIds: string[];
  datePreset: DiscoveryDatePreset;
};

export type DiscoveryFeedResult = {
  ok: true;
  ads: DiscoveryAdDto[];
  total: number;
  offset: number;
  limit: number;
  has_more: boolean;
  competitors: DiscoveryCompetitorChip[];
  platform_counts: Record<string, number>;
  market_stats: DiscoveryMarketStats;
  shuffle_seed: string;
};

export type DiscoveryPatternWeeklyPoint = {
  week_start: string;
  launches: number;
  retirements: number;
  active_total: number;
};

export type DiscoveryPatternCompetitorMetrics = {
  competitor_id: string;
  name: string;
  active_ads: number;
  launched_this_week: number;
  killed_this_week: number;
  ultimate_winners: number;
  video_share_pct: number;
  aggression_score: number;
};

export type DiscoveryPatternFormatMix = {
  format: "video" | "image";
  active: number;
  new_this_week: number;
};

export type DiscoveryPatternAngleMix = {
  angle: string;
  count: number;
};

export type DiscoveryPatternMetrics = {
  week_start: string;
  total_ads: number;
  active_ads: number;
  new_this_week: number;
  new_prev_week: number;
  killed_this_week: number;
  killed_prev_week: number;
  net_change: number;
  ultimate_winners_total: number;
  new_ultimate_winners_this_week: number;
  video_share_pct: number;
  video_share_of_new_pct: number;
  avg_impressions_index: number | null;
  median_run_days_of_killed: number | null;
  fast_kills_this_week: number;
  weekly_series: DiscoveryPatternWeeklyPoint[];
  competitors: DiscoveryPatternCompetitorMetrics[];
  format_mix: DiscoveryPatternFormatMix[];
  angle_mix: DiscoveryPatternAngleMix[];
};

export type DiscoveryPatternReportStatus = "done" | "failed";

export type DiscoveryPatternReportDto = {
  id: string;
  brand_id: string;
  week_start: string;
  status: DiscoveryPatternReportStatus;
  error_text: string | null;
  metrics: DiscoveryPatternMetrics;
  insights: import("./pattern-types").DiscoveryPatternInsights;
  model: string | null;
  created_at: string;
  updated_at: string;
};
