import type { AlertSeverity, AlertType } from "@/lib/alerts/alert-types";
import type { Json } from "@/lib/supabase/types";

export type WatchSensitivity = "paranoid" | "balanced" | "big_moves";

export type AutopilotOutputType = "watch_alert" | "monthly_report" | "weekly_brief";

export type AutopilotOutputStatus = "pending" | "sent" | "failed" | "suppressed";

export type WatchChannels = {
  email: boolean;
  slack: boolean;
  discord: boolean;
};

export type WatchQuietHours = {
  start: number;
  end: number;
  timezone: string;
};

export type ReportBranding = {
  logo_url: string | null;
  agency_name: string | null;
  accent_color: string | null;
  hide_powered_by: boolean;
};

export type SlackConnection = {
  team_name: string;
  channel: string;
  configuration_url: string | null;
  connected_at: string;
};

export type DiscordConnection = {
  guild_name: string;
  channel_name: string;
  connected_at: string;
};

export type AutopilotSettingsRow = {
  id: string;
  user_id: string;
  enabled: boolean;
  watch_enabled: boolean;
  watch_sensitivity: WatchSensitivity;
  watch_min_score: number | null;
  watch_channels: WatchChannels;
  slack_webhook_url: string | null;
  slack_connection: SlackConnection | null;
  discord_webhook_url: string | null;
  discord_connection: DiscordConnection | null;
  watch_competitor_ids: string[] | null;
  watch_quiet_hours: WatchQuietHours;
  report_enabled: boolean;
  report_day_of_month: number;
  report_branding: ReportBranding;
  report_workspaces: Record<string, boolean>;
  brief_enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type WatchRecommendation = {
  headline: string;
  recommendation: string;
  confidence: "high" | "medium" | "low";
};

export type WatchAlertCandidate = {
  id: string;
  user_id: string;
  competitor_id: string;
  alert_type: AlertType;
  severity: AlertSeverity;
  title: string;
  body: string | null;
  metadata: Json;
  detected_at: string;
  competitorName: string;
  competitorHost: string;
};

export type WatchAlertBlock = WatchAlertCandidate & WatchRecommendation & {
  investigateUrl: string;
};

export type AutopilotWatchRunSummary = {
  ok: boolean;
  mode: "production" | "test";
  considered: number;
  passedSensitivity: number;
  quietHoursQueued: number;
  sent: number;
  failed: number;
  suppressed: number;
  errors: string[];
};
