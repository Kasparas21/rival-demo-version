import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";
import type { PlanTier } from "@/lib/billing/plan-limits";

import { parseWatchQuietHours } from "./watch-quiet-hours";
import type {
  AutopilotSettingsRow,
  ReportBranding,
  SlackConnection,
  WatchChannels,
  WatchSensitivity,
} from "./types";

export const DEFAULT_AUTOPLIOT_SETTINGS: Omit<AutopilotSettingsRow, "id" | "user_id" | "created_at" | "updated_at"> = {
  enabled: false,
  watch_enabled: true,
  watch_sensitivity: "balanced",
  watch_min_score: 6,
  watch_channels: { email: true, slack: false, discord: false },
  slack_webhook_url: null,
  slack_connection: null,
  discord_webhook_url: null,
  watch_competitor_ids: null,
  watch_quiet_hours: { start: 22, end: 7, timezone: "Europe/London" },
  watch_workspaces: {},
  report_enabled: false,
  report_day_of_month: 1,
  report_branding: { logo_url: null, agency_name: null, accent_color: null, hide_powered_by: false },
  report_workspaces: {},
  brief_enabled: false,
};

function parseWatchChannels(raw: unknown): WatchChannels {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { email: true, slack: false, discord: false };
  }
  const o = raw as Record<string, unknown>;
  return {
    email: o.email !== false,
    slack: o.slack === true,
    discord: false,
  };
}

/** Columns present in the original autopilot_settings migration (safe on all envs). */
const AUTOPILOT_SETTINGS_BASE_INSERT: Omit<
  Database["public"]["Tables"]["autopilot_settings"]["Insert"],
  "user_id" | "id" | "created_at" | "updated_at"
> = {
  enabled: DEFAULT_AUTOPLIOT_SETTINGS.enabled,
  watch_enabled: DEFAULT_AUTOPLIOT_SETTINGS.watch_enabled,
  watch_sensitivity: DEFAULT_AUTOPLIOT_SETTINGS.watch_sensitivity,
  watch_channels: { email: true, slack: false },
  watch_quiet_hours: DEFAULT_AUTOPLIOT_SETTINGS.watch_quiet_hours,
  report_enabled: DEFAULT_AUTOPLIOT_SETTINGS.report_enabled,
  report_day_of_month: DEFAULT_AUTOPLIOT_SETTINGS.report_day_of_month,
  report_branding: DEFAULT_AUTOPLIOT_SETTINGS.report_branding,
  report_workspaces: DEFAULT_AUTOPLIOT_SETTINGS.report_workspaces,
  brief_enabled: DEFAULT_AUTOPLIOT_SETTINGS.brief_enabled,
};

const AUTOPILOT_SETTINGS_UPDATE_KEYS = [
  "enabled",
  "watch_enabled",
  "watch_sensitivity",
  "watch_min_score",
  "watch_channels",
  "slack_webhook_url",
  "slack_connection",
  "watch_competitor_ids",
  "watch_quiet_hours",
  "watch_workspaces",
  "report_enabled",
  "report_day_of_month",
  "report_branding",
  "report_workspaces",
  "brief_enabled",
] as const satisfies readonly (keyof Database["public"]["Tables"]["autopilot_settings"]["Update"])[];

/** Strip unknown / deprecated columns so PostgREST never sees discord_connection. */
export function sanitizeAutopilotSettingsPatch(patch: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of AUTOPILOT_SETTINGS_UPDATE_KEYS) {
    if (key in patch) out[key] = patch[key];
  }
  if (out.watch_channels && typeof out.watch_channels === "object" && !Array.isArray(out.watch_channels)) {
    const channels = out.watch_channels as Record<string, unknown>;
    out.watch_channels = {
      email: channels.email !== false,
      slack: channels.slack === true,
      discord: false,
    };
  }
  return out;
}

async function applyExtendedAutopilotDefaults(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from("autopilot_settings")
    .update({ watch_min_score: DEFAULT_AUTOPLIOT_SETTINGS.watch_min_score })
    .eq("user_id", userId);
  if (error) {
    console.warn("[autopilot] extended defaults skipped:", error.message);
  }
}

async function insertAutopilotSettingsRow(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<Record<string, unknown>> {
  const { data: inserted, error } = await supabase
    .from("autopilot_settings")
    .insert({ user_id: userId, ...AUTOPILOT_SETTINGS_BASE_INSERT })
    .select("*")
    .single();

  if (error || !inserted) {
    throw new Error(error?.message ?? "Failed to create autopilot settings");
  }

  await applyExtendedAutopilotDefaults(supabase, userId);

  const { data: refreshed } = await supabase
    .from("autopilot_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  return (refreshed ?? inserted) as Record<string, unknown>;
}

function parseSlackConnection(raw: unknown): SlackConnection | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.team_name !== "string" || typeof o.channel !== "string" || typeof o.connected_at !== "string") {
    return null;
  }
  return {
    team_name: o.team_name,
    channel: o.channel,
    configuration_url: typeof o.configuration_url === "string" ? o.configuration_url : null,
    connected_at: o.connected_at,
  };
}

function parseBooleanRecord(raw: unknown): Record<string, boolean> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === "boolean") out[k] = v;
  }
  return out;
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
    watch_min_score:
      typeof row.watch_min_score === "number" && Number.isFinite(row.watch_min_score)
        ? row.watch_min_score
        : null,
    watch_channels: parseWatchChannels(row.watch_channels),
    slack_webhook_url: typeof row.slack_webhook_url === "string" ? row.slack_webhook_url : null,
    slack_connection: parseSlackConnection(row.slack_connection),
    discord_webhook_url: typeof row.discord_webhook_url === "string" ? row.discord_webhook_url : null,
    watch_competitor_ids: Array.isArray(row.watch_competitor_ids)
      ? (row.watch_competitor_ids as string[])
      : null,
    watch_quiet_hours: parseWatchQuietHours(row.watch_quiet_hours),
    watch_workspaces: parseBooleanRecord(row.watch_workspaces),
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

  const inserted = await insertAutopilotSettingsRow(supabase, userId);
  return rowToAutopilotSettings(inserted);
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
