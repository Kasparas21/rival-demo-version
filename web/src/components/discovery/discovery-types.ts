import type {
  DiscoveryDatePreset,
  DiscoveryFormatFilter,
  DiscoveryLandingPageChangeFilter,
  DiscoveryLandingPageSort,
  DiscoverySort,
  DiscoveryStatusFilter,
  DiscoveryDateFilterMode,
} from "@/lib/discovery/types";

export type DiscoveryToolbarState = {
  search: string;
  sort: DiscoverySort;
  datePreset: DiscoveryDatePreset;
  dateFilterMode: DiscoveryDateFilterMode;
  format: DiscoveryFormatFilter;
  status: DiscoveryStatusFilter;
  ultimateOnly: boolean;
  selectedPlatforms: Set<string>;
  /** Empty = all tracked competitors in scope. */
  selectedCompetitorIds: Set<string>;
  /** Checked client workspaces to include. Empty = active workspace only. */
  selectedClientBrandIds: Set<string>;
  /** Landing pages tab: filter by change confidence. */
  changeFilter: DiscoveryLandingPageChangeFilter;
  /** Landing pages tab: sort order for detected changes. */
  landingPageSort: DiscoveryLandingPageSort;
  /** Stats tab: custom range start (YYYY-MM-DD). Overrides preset when set. */
  statsDateFrom: string | null;
  /** Stats tab: custom range end (YYYY-MM-DD). */
  statsDateTo: string | null;
};

export const DEFAULT_DISCOVERY_TOOLBAR: DiscoveryToolbarState = {
  search: "",
  sort: "shuffle",
  datePreset: "all",
  dateFilterMode: "live",
  format: "all",
  status: "all",
  ultimateOnly: false,
  selectedPlatforms: new Set(),
  selectedCompetitorIds: new Set(),
  selectedClientBrandIds: new Set(),
  changeFilter: "all",
  landingPageSort: "newest",
  statsDateFrom: null,
  statsDateTo: null,
};

export function resolveDiscoveryClientBrandIds(
  selected: Set<string>,
  activeBrandId: string,
  allBrands: { id: string }[],
): string[] {
  const validIds = new Set(allBrands.map((b) => b.id));
  const picked = [...selected].filter((id) => validIds.has(id));
  if (picked.length > 0) return picked;
  if (activeBrandId && validIds.has(activeBrandId)) return [activeBrandId];
  return [...validIds].slice(0, 1);
}

export function discoveryClientSelectionLabel(
  selected: Set<string>,
  activeBrand: { id: string; name: string },
  allBrands: { id: string; name: string }[],
): string {
  const ids = resolveDiscoveryClientBrandIds(selected, activeBrand.id, allBrands);
  if (allBrands.length > 0 && ids.length === allBrands.length) return "All clients";
  if (ids.length === 1) {
    return allBrands.find((b) => b.id === ids[0])?.name ?? activeBrand.name;
  }
  return `${ids.length} clients`;
}

export function isDiscoveryDefaultClientSelection(
  selected: Set<string>,
  activeBrandId: string,
  allBrands: { id: string }[],
): boolean {
  const ids = resolveDiscoveryClientBrandIds(selected, activeBrandId, allBrands);
  return ids.length === 1 && ids[0] === activeBrandId;
}

export function toggleDiscoveryClientBrand(
  selected: Set<string>,
  activeBrandId: string,
  allBrands: { id: string }[],
  brandId: string,
  checked: boolean,
): Set<string> {
  const next = new Set(resolveDiscoveryClientBrandIds(selected, activeBrandId, allBrands));
  if (checked) {
    next.add(brandId);
  } else {
    next.delete(brandId);
    if (next.size === 0 && activeBrandId) next.add(activeBrandId);
  }
  return next;
}

export function setDiscoveryAllClientBrands(
  allBrands: { id: string }[],
  checked: boolean,
  activeBrandId: string,
): Set<string> {
  if (checked) return new Set(allBrands.map((b) => b.id));
  return activeBrandId ? new Set([activeBrandId]) : new Set();
}

/** Resolved competitor filter ids, or null when all competitors in scope should show. */
export function resolveDiscoveryCompetitorIds(
  selected: Set<string>,
  competitors: { id: string }[],
): string[] | null {
  const validIds = new Set(competitors.map((c) => c.id));
  const picked = [...selected].filter((id) => validIds.has(id));
  if (picked.length === 0 || picked.length === competitors.length) return null;
  return picked;
}

export function discoveryCompetitorSelectionLabel(
  selected: Set<string>,
  competitors: { id: string; name: string }[],
): string {
  const ids = resolveDiscoveryCompetitorIds(selected, competitors);
  if (!ids) return "All brands";
  if (ids.length === 1) {
    return competitors.find((c) => c.id === ids[0])?.name ?? "1 brand";
  }
  return `${ids.length} brands`;
}

export function isDiscoveryDefaultCompetitorSelection(
  selected: Set<string>,
  competitors: { id: string }[],
): boolean {
  return resolveDiscoveryCompetitorIds(selected, competitors) === null;
}

function effectiveDiscoveryCompetitorSelection(
  selected: Set<string>,
  competitors: { id: string }[],
): Set<string> {
  const allIds = competitors.map((c) => c.id);
  if (selected.size === 0) return new Set(allIds);
  return new Set([...selected].filter((id) => allIds.includes(id)));
}

export function toggleDiscoveryCompetitor(
  selected: Set<string>,
  competitors: { id: string }[],
  competitorId: string,
  checked: boolean,
): Set<string> {
  const allIds = competitors.map((c) => c.id);
  const effective = effectiveDiscoveryCompetitorSelection(selected, competitors);

  if (checked) {
    effective.add(competitorId);
    if (effective.size >= allIds.length) return new Set();
    return effective;
  }

  effective.delete(competitorId);
  if (effective.size === 0) {
    return allIds.length === 1 ? new Set(allIds) : new Set(allIds.filter((id) => id !== competitorId));
  }
  if (effective.size >= allIds.length) return new Set();
  return effective;
}

export function setDiscoveryAllCompetitors(
  competitors: { id: string }[],
  checked: boolean,
): Set<string> {
  if (checked) return new Set();
  return competitors.length > 0 ? new Set([competitors[0]!.id]) : new Set();
}

export type DiscoveryFeedTab =
  | "explore"
  | "trending"
  | "ultimate"
  | "whats_new"
  | "patterns"
  | "landing_pages"
  | "stats";

export const DISCOVERY_LANDING_PAGES_WINDOWS: {
  id: Extract<DiscoveryDatePreset, "today" | "3d" | "4d" | "7d" | "30d" | "90d" | "all">;
  label: string;
  description: string;
}[] = [
  { id: "today", label: "Today", description: "Detected since midnight" },
  { id: "3d", label: "Last 3 days", description: "Detected in the past 72 hours" },
  { id: "4d", label: "Last 4 days", description: "Detected in the past 4 days" },
  { id: "7d", label: "This week", description: "Detected in the past 7 days" },
  { id: "30d", label: "Last 30 days", description: "Detected in the past 30 days" },
  { id: "90d", label: "Last 90 days", description: "Detected in the past 90 days" },
  { id: "all", label: "All time", description: "Every tracked change" },
];

export const DISCOVERY_WHATS_NEW_WINDOWS: {
  id: Extract<DiscoveryDatePreset, "today" | "3d" | "4d" | "7d">;
  label: string;
  description: string;
}[] = [
  { id: "today", label: "Today", description: "Launched since midnight" },
  { id: "3d", label: "Last 3 days", description: "Launched in the past 72 hours" },
  { id: "4d", label: "Last 4 days", description: "Launched in the past 4 days" },
  { id: "7d", label: "This week", description: "Launched in the past 7 days" },
];

export function toolbarForTab(tab: DiscoveryFeedTab): Partial<DiscoveryToolbarState> {
  switch (tab) {
    case "trending":
      return { sort: "newest", ultimateOnly: false, dateFilterMode: "live", datePreset: "all" };
    case "ultimate":
      return { sort: "ultimate_winner", ultimateOnly: false, dateFilterMode: "live", datePreset: "all" };
    case "whats_new":
      return { sort: "newest", ultimateOnly: false, dateFilterMode: "launched", datePreset: "7d" };
    case "landing_pages":
      return {
        datePreset: "7d",
        dateFilterMode: "live",
        changeFilter: "all",
        landingPageSort: "newest",
      };
    case "stats":
      return {
        datePreset: "7d",
        dateFilterMode: "live",
        statsDateFrom: null,
        statsDateTo: null,
      };
    case "patterns":
      return {};
    case "explore":
    default:
      return { sort: "shuffle", ultimateOnly: false, dateFilterMode: "live", datePreset: "all" };
  }
}
