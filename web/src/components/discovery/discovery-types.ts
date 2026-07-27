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
};

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
