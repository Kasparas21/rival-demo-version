import type { AdPerformanceSort } from "@/lib/ad-library/ad-performance-ranking";
import type { Json } from "@/lib/supabase/types";

export type DiscoverySort = AdPerformanceSort | "shuffle";

export type DiscoveryStatusFilter = "all" | "active" | "retired";

export type DiscoveryFormatFilter = "all" | "video" | "image";

export type DiscoveryDatePreset = "7d" | "30d" | "90d" | "all";

/** Which client workspace(s) to include in the feed. */
export type DiscoveryClientScope = "active" | "all" | (string & {});

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

export type DiscoveryFeedQuery = {
  brandId: string;
  /** Defaults to "active" (use brandId). "all" unions every client workspace. */
  clientScope: DiscoveryClientScope;
  offset: number;
  limit: number;
  sort: DiscoverySort;
  shuffleSeed: string;
  platforms: string[];
  format: DiscoveryFormatFilter;
  status: DiscoveryStatusFilter;
  ultimateOnly: boolean;
  query: string;
  competitorId: string | null;
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
  shuffle_seed: string;
};
