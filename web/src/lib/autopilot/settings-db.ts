import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";
import type { PlanTier } from "@/lib/billing/plan-limits";

import { parseWatchQuietHours } from "./watch-quiet-hours";
import type { AutopilotSettingsRow, ReportBranding, WatchChannels, WatchSensitivity } from "./types";

export const DEFAULT_AUTOPLIOT_SETTINGS: Omit<AutopilotSettingsRow, "id" | "user_id" | "created_at" | "updated_at"> = {
  enabled: false,
  watch_enabled: true,
  watch_sensitivity: "balanced",
  watch_channels: { email: true, slack: false },
  slack_webhook_url: null,
  watch_competitor_ids: null,
  watch_quiet_hours: { start: 22, end: 7, timezone: "Europe/London" },
  report_enabled: false,
  report_day_of_month: 1,
  report_branding: { logo_url: null, agency_name: null, accent_color: null, hide_powered_by: false },
  report_workspaces: {},
  brief_enabled: false,
};

function parseWatchChannels(raw: unknown): WatchChannels {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { email: true, slack: false };
  }
  const o = raw as Record<string, unknown>;
  return { email: o.email !== false, slack: o.slack === true };
}

function parseReportBranding(raw: unknown): ReportBranding {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { logo_url: null, agency_name: null, accent_color: null, hide_powered_by: false };
  }
  const o = raw as Record<string, unknown>;
  return {
    logo_url: typeof o.logo_url === "string" ? o.logo_url : null,
    agency_name: typeof o.agency_name === "string" ? o.agency_name : null,
    accent_color: typeof o.accent_color === "string" ? o.accent_color : null,
    hide_powered_by: o.hide_powered_by === true,
  };
}

export function rowToAutopilotSettings(row: Record<string, unknown>): AutopilotSettingsRow {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    enabled: row.enabled === true,
    watch_enabled: row.watch_enabled !== false,
    watch_sensitivity: (row.watch_sensitivity as WatchSensitivity) ?? "balanced",
    watch_channels: parseWatchChannels(row.watch_channels),
    slack_webhook_url: typeof row.slack_webhook_url === "string" ? row.slack_webhook_url : null,
    watch_competitor_ids: Array.isArray(row.watch_competitor_ids)
      ? (row.watch_competitor_ids as string[])
      : null,
    watch_quiet_hours: parseWatchQuietHours(row.watch_quiet_hours),
    report_enabled: row.report_enabled === true,
    report_day_of_month: typeof row.report_day_of_month === "number" ? row.report_day_of_month : 1,
    report_branding: parseReportBranding(row.report_branding),
    report_workspaces:
      row.report_workspaces && typeof row.report_workspaces === "object" && !Array.isArray(row.report_workspaces)
        ? (row.report_workspaces as Record<string, boolean>)
        : {},
    brief_enabled: row.brief_enabled === true,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export async function ensureAutopilotSettings(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<AutopilotSettingsRow> {
  const { data: existing } = await supabase
    .from("autopilot_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) return rowToAutopilotSettings(existing as Record<string, unknown>);

  const { data: inserted, error } = await supabase
    .from("autopilot_settings")
    .insert({ user_id: userId, ...DEFAULT_AUTOPLIOT_SETTINGS })
    .select("*")
    .single();

  if (error || !inserted) {
    throw new Error(error?.message ?? "Failed to create autopilot settings");
  }
  return rowToAutopilotSettings(inserted as Record<string, unknown>);
}

export function stripAgencyOnlyFields(
  patch: Record<string, unknown>,
  planTier: PlanTier,
): Record<string, unknown> {
  const isAgency = planTier === "agency" || planTier === "admin";
  if (isAgency) return patch;
  const out = { ...patch };
  delete out.report_branding;
  return out;
}

export function canEnableReports(planTier: PlanTier): boolean {
  return planTier === "pro" || planTier === "agency" || planTier === "admin";
}

export function canEnableBrief(planTier: PlanTier): boolean {
  return planTier === "pro" || planTier === "agency" || planTier === "admin";
}
