import { createHash } from "crypto";

import { Resend } from "resend";
import type { SupabaseClient } from "@supabase/supabase-js";

import { isAlertType } from "@/lib/alerts/alert-types";
import { normalizeCompetitorSlug } from "@/lib/sidebar-competitors";
import { getResendApiKey, getResendFromEmail } from "@/lib/email/resend-config";
import { getCachedStrategyOverview } from "@/lib/strategy-overview/recompute-strategy-overview";
import type { Database } from "@/lib/supabase/types";

import { acquireAutopilotCronLock, releaseAutopilotCronLock } from "./cron-lock";
import { buildAutopilotSettingsUrl, buildWatchAlertInvestigateUrl } from "./watch-deep-links";
import { buildAutopilotUnsubscribeUrl } from "./unsubscribe-token";
import { parseWatchQuietHours, isInQuietHours } from "./watch-quiet-hours";
import { passesWatchSensitivity } from "./watch-sensitivity";
import { generateWatchRecommendation } from "./watch-recommendation";
import { buildWatchEmailHtml, buildWatchEmailText, watchEmailSubject } from "./watch-email";
import { sendWatchSlackWebhook } from "./watch-slack";
import type {
  AutopilotSettingsRow,
  AutopilotWatchRunSummary,
  WatchAlertBlock,
  WatchAlertCandidate,
  WatchChannels,
} from "./types";

const MAX_BLOCKS_PER_EMAIL = 5;
const ALERT_LOOKBACK_DAYS = 7;
const MAX_SEND_ATTEMPTS = 3;

function parseWatchChannels(raw: unknown): WatchChannels {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { email: true, slack: false };
  }
  const o = raw as Record<string, unknown>;
  return {
    email: o.email !== false,
    slack: o.slack === true,
  };
}

function settingsFromRow(row: Record<string, unknown>): AutopilotSettingsRow {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    enabled: row.enabled === true,
    watch_enabled: row.watch_enabled !== false,
    watch_sensitivity: (row.watch_sensitivity as AutopilotSettingsRow["watch_sensitivity"]) ?? "balanced",
    watch_channels: parseWatchChannels(row.watch_channels),
    slack_webhook_url:
      typeof row.slack_webhook_url === "string" ? row.slack_webhook_url : null,
    watch_competitor_ids: Array.isArray(row.watch_competitor_ids)
      ? (row.watch_competitor_ids as string[])
      : null,
    watch_quiet_hours: parseWatchQuietHours(row.watch_quiet_hours),
    report_enabled: row.report_enabled === true,
    report_day_of_month:
      typeof row.report_day_of_month === "number" ? row.report_day_of_month : 1,
    report_branding:
      row.report_branding && typeof row.report_branding === "object"
        ? (row.report_branding as AutopilotSettingsRow["report_branding"])
        : { logo_url: null, agency_name: null, accent_color: null, hide_powered_by: false },
    report_workspaces:
      row.report_workspaces && typeof row.report_workspaces === "object" && !Array.isArray(row.report_workspaces)
        ? (row.report_workspaces as Record<string, boolean>)
        : {},
    brief_enabled: row.brief_enabled === true,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function batchDedupeKey(userId: string, alertIds: string[]): string {
  const sorted = [...alertIds].sort();
  const hash = createHash("sha256").update(sorted.join(",")).digest("hex").slice(0, 16);
  return `watch_batch:${userId}:${hash}`;
}

function competitorHost(row: { brand_domain: string | null; slug: string }): string {
  const domain = row.brand_domain?.trim();
  if (domain) {
    return normalizeCompetitorSlug(domain.replace(/^https?:\/\//i, "").split("/")[0] ?? domain);
  }
  return normalizeCompetitorSlug(row.slug);
}

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function runWorker(): Promise<void> {
    while (true) {
      const i = cursor++;
      if (i >= items.length) break;
      results[i] = await fn(items[i]!);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => runWorker()));
  return results;
}

type PendingPayload = {
  blocks: WatchAlertBlock[];
  overflowCount: number;
  alertIds: string[];
  _meta?: { sendAttempts?: number };
};

async function deliverWatchBatch(params: {
  admin: SupabaseClient<Database>;
  userId: string;
  settings: AutopilotSettingsRow;
  blocks: WatchAlertBlock[];
  overflowCount: number;
  alertIds: string[];
  dedupeKey: string;
  outputId?: string;
  appOrigin: string;
  existingAttempts?: number;
}): Promise<"sent" | "failed" | "skipped"> {
  const { admin, userId, settings, blocks, overflowCount, alertIds, dedupeKey, appOrigin } = params;
  if (blocks.length === 0) return "skipped";

  const channels = settings.watch_channels;
  const settingsUrl = buildAutopilotSettingsUrl(appOrigin);
  const unsubscribeUrl = buildAutopilotUnsubscribeUrl(appOrigin, userId);

  const { data: authUser } = await admin.auth.admin.getUserById(userId);
  const email = authUser.user?.email?.trim();
  const channelsSent: string[] = [];
  let sendError: string | null = null;

  if (channels.email && email) {
    const apiKey = getResendApiKey();
    if (!apiKey) {
      sendError = "resend_not_configured";
    } else {
      const resend = new Resend(apiKey);
      const subject = watchEmailSubject(blocks, overflowCount);
      const { error } = await resend.emails.send({
        from: getResendFromEmail(),
        to: email,
        subject,
        html: buildWatchEmailHtml({ blocks, overflowCount, settingsUrl, unsubscribeUrl }),
        text: buildWatchEmailText({ blocks, overflowCount, settingsUrl, unsubscribeUrl }),
      });
      if (error) {
        sendError = error.message ?? "resend_failed";
        console.error("[autopilot-FAILED] email", userId, sendError);
      } else {
        channelsSent.push("email");
      }
    }
  }

  if (channels.slack && settings.slack_webhook_url?.trim()) {
    const slackResult = await sendWatchSlackWebhook({
      webhookUrl: settings.slack_webhook_url,
      blocks,
      overflowCount,
      settingsUrl,
    });
    if (slackResult.ok) {
      channelsSent.push("slack");
    } else {
      console.error("[autopilot-FAILED] slack", userId, slackResult.error);
    }
  }

  const prevAttempts = params.existingAttempts ?? 0;

  if (channelsSent.length === 0) {
    const newAttempts = prevAttempts + 1;
    const permanent = newAttempts >= MAX_SEND_ATTEMPTS;
    const row = {
      user_id: userId,
      output_type: "watch_alert" as const,
      dedupe_key: dedupeKey,
      payload: {
        blocks,
        overflowCount,
        alertIds,
        _meta: { sendAttempts: newAttempts },
      } satisfies PendingPayload,
      channels_sent: [],
      status: permanent ? ("failed" as const) : ("failed" as const),
      error: sendError ?? "no_channel_delivered",
      sent_at: null as string | null,
    };
    if (params.outputId) {
      await admin.from("autopilot_outputs").update(row).eq("id", params.outputId);
    } else {
      await admin.from("autopilot_outputs").upsert(row, { onConflict: "dedupe_key" });
    }
    if (permanent) {
      const nowIso = new Date().toISOString();
      await admin.from("competitor_alerts").update({ autopilot_processed_at: nowIso }).in("id", alertIds);
    }
    return "failed";
  }

  const nowIso = new Date().toISOString();
  const successRow = {
    user_id: userId,
    output_type: "watch_alert" as const,
    dedupe_key: dedupeKey,
    payload: { blocks, overflowCount, alertIds, _meta: { sendAttempts: prevAttempts } } satisfies PendingPayload,
    channels_sent: channelsSent,
    status: "sent" as const,
    error: null,
    sent_at: nowIso,
  };

  if (params.outputId) {
    await admin.from("autopilot_outputs").update(successRow).eq("id", params.outputId);
  } else {
    await admin.from("autopilot_outputs").upsert(successRow, { onConflict: "dedupe_key" });
  }

  await admin.from("competitor_alerts").update({ autopilot_processed_at: nowIso }).in("id", alertIds);
  return "sent";
}

async function flushPendingOutputs(params: {
  admin: SupabaseClient<Database>;
  settingsByUser: Map<string, AutopilotSettingsRow>;
  appOrigin: string;
  now: Date;
  summary: AutopilotWatchRunSummary;
}): Promise<void> {
  const { admin, settingsByUser, appOrigin, now, summary } = params;

  const { data: pendingRows } = await admin
    .from("autopilot_outputs")
    .select("id, user_id, dedupe_key, payload, status")
    .eq("output_type", "watch_alert")
    .eq("status", "pending");

  for (const row of pendingRows ?? []) {
    const settings = settingsByUser.get(row.user_id);
    if (!settings?.enabled || !settings.watch_enabled) {
      await admin
        .from("autopilot_outputs")
        .update({ status: "suppressed", error: "autopilot_disabled" })
        .eq("id", row.id);
      const payload = row.payload as PendingPayload;
      if (payload?.alertIds?.length) {
        const nowIso = new Date().toISOString();
        await admin
          .from("competitor_alerts")
          .update({ autopilot_processed_at: nowIso })
          .in("id", payload.alertIds);
      }
      summary.suppressed += 1;
      continue;
    }

    if (isInQuietHours(now, settings.watch_quiet_hours)) {
      summary.quietHoursQueued += 1;
      continue;
    }

    const payload = row.payload as PendingPayload;
    if (!payload?.blocks?.length) continue;

    const result = await deliverWatchBatch({
      admin,
      userId: row.user_id,
      settings,
      blocks: payload.blocks,
      overflowCount: payload.overflowCount ?? 0,
      alertIds: payload.alertIds ?? [],
      dedupeKey: row.dedupe_key,
      outputId: row.id,
      appOrigin,
      existingAttempts: payload._meta?.sendAttempts ?? 0,
    });

    if (result === "sent") summary.sent += 1;
    else if (result === "failed") summary.failed += 1;
  }
}

export async function runAutopilotWatch(params: {
  admin: SupabaseClient<Database>;
  testMode?: boolean;
  testUserId?: string | null;
  appOrigin?: string;
}): Promise<AutopilotWatchRunSummary> {
  const summary: AutopilotWatchRunSummary = {
    ok: true,
    mode: params.testMode ? "test" : "production",
    considered: 0,
    passedSensitivity: 0,
    quietHoursQueued: 0,
    sent: 0,
    failed: 0,
    suppressed: 0,
    errors: [],
  };

  const appOrigin = params.appOrigin?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://spy-rival.com";
  const now = new Date();

  const lockOwner = await acquireAutopilotCronLock(params.admin, "autopilot-watch");
  if (!lockOwner) {
    summary.ok = false;
    summary.errors.push("lock_not_acquired");
    return summary;
  }

  try {
    let settingsQuery = params.admin.from("autopilot_settings").select("*").eq("enabled", true).eq("watch_enabled", true);
    if (params.testMode && params.testUserId) {
      settingsQuery = settingsQuery.eq("user_id", params.testUserId);
    }
    const { data: settingsRows, error: settingsErr } = await settingsQuery;
    if (settingsErr) {
      summary.ok = false;
      summary.errors.push(settingsErr.message);
      return summary;
    }

    const settingsByUser = new Map<string, AutopilotSettingsRow>();
    for (const row of settingsRows ?? []) {
      settingsByUser.set(row.user_id, settingsFromRow(row as Record<string, unknown>));
    }

    await flushPendingOutputs({ admin: params.admin, settingsByUser, appOrigin, now, summary });

    if (settingsByUser.size === 0) {
      console.info("[autopilot-watch]", summary);
      return summary;
    }

    const lookbackIso = new Date(now.getTime() - ALERT_LOOKBACK_DAYS * 86_400_000).toISOString();
    const userIds = [...settingsByUser.keys()];

    const { data: alerts, error: alertsErr } = await params.admin
      .from("competitor_alerts")
      .select("id, user_id, competitor_id, alert_type, severity, title, body, metadata, detected_at")
      .in("user_id", userIds)
      .is("autopilot_processed_at", null)
      .gte("detected_at", lookbackIso)
      .order("detected_at", { ascending: false })
      .limit(500);

    if (alertsErr) {
      summary.ok = false;
      summary.errors.push(alertsErr.message);
      return summary;
    }

    summary.considered = alerts?.length ?? 0;
    if (!alerts?.length) {
      console.info("[autopilot-watch]", summary);
      return summary;
    }

    const competitorIds = [...new Set(alerts.map((a) => a.competitor_id))];
    const { data: comps } = await params.admin
      .from("saved_competitors")
      .select("id, name, brand_name, brand_domain, slug, is_workspace_brand")
      .in("id", competitorIds);

    const compById = new Map((comps ?? []).map((c) => [c.id, c]));

    const byUser = new Map<string, typeof alerts>();
    for (const alert of alerts) {
      const comp = compById.get(alert.competitor_id);
      if (!comp || comp.is_workspace_brand) continue;

      const settings = settingsByUser.get(alert.user_id);
      if (!settings) continue;

      const watchIds = settings.watch_competitor_ids;
      if (watchIds?.length && !watchIds.includes(alert.competitor_id)) continue;

      if (!passesWatchSensitivity(alert.alert_type, alert.severity, settings.watch_sensitivity)) {
        continue;
      }

      summary.passedSensitivity += 1;
      const list = byUser.get(alert.user_id) ?? [];
      list.push(alert);
      byUser.set(alert.user_id, list);
    }

    for (const [userId, userAlerts] of byUser) {
      const settings = settingsByUser.get(userId)!;

      const candidates: WatchAlertCandidate[] = userAlerts.map((a) => {
        const comp = compById.get(a.competitor_id)!;
        return {
          id: a.id,
          user_id: a.user_id,
          competitor_id: a.competitor_id,
          alert_type: isAlertType(a.alert_type) ? a.alert_type : "new_angle",
          severity: a.severity as WatchAlertCandidate["severity"],
          title: a.title,
          body: a.body,
          metadata: a.metadata,
          detected_at: a.detected_at,
          competitorName: comp.brand_name?.trim() || comp.name?.trim() || "Competitor",
          competitorHost: competitorHost(comp),
        };
      });

      const blocks = await mapLimit(candidates, 5, async (c) => {
        const strategyPayload = await getCachedStrategyOverview(
          params.admin,
          userId,
          c.competitor_id,
          c.competitorHost,
        );
        const rec = await generateWatchRecommendation({
          alertType: c.alert_type,
          competitorName: c.competitorName,
          alertTitle: c.title,
          alertBody: c.body,
          strategyPayload,
        });
        return {
          ...c,
          ...rec,
          investigateUrl: buildWatchAlertInvestigateUrl(appOrigin, c.competitorHost, "email"),
        } satisfies WatchAlertBlock;
      });

      const emailBlocks = blocks.slice(0, MAX_BLOCKS_PER_EMAIL);
      const overflowCount = Math.max(0, blocks.length - MAX_BLOCKS_PER_EMAIL);
      const alertIds = blocks.map((b) => b.id);
      const dedupeKey = batchDedupeKey(userId, alertIds);

      const { data: existing } = await params.admin
        .from("autopilot_outputs")
        .select("id, status")
        .eq("dedupe_key", dedupeKey)
        .maybeSingle();

      if (existing?.status === "sent") {
        const nowIso = new Date().toISOString();
        await params.admin
          .from("competitor_alerts")
          .update({ autopilot_processed_at: nowIso })
          .in("id", alertIds);
        continue;
      }

      if (isInQuietHours(now, settings.watch_quiet_hours)) {
        const payload: PendingPayload = {
          blocks: emailBlocks,
          overflowCount,
          alertIds,
        };
        await params.admin.from("autopilot_outputs").upsert(
          {
            user_id: userId,
            output_type: "watch_alert",
            dedupe_key: dedupeKey,
            payload,
            channels_sent: [],
            status: "pending",
            error: null,
          },
          { onConflict: "dedupe_key" },
        );
        summary.quietHoursQueued += 1;
        continue;
      }

      const result = await deliverWatchBatch({
        admin: params.admin,
        userId,
        settings,
        blocks: emailBlocks,
        overflowCount,
        alertIds,
        dedupeKey,
        outputId: existing?.id,
        appOrigin,
      });

      if (result === "sent") summary.sent += 1;
      else if (result === "failed") summary.failed += 1;
    }

    console.info("[autopilot-watch]", summary);
    return summary;
  } finally {
    await releaseAutopilotCronLock(params.admin, "autopilot-watch", lockOwner);
  }
}
