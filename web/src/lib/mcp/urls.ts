import { buildCompetitorDashboardPath } from "@/lib/competitor-dashboard-url";
import { normalizeCompetitorSlug } from "@/lib/sidebar-competitors";

export function mcpDashboardUrl(appOrigin: string, domainOrSlug: string | null, query?: string): string {
  const base = appOrigin.replace(/\/$/, "");
  const host = domainOrSlug ? normalizeCompetitorSlug(domainOrSlug) : "";
  if (!host) return `${base}/dashboard`;
  const path = buildCompetitorDashboardPath(host);
  return query ? `${base}${path}?${query}` : `${base}${path}`;
}

export function mcpSettingsUrl(appOrigin: string): string {
  return `${appOrigin.replace(/\/$/, "")}/dashboard/settings`;
}

export function mcpDocsUrl(appOrigin: string): string {
  return `${appOrigin.replace(/\/$/, "")}/docs/mcp`;
}
