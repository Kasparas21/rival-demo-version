export type TimelineAd = {
  id: string;
  platform: string;
  ad_creative_url: string | null;
  archived_creative_url?: string | null;
  ad_text: string;
  ai_extracted_angle: string | null;
  first_seen_at: string;
  last_seen_at: string;
  format: string;
  is_winner: boolean;
  is_killed: boolean;
};

/** @deprecated Use TimelineDatePreset in toolbar */
export type TimelineZoom = "30d" | "90d" | "6mo" | "1y" | "all";

export type TimelineDatePreset = "7d" | "14d" | "30d" | "90d" | "365d" | "all" | "custom";

export type TimelineSort = "newest" | "oldest" | "longest";

export type TimelineStatusFilter = "all" | "active" | "retired";

export type TimelineFormatFilter = "all" | "video" | "image";

export type TimelineViewFields = {
  brandDetails: boolean;
  adCopy: boolean;
  headlineCta: boolean;
};

export type TimelineTick = { t: number; label: string; pct: number };

export type TimelineDayColumn = {
  dayStartMs: number;
  dayIndex: number;
  dayOfMonth: number;
  monthKey: string;
  monthLabel: string;
  isMonthStart: boolean;
};

export type TimelineMonthSpan = {
  monthKey: string;
  monthLabel: string;
  startIndex: number;
  dayCount: number;
};

export type TimelineGanttRow =
  | { type: "ad"; ad: TimelineAd }
  | { type: "duplicate-group"; key: string; ads: TimelineAd[]; representative: TimelineAd };

export type TimelineBarGeometry = {
  leftPx: number;
  widthPx: number;
  lifespanDays: number;
};
