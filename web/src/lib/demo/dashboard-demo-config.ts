import { decodeCompetitorDomainSegment } from "@/lib/competitor-dashboard-url";
import { FROZEN_DEMO_BRAND_LOGOS } from "@/lib/demo/frozen/frozen-demo-brand-logos";
import type { SidebarCompetitor } from "@/lib/sidebar-competitors";

export const DEMO_OWN_BRAND = {
  name: "Nike",
  domain: "your-brand.com",
  initial: "N",
  logoUrl: FROZEN_DEMO_BRAND_LOGOS["nike.com"].logoUrl,
  color: "#0ea5e9",
  lastScraped: "1h ago",
} as const;

export const DEMO_COMPETITOR = {
  name: "Adidas",
  domain: "competitor-a.com",
  initial: "A",
  logoUrl: FROZEN_DEMO_BRAND_LOGOS["adidas.com"].logoUrl,
  lastScraped: "2h ago",
  lastSpyRun: "Tue Jun 9 (UTC)",
} as const;

export const DASHBOARD_DEMO_ROUTE_PREFIX = "/dashboard/demo";
export const DASHBOARD_DEMO_COMPETITOR_PREFIX = "/dashboard/demo/competitor";

export const DASHBOARD_DEMO_DEFAULT_PATH = buildDashboardDemoCompetitorPath(DEMO_COMPETITOR.domain);

export function isDashboardDemoPath(pathname: string | null | undefined): boolean {
  return pathname?.startsWith(DASHBOARD_DEMO_ROUTE_PREFIX) ?? false;
}

export function isDashboardDemoDomain(domain: string): boolean {
  const d = domain.trim().toLowerCase();
  return d === DEMO_OWN_BRAND.domain || d === DEMO_COMPETITOR.domain;
}

export function isDemoOwnBrandDomain(domain: string): boolean {
  return domain.trim().toLowerCase() === DEMO_OWN_BRAND.domain;
}

export function buildDashboardDemoCompetitorPath(domain: string): string {
  const d = domain.trim().toLowerCase();
  return `${DASHBOARD_DEMO_COMPETITOR_PREFIX}/${encodeURIComponent(d)}`;
}

export function demoHostFromDashboardPathname(pathname: string | null): string {
  if (!pathname?.startsWith(`${DASHBOARD_DEMO_COMPETITOR_PREFIX}/`)) return "";
  const rest = pathname.slice(DASHBOARD_DEMO_COMPETITOR_PREFIX.length + 1);
  const segment = rest.split("/")[0] ?? "";
  if (!segment) return "";
  return decodeCompetitorDomainSegment(segment);
}

export function getDemoSidebarCompetitors(): SidebarCompetitor[] {
  return [
    {
      slug: DEMO_COMPETITOR.domain,
      name: DEMO_COMPETITOR.name,
      logoUrl: DEMO_COMPETITOR.logoUrl,
      brand: {
        name: DEMO_COMPETITOR.name,
        domain: DEMO_COMPETITOR.domain,
        logoUrl: DEMO_COMPETITOR.logoUrl,
      },
    },
  ];
}

export function demoBrandForDomain(domain: string): {
  name: string;
  domain: string;
  initial: string;
  logoUrl: string;
  isOwnWorkspace: boolean;
  lastScraped: string;
  lastSpyRun?: string;
} {
  if (isDemoOwnBrandDomain(domain)) {
    return {
      name: DEMO_OWN_BRAND.name,
      domain: DEMO_OWN_BRAND.domain,
      initial: DEMO_OWN_BRAND.initial,
      logoUrl: DEMO_OWN_BRAND.logoUrl,
      isOwnWorkspace: true,
      lastScraped: DEMO_OWN_BRAND.lastScraped,
    };
  }
  return {
    name: DEMO_COMPETITOR.name,
    domain: DEMO_COMPETITOR.domain,
    initial: DEMO_COMPETITOR.initial,
    logoUrl: DEMO_COMPETITOR.logoUrl,
    isOwnWorkspace: false,
    lastScraped: DEMO_COMPETITOR.lastScraped,
    lastSpyRun: DEMO_COMPETITOR.lastSpyRun,
  };
}
