import type { AdPerformanceSort } from "@/lib/ad-library/ad-performance-ranking";
import type { Json } from "@/lib/supabase/types";

export type DiscoverySort = AdPerformanceSort | "shuffle";

export type DiscoveryStatusFilter = "all" | "active" | "retired";

export type DiscoveryFormatFilter = "all" | "video" | "image";

export type DiscoveryDatePreset = "today" | "3d" | "4d" | "7d" | "30d" | "90d" | "all";

/** Whether date presets filter by ads live in window or ads that launched in window. */
export type DiscoveryDateFilterMode = "live" | "launched";

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
  dateFilterMode: DiscoveryDateFilterMode;
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
  ad_ids?: string[];
  active_count?: number;
  killed_count?: number;
  new_this_week?: number;
  killed_this_week?: number;
};

export type PatternDrilldownAdStatus =
  | "new_this_week"
  | "active"
  | "killed_this_week"
  | "killed"
  | "ultimate_winner";

export type PatternDrilldownAd = {
  id: string;
  competitor_id: string;
  competitor_name: string;
  status: PatternDrilldownAdStatus;
  format: string;
  preview: string;
  days_running: number;
  impressions_index: number | null;
  launched: string;
  angle: string | null;
  is_ultimate_winner: boolean;
};

export type PatternDrilldownCompetitorGroup = {
  competitor_id: string;
  name: string;
  ads: PatternDrilldownAd[];
};

export type PatternDrilldownResult = {
  title: string;
  total: number;
  groups: {
    new_this_week: PatternDrilldownAd[];
    active: PatternDrilldownAd[];
    killed_this_week: PatternDrilldownAd[];
    killed: PatternDrilldownAd[];
  };
  by_competitor: PatternDrilldownCompetitorGroup[];
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

export type DiscoveryLandingPageSort = "newest" | "oldest" | "threat";

export type DiscoveryLandingPageChangeFilter = "all" | "permanent" | "ab_test" | "unknown";

export type DiscoveryLandingPageChangeDto = {
  id: string;
  landing_page_id: string;
  competitor_id: string;
  competitor_name: string;
  competitor_domain: string | null;
  competitor_logo_url: string | null;
  client_brand_name?: string | null;
  url: string;
  label: string;
  page_type: string;
  taken_at: string;
  screenshot_url: string;
  hero_screenshot_url: string | null;
  page_text: Json;
  pixel_diff_pct: number | null;
  change_analysis: Json;
  prev_screenshot_url: string | null;
  prev_hero_screenshot_url: string | null;
  prev_page_text: Json | null;
  prev_taken_at: string | null;
};

export type DiscoveryLandingPagesQuery = {
  brandId: string;
  clientBrandIds: string[];
  offset: number;
  limit: number;
  sort: DiscoveryLandingPageSort;
  query: string;
  competitorFilterIds: string[];
  datePreset: DiscoveryDatePreset;
  changeFilter: DiscoveryLandingPageChangeFilter;
};

export type DiscoveryLandingPagesResult =
  | {
      ok: true;
      changes: DiscoveryLandingPageChangeDto[];
      total: number;
      offset: number;
      limit: number;
      has_more: boolean;
      competitors: DiscoveryCompetitorChip[];
      filter_counts: Record<DiscoveryLandingPageChangeFilter, number>;
    }
  | { ok: false; error: string };

export type DiscoveryStatsDrilldownKind =
  | "launched"
  | "killed"
  | "active"
  | "ultimate_winners"
  | "longest_running"
  | "fast_kills"
  | "competitor_launched"
  | "competitor_killed"
  | "competitor_active"
  | "competitor_winners"
  | "single_ad";

export type DiscoveryStatsDrilldownRef = {
  kind: DiscoveryStatsDrilldownKind;
  competitor_id?: string;
  ad_id?: string;
  ad_ids?: string[];
};

export type DiscoveryStatsRangeMeta = {
  label: string;
  date_from: string;
  date_to: string;
  start_ms: number;
  end_ms: number;
};

export type DiscoveryStatsMarket = {
  total_ads: number;
  active_ads: number;
  launched_in_period: number;
  killed_in_period: number;
  net_change: number;
  ultimate_winners: number;
  video_share_pct: number;
  avg_impressions_index: number | null;
  fast_kills_in_period: number;
};

export type DiscoveryStatsHighlight = {
  id: string;
  label: string;
  value: string;
  hint?: string;
  drilldown: DiscoveryStatsDrilldownRef;
};

export type DiscoveryStatsCompetitorRow = {
  competitor_id: string;
  name: string;
  domain: string | null;
  logo_url: string | null;
  active_ads: number;
  launched_in_period: number;
  killed_in_period: number;
  net_change: number;
  ultimate_winners: number;
  video_share_pct: number;
  total_days_running: number;
  avg_days_running: number;
  longest_ad_days: number;
  longest_ad_id: string | null;
  aggression_score: number;
};

export type DiscoveryStatsLongestAd = {
  ad_id: string;
  competitor_id: string;
  competitor_name: string;
  days_running: number;
  preview: string;
  is_ultimate_winner: boolean;
  impressions_index: number | null;
};

export type DiscoveryStatsDto = {
  range: DiscoveryStatsRangeMeta;
  market: DiscoveryStatsMarket;
  highlights: DiscoveryStatsHighlight[];
  competitors: DiscoveryStatsCompetitorRow[];
  longest_running: DiscoveryStatsLongestAd[];
};

export type DiscoveryStatsQuery = {
  brandId: string;
  clientBrandIds: string[];
  competitorFilterIds: string[];
  datePreset: DiscoveryDatePreset;
  statsDateFrom: string | null;
  statsDateTo: string | null;
  format: DiscoveryFormatFilter;
  status: DiscoveryStatusFilter;
};

export type DiscoveryStatsResult =
  | { ok: true; stats: DiscoveryStatsDto; competitors: DiscoveryCompetitorChip[] }
  | { ok: false; error: string };

export type DiscoveryStatsDrilldownQuery = {
  brandId: string;
  clientBrandIds: string[];
  competitorFilterIds: string[];
  datePreset: DiscoveryDatePreset;
  statsDateFrom: string | null;
  statsDateTo: string | null;
  kind: DiscoveryStatsDrilldownKind;
  competitorId?: string;
  adIds?: string[];
  title?: string;
};

export type DiscoveryStatsDrilldownResult = PatternDrilldownResult;
