export type ActivityScoreConfidence = "high" | "medium" | "low" | "insufficient";

export type ActivitySignalName =
  | "production_value"
  | "creative_diversity"
  | "refresh_velocity"
  | "format_sophistication"
  | "landing_infra"
  | "copy_sophistication"
  | "product_depth"
  | "activity_duration";

export type ActivityTopReason = {
  type: "positive" | "negative";
  text: string;
  signal: ActivitySignalName;
};

export type ActivitySignalBlock = {
  score: number;
  weight: number;
  contribution: number;
};

export type ActivityScoreResult = {
  score: number;
  tier: 1 | 2 | 3 | 4 | 5 | 6;
  tierLabel: string;
  spendRange: { min: number; max: number | null };
  signals: Record<ActivitySignalName, ActivitySignalBlock>;
  topReasons: ActivityTopReason[];
  confidence: ActivityScoreConfidence;
  adsCount: number;
  rawMetrics: Record<string, unknown>;
};

export const SIGNAL_WEIGHTS: Record<ActivitySignalName, number> = {
  production_value: 0.25,
  creative_diversity: 0.2,
  refresh_velocity: 0.18,
  format_sophistication: 0.12,
  landing_infra: 0.1,
  copy_sophistication: 0.08,
  product_depth: 0.05,
  activity_duration: 0.02,
};

export type ScrapedAdForActivityScore = {
  format: string;
  ad_text: string;
  first_seen_at: string;
  platform: string;
  raw_payload: unknown;
  ad_creative_url: string | null;
};
