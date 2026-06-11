import type { SupabaseClient } from "@supabase/supabase-js";

import { dedupeChangeLines, formatDigestChangeLine } from "@/lib/digest/format-digest-change";
import {
  activePlatformsFromAlerts,
  buildActionItems,
  buildActivityBarFromAlerts,
  buildCompetitorEmailSlices,
  buildHeadlineStats,
  buildHookTakeaway,
  buildPlatformPresence,
} from "@/lib/digest/digest-email-content";
import type { WeeklyDigestPayload } from "@/lib/digest/weekly-digest-types";
import { buildWeeklyDigestUnsubscribeUrl } from "@/lib/digest/unsubscribe-token";
import { buildCompetitorDashboardPath } from "@/lib/competitor-dashboard-url";
import { normalizeCompetitorSlug } from "@/lib/sidebar-competitors";
import type { Database } from "@/lib/supabase/types";

const MAX_CHANGES_PER_COMPETITOR = 6;
const DIGEST_WINDOW_DAYS = 7;

export function digestWindowBounds(now = new Date()): { start: Date; end: Date; startIso: string; endIso: string } {
  const end = now;
  const start = new Date(end.getTime() - DIGEST_WINDOW_DAYS * 86_400_000);
  return {
    start,
    end,
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

export function formatDigestDateRangeLabel(start: Date, end: Date): string {
  const fmt = (d: Date, withYear: boolean) =>
    d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      ...(withYear ? { year: "numeric" } : {}),
    });
  const sameYear = start.getUTCFullYear() === end.getUTCFullYear();
  return `${fmt(start, !sameYear)} – ${fmt(end, true)}`;
}

function competitorDisplayName(row: {
  brand_name: string | null;
  name: string | null;
}): string {
  return row.brand_name?.trim() || row.name?.trim() || "Competitor";
}

function competitorHost(row: {
  brand_domain: string | null;
  slug: string;
}): string {
  const domain = row.brand_domain?.trim();
  if (domain) return normalizeCompetitorSlug(domain.replace(/^https?:\/\//i, "").split("/")[0] ?? domain);
  return normalizeCompetitorSlug(row.slug);
}

type AlertInput = {
  alert_type: string;
  title: string;
  body: string | null;
  metadata: Record<string, unknown> | null;
};

function alertRowFromDb(row: {
  alert_type: string;
  title: string;
  body: string | null;
  metadata: unknown;
}): AlertInput {
  return {
    alert_type: row.alert_type,
    title: row.title,
    body: row.body,
    metadata:
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : null,
  };
}

/**
 * Build a weekly digest payload from existing `competitor_alerts` (same source as Alerts feed).
 * Returns null when the user has no tracked competitors or no notable changes in the window.
 */
export async function buildDigestForUser(
  admin: SupabaseClient<Database>,
  userId: string,
  options?: { appOrigin?: string; now?: Date }
): Promise<WeeklyDigestPayload | null> {
  const uid = userId.trim();
  if (!uid) return null;

  const appOrigin = options?.appOrigin?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://spy-rival.com";
  const { start, end, startIso, endIso } = digestWindowBounds(options?.now);

  const { data: profile, error: profileErr } = await admin
    .from("profiles")
    .select("full_name, weekly_digest_opted_out")
    .eq("id", uid)
    .maybeSingle();

  if (profileErr) throw new Error(profileErr.message);
  if (profile?.weekly_digest_opted_out === true) return null;

  const { data: authUser } = await admin.auth.admin.getUserById(uid);
  const userEmail = authUser.user?.email?.trim();
  if (!userEmail) return null;

  const userName = profile?.full_name?.trim() || userEmail.split("@")[0] || "there";

  const { data: competitors, error: compErr } = await admin
    .from("saved_competitors")
    .select("id, name, brand_name, brand_domain, slug, is_workspace_brand")
    .eq("user_id", uid);

  if (compErr) throw new Error(compErr.message);
  const tracked = (competitors ?? []).filter((c) => !c.is_workspace_brand);
  if (tracked.length === 0) return null;

  const competitorIds = tracked.map((c) => c.id);

  const { data: alerts, error: alertsErr } = await admin
    .from("competitor_alerts")
    .select("id, competitor_id, alert_type, severity, title, body, metadata, detected_at")
    .eq("user_id", uid)
    .in("competitor_id", competitorIds)
    .gte("detected_at", startIso)
    .lte("detected_at", endIso)
    .in("severity", ["notable", "high", "info"])
    .order("detected_at", { ascending: false });

  if (alertsErr) throw new Error(alertsErr.message);
  if (!alerts?.length) return null;

  const [{ data: scoreRows }, { data: adPlatformRows }] = await Promise.all([
    admin
      .from("competitor_activity_scores")
      .select("competitor_id, score")
      .eq("user_id", uid)
      .in("competitor_id", competitorIds),
    admin
      .from("scraped_ads")
      .select("competitor_id, platform")
      .eq("user_id", uid)
      .in("competitor_id", competitorIds)
      .eq("is_active", true),
  ]);

  const scoreByCompetitor = new Map<string, number>();
  for (const row of scoreRows ?? []) {
    if (typeof row.score === "number") scoreByCompetitor.set(row.competitor_id, row.score);
  }

  const platformsByCompetitor = new Map<string, Set<string>>();
  for (const row of adPlatformRows ?? []) {
    if (!platformsByCompetitor.has(row.competitor_id)) {
      platformsByCompetitor.set(row.competitor_id, new Set());
    }
    platformsByCompetitor.get(row.competitor_id)!.add(row.platform);
  }

  const byCompetitor = new Map<string, typeof alerts>();
  for (const alert of alerts) {
    if (!byCompetitor.has(alert.competitor_id)) byCompetitor.set(alert.competitor_id, []);
    byCompetitor.get(alert.competitor_id)!.push(alert);
  }

  const compById = new Map(tracked.map((c) => [c.id, c]));
  const draftCompetitors: Array<{
    competitorId: string;
    name: string;
    changes: string[];
    url: string;
    alerts: AlertInput[];
  }> = [];

  for (const [competitorId, rows] of byCompetitor) {
    const comp = compById.get(competitorId);
    if (!comp) continue;

    const alerts = rows.map(alertRowFromDb);
    const changes = dedupeChangeLines(alerts.map((row) => formatDigestChangeLine(row))).slice(
      0,
      MAX_CHANGES_PER_COMPETITOR
    );

    if (changes.length === 0) continue;

    const host = competitorHost(comp);
    draftCompetitors.push({
      competitorId,
      name: competitorDisplayName(comp),
      changes,
      url: `${appOrigin.replace(/\/$/, "")}${buildCompetitorDashboardPath(host)}?tab=insights&sub=alerts`,
      alerts,
    });
  }

  if (draftCompetitors.length === 0) return null;

  draftCompetitors.sort((a, b) => a.name.localeCompare(b.name));

  const allAlertsFlat = draftCompetitors.flatMap((d) => d.alerts);
  const headlineStats = buildHeadlineStats(draftCompetitors.length, allAlertsFlat);
  const summaryTakeaway = buildHookTakeaway(
    draftCompetitors.map((d) => ({ name: d.name, alerts: d.alerts }))
  );

  const emailSlices = buildCompetitorEmailSlices(draftCompetitors);
  const digestCompetitors = emailSlices.map((s, i) => {
    const draft = draftCompetitors[i]!;
    const alertPlatforms = activePlatformsFromAlerts(draft.alerts);
    const dbPlatforms = platformsByCompetitor.get(draft.competitorId) ?? new Set<string>();
    const merged = new Set([...dbPlatforms, ...alertPlatforms]);
    const fallbackScore = scoreByCompetitor.get(draft.competitorId) ?? 0;

    return {
      competitorId: draft.competitorId,
      name: s.name,
      changes: s.changes,
      url: s.url,
      heroStat: { value: s.heroStat.value, label: s.heroStat.label },
      platforms: buildPlatformPresence(merged),
      activityBar: buildActivityBarFromAlerts(draft.alerts, fallbackScore),
    };
  });

  const actionItems = buildActionItems(emailSlices);

  return {
    userId: uid,
    userEmail,
    userName,
    dateRange: {
      start: startIso,
      end: endIso,
      label: formatDigestDateRangeLabel(start, end),
    },
    headlineStats,
    summaryTakeaway,
    competitors: digestCompetitors,
    actionItems,
    unsubscribeUrl: buildWeeklyDigestUnsubscribeUrl(appOrigin, uid),
  };
}
