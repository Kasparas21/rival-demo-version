import type { SupabaseClient } from "@supabase/supabase-js";

import {
  loadBrandWatchTargets,
  resolveWatchScope,
} from "@/lib/autopilot/active-watched-competitors";
import type { AutopilotSettingsRow } from "@/lib/autopilot/types";
import type { Database } from "@/lib/supabase/types";

const WATCH_CRON_UTC_HOUR = 7;
const WATCH_CRON_UTC_MINUTE = 15;
const ALERT_LOOKBACK_DAYS = 7;

export type AutopilotDeliveryStatus = {
  /** Human-readable schedule, e.g. "Daily at 07:15 UTC". */
  scheduleLabel: string;
  /** ISO timestamp of the next scheduled cron run (07:15 UTC). */
  nextRunAt: string;
  isArmed: boolean;
  blockers: string[];
  lastWatchSentAt: string | null;
  lastWatchStatus: string | null;
  pendingDeliveries: number;
  backlogAlerts: number;
};

export function nextAutopilotWatchRunUtc(now = new Date()): Date {
  const next = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    WATCH_CRON_UTC_HOUR,
    WATCH_CRON_UTC_MINUTE,
    0,
    0,
  ));
  if (next.getTime() <= now.getTime()) {
    next.setUTCDate(next.getUTCDate() + 1);
  }
  return next;
}

function hasDeliveryChannel(settings: AutopilotSettingsRow, userEmail: string | null): boolean {
  const ch = settings.watch_channels;
  if (ch.email && userEmail?.trim()) return true;
  if (ch.slack && settings.slack_webhook_url?.trim()) return true;
  return false;
}

export async function loadAutopilotDeliveryStatus(
  supabase: SupabaseClient<Database>,
  userId: string,
  settings: AutopilotSettingsRow,
  userEmail: string | null,
): Promise<AutopilotDeliveryStatus> {
  const blockers: string[] = [];
  const nextRun = nextAutopilotWatchRunUtc();

  if (!settings.enabled) {
    blockers.push("Autopilot is off — turn it on in Settings.");
  }
  if (!settings.watch_enabled) {
    blockers.push("Watch delivery is disabled (e.g. after email unsubscribe). Turn Autopilot off and on again, or contact support.");
  }

  const channels = settings.watch_channels;
  const emailReady = channels.email && Boolean(userEmail?.trim());
  const slackReady = channels.slack && Boolean(settings.slack_webhook_url?.trim());

  if (!emailReady && !slackReady) {
    if (channels.email && !userEmail?.trim()) {
      blockers.push("Email channel is on but your account has no email address.");
    } else if (channels.slack && !settings.slack_webhook_url?.trim()) {
      blockers.push("Slack is enabled but not connected — connect Slack or turn on email.");
    } else {
      blockers.push("No delivery channel enabled — turn on email or connect Slack.");
    }
  }

  let competitorCount = 0;
  try {
    const targets = await loadBrandWatchTargets(supabase, userId);
    const scope = resolveWatchScope(targets, settings);
    competitorCount = scope.allowedCompetitorIds.size;
    if (settings.enabled && settings.watch_enabled && competitorCount === 0) {
      blockers.push("No competitors in watch scope — add competitors to a sidebar or enable client brands.");
    }
  } catch {
    blockers.push("Could not verify competitor watch scope.");
  }

  const lookbackIso = new Date(Date.now() - ALERT_LOOKBACK_DAYS * 86_400_000).toISOString();

  const [{ data: lastWatch }, { count: pendingCount }, { count: backlogCount }] = await Promise.all([
    supabase
      .from("autopilot_outputs")
      .select("sent_at, status")
      .eq("user_id", userId)
      .eq("output_type", "watch_alert")
      .in("status", ["sent", "failed", "pending"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("autopilot_outputs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("output_type", "watch_alert")
      .eq("status", "pending"),
    supabase
      .from("competitor_alerts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("autopilot_processed_at", null)
      .is("notified_at", null)
      .gte("detected_at", lookbackIso),
  ]);

  const isArmed =
    blockers.length === 0 &&
    settings.enabled &&
    settings.watch_enabled &&
    hasDeliveryChannel(settings, userEmail) &&
    competitorCount > 0;

  if (isArmed && (backlogCount ?? 0) === 0 && (pendingCount ?? 0) === 0) {
    blockers.push("Armed and waiting — new competitor alerts are checked once per day.");
  }

  return {
    scheduleLabel: `Daily at ${String(WATCH_CRON_UTC_HOUR).padStart(2, "0")}:${String(WATCH_CRON_UTC_MINUTE).padStart(2, "0")} UTC`,
    nextRunAt: nextRun.toISOString(),
    isArmed,
    blockers,
    lastWatchSentAt: lastWatch?.sent_at ?? null,
    lastWatchStatus: lastWatch?.status ?? null,
    pendingDeliveries: pendingCount ?? 0,
    backlogAlerts: backlogCount ?? 0,
  };
}
