import type { Json } from "@/lib/supabase/types";

export type SavedItemType = "ad" | "email" | "organic" | "landing";

export type SavedDatePreset = "7d" | "30d" | "90d" | "all";

export type SavedFormatFilter = "all" | "video" | "image";

export type SavedFeedSort = "newest" | "oldest";

export type SavedFeedQuery = {
  brandId: string;
  offset: number;
  limit: number;
  sort: SavedFeedSort;
  itemType: "all" | SavedItemType;
  platforms: string[];
  format: SavedFormatFilter;
  query: string;
  competitorId: string | null;
  datePreset: SavedDatePreset;
  folderId: string | null;
};

export type SavedFolderChip = {
  id: string;
  name: string;
  item_count: number;
};

type SavedFeedItemBase = {
  id: string;
  item_type: SavedItemType;
  saved_at: string;
  competitor_id: string;
  competitor_name: string;
  competitor_domain: string | null;
  competitor_logo_url: string | null;
};

export type SavedFeedAdItem = SavedFeedItemBase & {
  item_type: "ad";
  platform: string;
  format: string;
  ad_text: string;
  source_scraped_ad_id: string | null;
  raw_payload: Json;
  notes: string | null;
  ai_extracted_angle: string | null;
  folder_id: string | null;
  folder_name: string | null;
  archived_creative_url: string | null;
  ad_creative_url: string | null;
};

export type SavedFeedEmailItem = SavedFeedItemBase & {
  item_type: "email";
  subject: string | null;
  from_email: string | null;
  from_name: string | null;
  preview_text: string | null;
  email_type: string | null;
  ai_summary: string | null;
  received_at: string | null;
  source_competitor_email_id: string | null;
};

export type SavedFeedOrganicItem = SavedFeedItemBase & {
  item_type: "organic";
  platform: string;
  content: string | null;
  media_urls: string[];
  likes: number;
  comments: number;
  shares: number;
  views: number;
  posted_at: string | null;
  post_url: string | null;
  author_display_name: string | null;
};

export type SavedFeedLandingItem = SavedFeedItemBase & {
  item_type: "landing";
  url: string;
  label: string;
  page_type: string | null;
  screenshot_url: string | null;
  hero_screenshot_url: string | null;
};

export type SavedFeedItem =
  | SavedFeedAdItem
  | SavedFeedEmailItem
  | SavedFeedOrganicItem
  | SavedFeedLandingItem;

export type SavedCompetitorChip = {
  id: string;
  name: string;
  domain: string | null;
  logo_url: string | null;
  item_count: number;
};

export type SavedTypeCounts = {
  ads: number;
  emails: number;
  organic: number;
  landings: number;
  total: number;
};

export type SavedFeedResult = {
  ok: true;
  items: SavedFeedItem[];
  total: number;
  offset: number;
  limit: number;
  has_more: boolean;
  competitors: SavedCompetitorChip[];
  folders: SavedFolderChip[];
  type_counts: SavedTypeCounts;
  platform_counts: Record<string, number>;
};
