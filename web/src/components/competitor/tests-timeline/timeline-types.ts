export type TimelineAd = {
  id: string;
  platform: string;
  ad_creative_url: string | null;
  ad_text: string;
  ai_extracted_angle: string | null;
  first_seen_at: string;
  last_seen_at: string;
  format: string;
  is_winner: boolean;
  is_killed: boolean;
};

export type TimelineZoom = "30d" | "90d" | "6mo" | "1y" | "all";

export type TimelineSort = "newest" | "longest" | "recently_killed" | "platform";

export type TimelineTick = { t: number; label: string; pct: number };
