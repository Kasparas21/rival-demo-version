import { normalizeCompetitorSlug, type SidebarCompetitor } from "@/lib/sidebar-competitors";

import { isDebugPlatformClassificationEnabled } from "./platform-classification";

/** Demo owner account — Calai/Ikea marked in sidebar. */
export const DEMO_SIDEBAR_OWNER_EMAIL = "attributo@yahoo.com";

const DEMO_MARKED_SLUGS = new Set(["calai.app", "calai", "ikea.com", "ikea"]);

export function isDemoSidebarOwner(email: string | null | undefined): boolean {
  const normalized = email?.trim().toLowerCase();
  if (!normalized) return false;
  return normalized === DEMO_SIDEBAR_OWNER_EMAIL;
}

export function isDemoMarkedSidebarCompetitorSlug(slugOrHost: string): boolean {
  const slug = normalizeCompetitorSlug(slugOrHost);
  if (DEMO_MARKED_SLUGS.has(slug)) return true;
  if (slug.includes("calai")) return true;
  if (slug === "ikea" || slug.startsWith("ikea.")) return true;
  return false;
}

export function isDemoMarkedSidebarCompetitor(competitor: SidebarCompetitor): boolean {
  if (isDemoMarkedSidebarCompetitorSlug(competitor.slug)) return true;
  const host = competitor.brand?.domain?.trim().toLowerCase() ?? "";
  if (host && isDemoMarkedSidebarCompetitorSlug(host)) return true;
  const name = competitor.name?.trim().toLowerCase() ?? "";
  if (name.includes("calai") || name === "ikea") return true;
  return false;
}

/** Debug off → hide Calai/Ikea from sidebar entirely (demo owner only). */
export function shouldHideDemoMarkedSidebarCompetitor(
  email: string | null | undefined,
  competitor: SidebarCompetitor,
): boolean {
  if (!isDemoSidebarOwner(email)) return false;
  if (!isDemoMarkedSidebarCompetitor(competitor)) return false;
  return !isDebugPlatformClassificationEnabled();
}

/** @deprecated Use shouldHideDemoMarkedSidebarCompetitor */
export const shouldShowDemoHiddenCompetitorPlaceholder = shouldHideDemoMarkedSidebarCompetitor;

/** Debug on → full row with yellow dot (visible to you, marked as demo-only). */
export function shouldShowDemoMarkedCompetitorDot(
  email: string | null | undefined,
  competitor: SidebarCompetitor,
): boolean {
  if (!isDemoSidebarOwner(email)) return false;
  if (!isDemoMarkedSidebarCompetitor(competitor)) return false;
  return isDebugPlatformClassificationEnabled();
}

/** @deprecated Use shouldShowDemoHiddenCompetitorPlaceholder */
export function isDemoSidebarCompetitorHidingEnabled(email: string | null | undefined): boolean {
  return isDemoSidebarOwner(email) && !isDebugPlatformClassificationEnabled();
}

/** @deprecated Use isDemoMarkedSidebarCompetitor */
export const isDemoHiddenSidebarCompetitor = isDemoMarkedSidebarCompetitor;
export const isDemoHiddenSidebarCompetitorSlug = isDemoMarkedSidebarCompetitorSlug;
