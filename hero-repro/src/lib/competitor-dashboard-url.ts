import { normalizeCompetitorSlug } from "@/lib/sidebar-competitors";

/**
 * Decode a dynamic route segment into a normalized hostname (ASCII via URL parser).
 */
export function decodeCompetitorDomainSegment(encoded: string): string {
  const raw = encoded.trim();
  if (!raw) return "";
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    decoded = raw;
  }
  const withoutProto = decoded.replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("/")[0] ?? decoded;
  try {
    const hostname = new URL(`http://${withoutProto}`).hostname;
    return normalizeCompetitorSlug(hostname);
  } catch {
    return normalizeCompetitorSlug(withoutProto);
  }
}

export function buildCompetitorDashboardPath(canonicalHost: string): string {
  const h = normalizeCompetitorSlug(canonicalHost);
  return `/dashboard/competitor/${encodeURIComponent(h)}`;
}

/** Path prefix for dashboard competitor routes (no trailing slash). */
export const DASHBOARD_COMPETITOR_ROUTE_PREFIX = "/dashboard/competitor";

/**
 * Extract normalized host from pathname `/dashboard/competitor/<segment>` or legacy `/dashboard/competitor`.
 */
export function competitorHostFromDashboardPathname(pathname: string | null): string {
  if (!pathname?.startsWith(`${DASHBOARD_COMPETITOR_ROUTE_PREFIX}/`)) return "";
  const rest = pathname.slice(DASHBOARD_COMPETITOR_ROUTE_PREFIX.length + 1);
  const segment = rest.split("/")[0] ?? "";
  if (!segment) return "";
  return decodeCompetitorDomainSegment(segment);
}
