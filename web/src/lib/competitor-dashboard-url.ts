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

export function buildCompetitorDashboardPath(
  canonicalHost: string,
  basePath: "/dashboard" | "/preview" = "/dashboard",
): string {
  const h = normalizeCompetitorSlug(canonicalHost);
  return `${basePath}/competitor/${encodeURIComponent(h)}`;
}

/** Path prefix for dashboard competitor routes (no trailing slash). */
export const DASHBOARD_COMPETITOR_ROUTE_PREFIX = "/dashboard/competitor";
export const PREVIEW_COMPETITOR_ROUTE_PREFIX = "/preview/competitor";

export function competitorRoutePrefix(basePath: "/dashboard" | "/preview"): string {
  return basePath === "/preview" ? PREVIEW_COMPETITOR_ROUTE_PREFIX : DASHBOARD_COMPETITOR_ROUTE_PREFIX;
}

/**
 * Extract normalized host from pathname `/…/competitor/<segment>`.
 */
export function competitorHostFromShellPathname(
  pathname: string | null,
  basePath: "/dashboard" | "/preview" = "/dashboard",
): string {
  const prefix = competitorRoutePrefix(basePath);
  if (!pathname?.startsWith(`${prefix}/`)) return "";
  const rest = pathname.slice(prefix.length + 1);
  const segment = rest.split("/")[0] ?? "";
  if (!segment) return "";
  return decodeCompetitorDomainSegment(segment);
}

/** @deprecated Use competitorHostFromShellPathname */
export function competitorHostFromDashboardPathname(pathname: string | null): string {
  return competitorHostFromShellPathname(pathname, "/dashboard");
}
