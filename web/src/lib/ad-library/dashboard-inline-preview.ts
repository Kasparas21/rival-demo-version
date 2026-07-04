import type {
  GoogleAdRow,
  LinkedInAdCard,
  MetaAdCard,
  MicrosoftAdCard,
  PinterestAdCard,
  SnapchatAdCard,
  TikTokAdCard,
} from "./normalize";
import {
  extractYouTubeVideoId,
  isUsableGoogleStillImagePreviewUrl,
  pickGoogleStillPreviewExternalUrl,
  youtubeThumbnailFromUrl,
} from "./normalize";
import { resolveGoogleStillPreviewDisplayCandidates } from "./google-creative-display-url";
import { resolveMetaLibraryCardPreview } from "./resolve-meta-library-card-preview";
import { repairMetaAdCardMedia } from "./repair-library-ad-media";
export const DASHBOARD_ADS_NO_INLINE_PREVIEW_MESSAGE =
  "The newest ads don’t have a dashboard image or video yet. Open View all for the full list.";

/** Matches Meta dashboard creative rules — needs a renderable still (including video poster). */
export function metaAdHasDashboardInlinePreview(ad: MetaAdCard): boolean {
  return Boolean(resolveMetaLibraryCardPreview(repairMetaAdCardMedia(ad)));
}

/** Meta inline slot — includes scraped archive URLs not yet on the card payload. */
export function metaAdQualifiesForDashboardInlinePreview(
  ad: MetaAdCard,
  opts?: { scrapedPreviewUrl?: string; archivedCreativeUrl?: string },
): boolean {
  if (opts?.archivedCreativeUrl?.trim()) return true;
  if (opts?.scrapedPreviewUrl?.trim()) return true;
  return metaAdHasDashboardInlinePreview(ad);
}

/**
 * Dashboard 3-card slots: running ads with previews first, then ended/inactive fallbacks.
 * Preserves input order within each bucket (e.g. newest-first from upstream sort).
 */
export function prioritizeRunningDashboardInlinePreviewAds<T>(
  ads: readonly T[],
  isRunning: (ad: T) => boolean,
  hasPreview: (ad: T) => boolean,
): T[] {
  const active: T[] = [];
  const inactive: T[] = [];
  for (const ad of ads) {
    if (!hasPreview(ad)) continue;
    if (isRunning(ad)) active.push(ad);
    else inactive.push(ad);
  }
  return [...active, ...inactive];
}

/**
 * Up to `limit` dashboard preview cards: prefer running creatives with previews, then ended
 * creatives with previews, then any running card, then any ended card (expired-preview UI beats empty slots).
 */
export function pickDashboardInlinePreviewAds<T>(
  ads: readonly T[],
  isRunning: (ad: T) => boolean,
  hasPreview: (ad: T) => boolean,
  limit = 3,
  keyOf: (ad: T) => string = (ad) => String((ad as { id?: string }).id ?? ""),
): T[] {
  const withPreview = prioritizeRunningDashboardInlinePreviewAds(ads, isRunning, hasPreview);
  if (withPreview.length >= limit) return withPreview.slice(0, limit);

  const pickedKeys = new Set(withPreview.map(keyOf));
  const rest = ads.filter((ad) => !pickedKeys.has(keyOf(ad)));
  const fallback = prioritizeRunningDashboardInlinePreviewAds(rest, isRunning, () => true);
  return [...withPreview, ...fallback].slice(0, limit);
}

export function googleAdRowHasDashboardInlinePreview(row: GoogleAdRow): boolean {
  if (row.type === "youtube") {
    const yid =
      row.youtubeVideoId?.trim() ||
      extractYouTubeVideoId(row.adUrl) ||
      extractYouTubeVideoId(row.thumbnail) ||
      "";
    if (row.videoUrl?.trim()) return true;
    const thumb = row.thumbnail?.trim() || "";
    if (thumb && isUsableGoogleStillImagePreviewUrl(thumb)) return true;
    if (yid) return true;
    return Boolean(youtubeThumbnailFromUrl(row.adUrl));
  }
  const still = pickGoogleStillPreviewExternalUrl(row.previewUrl, row.img);
  if (!still) return false;
  return Boolean(resolveGoogleStillPreviewDisplayCandidates(still)[0]);
}

export function linkedInAdHasDashboardInlinePreview(ad: LinkedInAdCard): boolean {
  return Boolean(ad.img?.trim() || ad.videoUrl?.trim());
}

export function tikTokAdHasDashboardInlinePreview(ad: TikTokAdCard): boolean {
  return Boolean(ad.img?.trim() || ad.videoUrl?.trim());
}

export function microsoftAdHasDashboardInlinePreview(ad: MicrosoftAdCard): boolean {
  return Boolean(ad.img?.trim());
}

export function pinterestAdHasDashboardInlinePreview(ad: PinterestAdCard): boolean {
  return Boolean(ad.img?.trim() || ad.videoUrl?.trim());
}

export function snapchatAdHasDashboardInlinePreview(ad: SnapchatAdCard): boolean {
  return Boolean(ad.videoUrl?.trim() || ad.img?.trim());
}
