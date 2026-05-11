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
  youtubeThumbnailFromUrl,
} from "./normalize";

/** Shown when ads exist but none qualify for the inline 3-up (no image/video URL for the card UI). */
export const DASHBOARD_ADS_NO_INLINE_PREVIEW_MESSAGE =
  "The newest ads don’t have a dashboard image or video yet. Open View all for the full list.";

/** Matches Meta dashboard creative rules (still image, or library-flagged video with URL). */
export function metaAdHasDashboardInlinePreview(ad: MetaAdCard): boolean {
  if (ad.img?.trim()) return true;
  return Boolean(ad.videoUrl?.trim() && ad.isVideo);
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
  const rawPreview = (row.previewUrl?.trim() || "").trim();
  const rawImg = (row.img || "").trim();
  const imageSrc =
    (isUsableGoogleStillImagePreviewUrl(rawPreview) ? rawPreview : "") ||
    (isUsableGoogleStillImagePreviewUrl(rawImg) ? rawImg : "");
  const isFaviconOnly = Boolean(
    imageSrc.includes("google.com/s2/favicons") || imageSrc.includes("gstatic.com/favicon")
  );
  return Boolean(imageSrc && !isFaviconOnly);
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
