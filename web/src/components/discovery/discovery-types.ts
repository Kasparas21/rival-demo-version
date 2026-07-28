import type {
  DiscoveryDatePreset,
  DiscoveryFormatFilter,
  DiscoverySort,
  DiscoveryStatusFilter,
} from "@/lib/discovery/types";

export type DiscoveryToolbarState = {
  search: string;
  sort: DiscoverySort;
  datePreset: DiscoveryDatePreset;
  format: DiscoveryFormatFilter;
  status: DiscoveryStatusFilter;
  ultimateOnly: boolean;
  selectedPlatforms: Set<string>;
  competitorId: string | null;
  /** Checked client workspaces to include. Empty = active workspace only. */
  selectedClientBrandIds: Set<string>;
};

export const DEFAULT_DISCOVERY_TOOLBAR: DiscoveryToolbarState = {
  search: "",
  sort: "shuffle",
  datePreset: "all",
  format: "all",
  status: "all",
  ultimateOnly: false,
  selectedPlatforms: new Set(),
  competitorId: null,
  selectedClientBrandIds: new Set(),
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

export type DiscoveryFeedTab = "explore" | "trending" | "ultimate";

export function toolbarForTab(tab: DiscoveryFeedTab): Partial<DiscoveryToolbarState> {
  switch (tab) {
    case "trending":
      return { sort: "newest", ultimateOnly: false };
    case "ultimate":
      return { sort: "ultimate_winner", ultimateOnly: true };
    case "explore":
    default:
      return { sort: "shuffle", ultimateOnly: false };
  }
}
