import type { ChannelId } from "@/components/channel-picker-modal";
import type { PlatformIdentifier } from "@/components/manual-identifiers-form";

import type { AdLibraryRegionPrefs } from "@/lib/ad-library/ad-library-region-prefs";

const PREFIX = "rival-searching-flow:v1:";

export type SearchingStoredPhase = "discovering" | "manual-needed" | "scanning" | "found";

export type SearchingFlowSnapshot = {
  v: 1;
  phase: SearchingStoredPhase;
  discoveredIds: Partial<PlatformIdentifier>;
  discoveredBrand: { name: string; domain: string; logoUrl?: string } | null;
  manualIds: PlatformIdentifier;
  discoveryError: string | null;
  discoveryWarning: string | null;
  discoveryStep: string;
  discoveryInterpretation: {
    summary: string;
    primaryBrandName: string;
    primaryDomain: string | null;
    termBreakdown: { brands: number; urls: number; keywords: number };
  } | null;
  fieldConfidence: Partial<Record<ChannelId, "high" | "medium" | "low">>;
  fieldPreviewUrls: Partial<Record<ChannelId, string>>;
  /** Ad library region / market prefs from the confirm screen (session is also updated on submit). */
  adLibraryRegionPrefs?: Partial<AdLibraryRegionPrefs>;
};

export function searchingFlowStorageKey(q: string, termsParam: string, channelsParam: string): string {
  return `${PREFIX}${[q, termsParam, channelsParam].join("\u{1e}")}`;
}

export function readSearchingFlowSnapshot(key: string): SearchingFlowSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SearchingFlowSnapshot;
    if (parsed?.v !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeSearchingFlowSnapshot(key: string, snapshot: SearchingFlowSnapshot): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(snapshot));
  } catch {
    /* quota / private mode */
  }
}

export function clearSearchingFlowSnapshot(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
