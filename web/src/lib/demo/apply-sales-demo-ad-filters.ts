import {
  googleAdRowHasDashboardInlinePreview,
  linkedInAdHasDashboardInlinePreview,
  metaAdHasDashboardInlinePreview,
  pinterestAdHasDashboardInlinePreview,
  snapchatAdHasDashboardInlinePreview,
  tikTokAdHasDashboardInlinePreview,
} from "@/lib/ad-library/dashboard-inline-preview";
import {
  countActiveGoogleRowsWithLifecycle,
  countActiveLinkedInAds,
  countActiveMetaAds,
  countActivePinterestAds,
  countActiveSnapchatAds,
  countActiveTikTokAds,
} from "@/lib/ad-library/count-active-ads";
import type {
  GoogleAdRow,
  LinkedInAdCard,
  MetaAdCard,
  PinterestAdCard,
  SnapchatAdCard,
  TikTokAdCard,
} from "@/lib/ad-library/normalize";
import type { SalesDemoSettings } from "@/lib/demo/sales-demo-settings";

type RunStatusFn = (
  platform: string,
  libraryItemId: string,
  alternateIds?: string[],
) => { isRunning: boolean } | undefined;

function metaIsActive(ad: MetaAdCard, metaScrapeAtMs: number): boolean {
  return countActiveMetaAds([ad], metaScrapeAtMs) > 0;
}

function googleIsActive(row: GoogleAdRow, runStatus: RunStatusFn): boolean {
  return countActiveGoogleRowsWithLifecycle([row], runStatus) > 0;
}

function linkedInIsActive(ad: LinkedInAdCard): boolean {
  return countActiveLinkedInAds([ad]) > 0;
}

function tikTokIsActive(ad: TikTokAdCard): boolean {
  return countActiveTikTokAds([ad]) > 0;
}

function pinterestIsActive(ad: PinterestAdCard): boolean {
  return countActivePinterestAds([ad]) > 0;
}

function snapchatIsActive(ad: SnapchatAdCard): boolean {
  return countActiveSnapchatAds([ad]) > 0;
}

export function filterMetaAdsForDemo(
  ads: MetaAdCard[],
  settings: SalesDemoSettings,
  metaScrapeAtMs: number,
): MetaAdCard[] {
  let out = ads;
  if (settings.onlyWithPreviews) {
    out = out.filter(metaAdHasDashboardInlinePreview);
  }
  if (settings.activeAdsOnly) {
    out = out.filter((ad) => metaIsActive(ad, metaScrapeAtMs));
  }
  return out;
}

export function filterGoogleRowsForDemo(
  rows: GoogleAdRow[],
  settings: SalesDemoSettings,
  runStatus: RunStatusFn,
): GoogleAdRow[] {
  let out = rows;
  if (settings.onlyWithPreviews) {
    out = out.filter(googleAdRowHasDashboardInlinePreview);
  }
  if (settings.activeAdsOnly) {
    out = out.filter((row) => googleIsActive(row, runStatus));
  }
  return out;
}

export function filterLinkedInAdsForDemo(ads: LinkedInAdCard[], settings: SalesDemoSettings): LinkedInAdCard[] {
  let out = ads;
  if (settings.onlyWithPreviews) {
    out = out.filter(linkedInAdHasDashboardInlinePreview);
  }
  if (settings.activeAdsOnly) {
    out = out.filter(linkedInIsActive);
  }
  return out;
}

export function filterTikTokAdsForDemo(ads: TikTokAdCard[], settings: SalesDemoSettings): TikTokAdCard[] {
  let out = ads;
  if (settings.onlyWithPreviews) {
    out = out.filter(tikTokAdHasDashboardInlinePreview);
  }
  if (settings.activeAdsOnly) {
    out = out.filter(tikTokIsActive);
  }
  return out;
}

export function filterPinterestAdsForDemo(ads: PinterestAdCard[], settings: SalesDemoSettings): PinterestAdCard[] {
  let out = ads;
  if (settings.onlyWithPreviews) {
    out = out.filter(pinterestAdHasDashboardInlinePreview);
  }
  if (settings.activeAdsOnly) {
    out = out.filter(pinterestIsActive);
  }
  return out;
}

export function filterSnapchatAdsForDemo(ads: SnapchatAdCard[], settings: SalesDemoSettings): SnapchatAdCard[] {
  let out = ads;
  if (settings.onlyWithPreviews) {
    out = out.filter(snapchatAdHasDashboardInlinePreview);
  }
  if (settings.activeAdsOnly) {
    out = out.filter(snapchatIsActive);
  }
  return out;
}

export function demoAdPassesPreviewFilter(platform: string, ad: unknown): boolean {
  const p = platform.trim().toLowerCase();
  switch (p) {
    case "meta":
      return metaAdHasDashboardInlinePreview(ad as MetaAdCard);
    case "google":
    case "youtube":
      return googleAdRowHasDashboardInlinePreview(ad as GoogleAdRow);
    case "linkedin":
      return linkedInAdHasDashboardInlinePreview(ad as LinkedInAdCard);
    case "tiktok":
      return tikTokAdHasDashboardInlinePreview(ad as TikTokAdCard);
    case "pinterest":
      return pinterestAdHasDashboardInlinePreview(ad as PinterestAdCard);
    case "snapchat":
      return snapchatAdHasDashboardInlinePreview(ad as SnapchatAdCard);
    default:
      return true;
  }
}
