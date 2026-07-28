import type { SavedDatePreset, SavedFeedSort, SavedFormatFilter, SavedItemType } from "@/lib/saved/types";

export type SavedToolbarState = {
  search: string;
  sort: SavedFeedSort;
  datePreset: SavedDatePreset;
  format: SavedFormatFilter;
  itemType: "all" | SavedItemType;
  selectedPlatforms: Set<string>;
  competitorId: string | null;
  folderId: string | null;
};

export const DEFAULT_SAVED_TOOLBAR: SavedToolbarState = {
  search: "",
  sort: "newest",
  datePreset: "all",
  format: "all",
  itemType: "all",
  selectedPlatforms: new Set(),
  competitorId: null,
  folderId: null,
};

export type SavedFeedTab = "all" | SavedItemType;

export function toolbarForSavedTab(tab: SavedFeedTab): Partial<SavedToolbarState> {
  if (tab === "all") return { itemType: "all" };
  return { itemType: tab };
}
