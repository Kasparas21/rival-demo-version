import { randomUUID } from "crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import { isAlertType } from "@/lib/alerts/alert-types";
import { normalizeCompetitorSlug } from "@/lib/sidebar-competitors";
import { getCachedStrategyOverview } from "@/lib/strategy-overview/recompute-strategy-overview";
import type { Database } from "@/lib/supabase/types";

import { ensureAutopilotSettings } from "./settings-db";
import type { WatchAlertBlock, WatchAlertCandidate } from "./types";
import { generateWatchRecommendation } from "./watch-recommendation";
import { passesWatchFilter } from "./watch-sensitivity";
import { buildAutopilotSettingsUrl, buildWatchAlertInvestigateUrl } from "./watch-deep-links";
import { sendWatchSlackWebhook } from "./watch-slack";
import {
  loadBrandWatchTargets,
  resolveWatchScope,
} from "./active-watched-competitors";

const LOOKBACK_DAYS = 7;
const MAX_BLOCKS = 5;

function competitorHost(row: { brand_domain: string | null; slug: string }): string {
  const domain = row.brand_domain?.trim();
  if (domain) {
    return normalizeCompetitorSlug(domain.replace(/^https?:\/\//i, "").split("/")[0] ?? domain);
  }
  return normalizeCompetitorSlug(row.slug);
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
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

export type DevAutopilotWatchSlackResult = {
  ok: boolean;
  sent: boolean;
  blockCount: number;
  alertIds: string[];
  usedRelaxSensitivity: boolean;
  error?: string;
  preview?: Array<{ competitor: string; headline: string; context: string; recommendation: string }>;
};

/**
 * Dev-only: build real LLM watch recommendations from recent alerts and post to Slack.
 * Does not mark alerts processed — safe to spam for QA.
 */
export async function runDevAutopilotWatchSlack(params: {
  admin: SupabaseClient<Database>;
  userId: string;
  relaxSensitivity?: boolean;
  appOrigin?: string;
}): Promise<DevAutopilotWatchSlackResult> {
  const appOrigin =
    params.appOrigin?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://spy-rival.com";

  const row = await ensureAutopilotSettings(params.admin, params.userId);

  if (!row.watch_channels.slack) {
    return { ok: false, sent: false, blockCount: 0, alertIds: [], usedRelaxSensitivity: false, error: "Enable Slack in channels first" };
  }

  const webhook = row.slack_webhook_url?.trim();
  if (!webhook) {
    return { ok: false, sent: false, blockCount: 0, alertIds: [], usedRelaxSensitivity: false, error: "Connect Slack first" };
  }

  const lookbackIso = new Date(Date.now() - LOOKBACK_DAYS * 86_400_000).toISOString();
  const { data: alerts, error: alertsErr } = await params.admin
    .from("competitor_alerts")
    .select("id, user_id, competitor_id, alert_type, severity, title, body, metadata, detected_at")
    .eq("user_id", params.userId)
    .gte("detected_at", lookbackIso)
    .order("detected_at", { ascending: false })
    .limit(40);

  if (alertsErr) {
    return { ok: false, sent: false, blockCount: 0, alertIds: [], usedRelaxSensitivity: false, error: alertsErr.message };
  }

  if (!alerts?.length) {
    return {
      ok: true,
      sent: false,
      blockCount: 0,
      alertIds: [],
      usedRelaxSensitivity: false,
      error: "No alerts in the last 7 days — wait for competitor activity or lower your threshold",
    };
  }

  const competitorIds = [...new Set(alerts.map((a) => a.competitor_id))];
  const { data: comps } = await params.admin
    .from("saved_competitors")
    .select("id, name, brand_name, brand_domain, slug, is_workspace_brand")
    .in("id", competitorIds);

  const compById = new Map((comps ?? []).map((c) => [c.id, c]));

  const targets = await loadBrandWatchTargets(params.admin, params.userId);
  const scope = resolveWatchScope(targets, row);
  const allowedIds = scope.allowedCompetitorIds;
  const multiBrand = scope.enabledBrands.length > 1;

  let filtered = alerts.filter((a) => {
    const comp = compById.get(a.competitor_id);
    if (!comp || comp.is_workspace_brand) return false;
    if (!allowedIds.has(a.competitor_id)) return false;
    return passesWatchFilter(a.alert_type, a.severity, row);
  });

  let usedRelaxSensitivity = false;
  if (filtered.length === 0 && params.relaxSensitivity) {
    filtered = alerts.filter((a) => {
      const comp = compById.get(a.competitor_id);
      if (!comp || comp.is_workspace_brand) return false;
      return allowedIds.has(a.competitor_id);
    });
    usedRelaxSensitivity = filtered.length > 0;
  }

  if (filtered.length === 0) {
    return {
      ok: true,
      sent: false,
      blockCount: 0,
      alertIds: [],
      usedRelaxSensitivity: false,
      error: "No alerts pass your current threshold — try again with relax sensitivity",
    };
  }

  const topAlerts = filtered.slice(0, MAX_BLOCKS);
  const overflowCount = Math.max(0, filtered.length - MAX_BLOCKS);

  const candidates: WatchAlertCandidate[] = topAlerts.map((a) => {
    const comp = compById.get(a.competitor_id)!;
    return {
      id: a.id,
      competitor_id: a.competitor_id,
      alert_type: isAlertType(a.alert_type) ? a.alert_type : "new_angle",
      severity: a.severity as WatchAlertCandidate["severity"],
      title: a.title,
      body: a.body,
      metadata: a.metadata,
      detected_at: a.detected_at,
      competitorName: comp.brand_name?.trim() || comp.name?.trim() || "Competitor",
      competitorHost: competitorHost(comp),
      user_id: a.user_id,
    };
  });

  const blocks: WatchAlertBlock[] = await mapLimit(candidates, 5, async (c) => {
    const strategyPayload = await getCachedStrategyOverview(
      params.admin,
      params.userId,
      c.competitor_id,
      c.competitorHost,
    );
    const owningBrand = scope.brandByCompetitorId.get(c.competitor_id) ?? null;
    const rec = await generateWatchRecommendation({
      alertType: c.alert_type,
      competitorName: c.competitorName,
      alertTitle: c.title,
      alertBody: c.body,
      alertMetadata: c.metadata,
      strategyPayload,
      userBrand: owningBrand
        ? {
            brandName: owningBrand.brandName,
            brandContext: owningBrand.brandContext,
            brandDomain: owningBrand.brandDomain,
          }
        : null,
    });
    return {
      ...c,
      ...rec,
      clientBrandName: multiBrand && owningBrand ? owningBrand.brandName : null,
      investigateUrl: buildWatchAlertInvestigateUrl(appOrigin, c.competitorHost, "slack", c.alert_type),
    };
  });

  const settingsUrl = buildAutopilotSettingsUrl(appOrigin);
  const slackResult = await sendWatchSlackWebhook({
    webhookUrl: webhook,
    blocks,
    overflowCount,
    settingsUrl,
  });

  if (!slackResult.ok) {
    return {
      ok: false,
      sent: false,
      blockCount: blocks.length,
      alertIds: topAlerts.map((a) => a.id),
      usedRelaxSensitivity,
      error: slackResult.error ?? "slack_failed",
      preview: blocks.map((b) => ({
        competitor: b.competitorName,
        headline: b.headline,
        context: b.context,
        recommendation: b.recommendation,
      })),
    };
  }

  await params.admin.from("autopilot_outputs").insert({
    user_id: params.userId,
    output_type: "watch_alert",
    dedupe_key: `dev_slack:${params.userId}:${randomUUID()}`,
    payload: {
      dev: true,
      blocks,
      overflowCount,
      alertIds: topAlerts.map((a) => a.id),
      usedRelaxSensitivity,
    },
    channels_sent: ["slack"],
    status: "sent",
    sent_at: new Date().toISOString(),
  });

  return {
    ok: true,
    sent: true,
    blockCount: blocks.length,
    alertIds: topAlerts.map((a) => a.id),
    usedRelaxSensitivity,
    preview: blocks.map((b) => ({
      competitor: b.competitorName,
      headline: b.headline,
      context: b.context,
      recommendation: b.recommendation,
    })),
  };
}
