import type { AdsLibraryPlatform } from "@/lib/ad-library/ads-library-platform";
import type { PlatformAdsDatePreset, PlatformAdsSort } from "@/lib/ad-library/platform-ads-page";

export type PlatformAdsViewFields = {
  brandDetails: boolean;
  adCopy: boolean;
  headlineCta: boolean;
};

export type PlatformAdsStatusFilter = "all" | "active" | "retired";
export type PlatformAdsFormatFilter = "all" | "video" | "image";

export type PlatformAdsToolbarState = {
  datePreset: PlatformAdsDatePreset;
  customRangeStart: number | null;
  customRangeEnd: number | null;
  sort: PlatformAdsSort;
  groupDuplicates: boolean;
  statusFilter: PlatformAdsStatusFilter;
  formatFilter: PlatformAdsFormatFilter;
  ultimateOnly: boolean;
  impressionsOnly: boolean;
  viewFields: PlatformAdsViewFields;
};

export const DEFAULT_PLATFORM_ADS_VIEW_FIELDS: PlatformAdsViewFields = {
  brandDetails: true,
  adCopy: true,
  headlineCta: true,
};

export const DEFAULT_PLATFORM_ADS_TOOLBAR: PlatformAdsToolbarState = {
  datePreset: "all",
  customRangeStart: null,
  customRangeEnd: null,
  sort: "newest",
  groupDuplicates: false,
  statusFilter: "all",
  formatFilter: "all",
  ultimateOnly: false,
  impressionsOnly: false,
  viewFields: DEFAULT_PLATFORM_ADS_VIEW_FIELDS,
};

export type PlatformAdsFeedResponse = {
  ok: true;
  platform: AdsLibraryPlatform;
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
  ads: unknown[];
  dateRange: { earliest: string; latest: string } | null;
  metaScrapeAtMs: number | null;
};

export function platformAdsVisibilityClass(viewFields: PlatformAdsViewFields): string {
  return [
    !viewFields.brandDetails ? "[&_[data-pa-section=brand]]:hidden" : "",
    !viewFields.adCopy ? "[&_[data-pa-section=copy]]:hidden" : "",
    !viewFields.headlineCta ? "[&_[data-pa-section=cta]]:hidden" : "",
  ]
    .filter(Boolean)
    .join(" ");
}
