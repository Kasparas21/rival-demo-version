import type { AlertType } from "@/lib/alerts/alert-types";
import { isAlertType } from "@/lib/alerts/alert-types";
import { buildCompetitorDashboardPath } from "@/lib/competitor-dashboard-url";

export type AutopilotUtmMedium = "email" | "slack" | "discord";

/** Alert type → competitor dashboard tab/sub (tunable). */
export const WATCH_ALERT_DESTINATION: Partial<Record<AlertType, { tab: string; sub?: string }>> = {
  new_platform: { tab: "tests", sub: "timeline" },
  platform_exit: { tab: "tests", sub: "timeline" },
  proven_winner: { tab: "audience-copy", sub: "copy-vault" },
  creative_push: { tab: "audience-copy", sub: "copy-vault" },
  activity_spike: { tab: "insights", sub: "activity-feed" },
  competitor_email: { tab: "email-marketing" },
};

export function buildAutopilotCompetitorUrl(params: {
  appOrigin: string;
  competitorHost: string;
  medium: AutopilotUtmMedium;
  campaign: string;
  tab?: string;
  sub?: string;
}): string {
  const base = params.appOrigin.replace(/\/$/, "");
  const path = buildCompetitorDashboardPath(params.competitorHost);
  const url = new URL(`${base}${path}`);
  if (params.tab) url.searchParams.set("tab", params.tab);
  if (params.sub) url.searchParams.set("sub", params.sub);
  url.searchParams.set("utm_source", "autopilot");
  url.searchParams.set("utm_medium", params.medium);
  url.searchParams.set("utm_campaign", params.campaign);
  return url.toString();
}

export function buildWatchAlertInvestigateUrl(
  appOrigin: string,
  competitorHost: string,
  medium: AutopilotUtmMedium,
  alertType?: string,
): string {
  const dest =
    alertType && isAlertType(alertType) ? WATCH_ALERT_DESTINATION[alertType] : undefined;
  return buildAutopilotCompetitorUrl({
    appOrigin,
    competitorHost,
    medium,
    campaign: "watch_alert",
    tab: dest?.tab ?? "insights",
    sub: dest?.sub ?? "alerts",
  });
}

export function buildReportPublicUrl(appOrigin: string, reportId: string, medium: AutopilotUtmMedium): string {
  const base = appOrigin.replace(/\/$/, "");
  const url = new URL(`${base}/reports/${reportId}`);
  url.searchParams.set("utm_source", "autopilot");
  url.searchParams.set("utm_medium", medium);
  url.searchParams.set("utm_campaign", "monthly_report");
  return url.toString();
}

export function buildAutopilotSettingsUrl(appOrigin: string): string {
  return `${appOrigin.replace(/\/$/, "")}/dashboard/settings/autopilot`;
}
