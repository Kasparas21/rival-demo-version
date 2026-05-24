/**
 * Ad detail drawer: map DB row (`ad_creative_url` + `raw_payload`) to a playable video URL or still.
 * Persist layer often stores only thumbnails in `ad_creative_url` while `videoUrl` lives in `raw_payload`.
 */

import { pickSnapchatHeroStillUrlFromPayload } from "@/lib/ad-library/normalize";

export function looksLikePlayableVideoUrl(url: string): boolean {
  const u = url.trim().toLowerCase();
  if (!u) return false;
  if (/\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?|#|$)/i.test(u)) return false;
  if (/\.(mp4|webm|m3u8|mov)(\?|#|$)/i.test(u)) return true;
  if (u.includes("/video/") || u.includes("video?")) return true;
  if (u.includes("mime_type=video")) return true;
  if (/v\d+\.fbcdn\.net|fbcdn.*\.mp4/i.test(u)) return true;
  return false;
}

function stringField(o: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

export type ResolvedCreativeMedia =
  | { kind: "video"; src: string; poster?: string }
  | { kind: "image"; src: string }
  | { kind: "empty" };

/**
 * Prefer a real video file for `<video src>`. Fall back to still image (thumbnail) when no playable URL.
 */
export function resolveAdDetailCreativeMedia(ad: {
  platform: string;
  format: string;
  ad_creative_url: string | null;
  raw_payload: unknown;
}): ResolvedCreativeMedia {
  const creative = ad.ad_creative_url?.trim() ?? "";
  const pl = ad.platform.toLowerCase();
  const payload =
    ad.raw_payload && typeof ad.raw_payload === "object" && !Array.isArray(ad.raw_payload)
      ? (ad.raw_payload as Record<string, unknown>)
      : null;

  const posterCandidates: string[] = [];
  const pushDistinctPoster = (u: string | null | undefined) => {
    const t = u?.trim();
    if (t && !posterCandidates.includes(t)) posterCandidates.push(t);
  };

  /** Snapchat: `ad_creative_url` is sometimes a Bolt logo; prefer EU gallery raster from payload. */
  if (payload && pl === "snapchat") {
    const snapHero = pickSnapchatHeroStillUrlFromPayload(payload);
    if (snapHero) pushDistinctPoster(snapHero);
  }

  if (creative && !looksLikePlayableVideoUrl(creative)) pushDistinctPoster(creative);
  if (payload) {
    const pImg = stringField(payload, [
      "img",
      "imageUrl",
      "ImageUrl",
      "thumbnail",
      "thumbnailUrl",
      "previewUrl",
      "AD Preview",
      "Ad Preview",
    ]);
    if (pImg) pushDistinctPoster(pImg);
  }

  const videoCandidates: string[] = [];
  if (creative && looksLikePlayableVideoUrl(creative)) videoCandidates.push(creative);
  if (payload) {
    const pv = stringField(payload, [
      "videoUrl",
      "video_url",
      "Video URL",
      "VideoUrl",
      "creativeVideoUrl",
      "video",
    ]);
    if (pv) videoCandidates.push(pv);
  }

  const videoSrc = videoCandidates.find((u) => looksLikePlayableVideoUrl(u)) ?? null;
  const poster = posterCandidates.find(Boolean);

  if (videoSrc) {
    return { kind: "video", src: videoSrc, ...(poster ? { poster } : {}) };
  }

  const still = poster ?? (creative && !looksLikePlayableVideoUrl(creative) ? creative : null);
  if (still) return { kind: "image", src: still };

  if (creative) return { kind: "image", src: creative };

  return { kind: "empty" };
}

export function isMostlyVerticalCreativePlatform(platform: string): boolean {
  const p = platform.toLowerCase();
  return p === "tiktok" || p === "snapchat" || p === "pinterest";
}

export type AdDetailDownloadKind = "thumbnail" | "video" | "image";

export type AdDetailDownloadTargets = {
  isVideoAd: boolean;
  thumbnail: string | null;
  video: string | null;
  image: string | null;
};

/** Resolve downloadable URLs for ad preview creative assets. */
export function resolveAdDetailDownloadTargets(ad: {
  platform: string;
  format: string;
  ad_creative_url: string | null;
  raw_payload: unknown;
}): AdDetailDownloadTargets {
  const resolved = resolveAdDetailCreativeMedia(ad);

  if (resolved.kind === "video") {
    const creative = ad.ad_creative_url?.trim() ?? "";
    const posterFromCreative =
      creative && !looksLikePlayableVideoUrl(creative) ? creative : null;
    return {
      isVideoAd: true,
      video: resolved.src,
      thumbnail: resolved.poster ?? posterFromCreative,
      image: null,
    };
  }

  if (resolved.kind === "image") {
    return {
      isVideoAd: false,
      video: null,
      thumbnail: null,
      image: resolved.src,
    };
  }

  return {
    isVideoAd: false,
    video: null,
    thumbnail: null,
    image: null,
  };
}

export function adDetailDownloadFilename(
  kind: AdDetailDownloadKind,
  platform: string,
  adId: string,
): string {
  const ext = kind === "video" ? "mp4" : "jpg";
  const slug = platform.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "ad";
  const shortId = adId.slice(0, 8);
  const label = kind === "thumbnail" ? "thumbnail" : kind === "video" ? "video" : "image";
  return `rival-${slug}-${shortId}-${label}.${ext}`;
}
