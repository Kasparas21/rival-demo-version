import { coerceAdsLibraryResponse, type AdsLibraryResponse } from "./api-types";
import {
  deepFindMetaPreviewUrl,
  looksLikeMetaRasterPreviewUrl,
  pickGoogleStillPreviewExternalUrl,
  type GoogleAdRow,
  type MetaAdCard,
  type TikTokAdCard,
} from "./normalize";

function firstHttpUrl(obj: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string" && /^https?:\/\//i.test(value.trim())) {
      return value.trim();
    }
  }
  return "";
}

function deepFindTikTokImageUrl(raw: Record<string, unknown>): string {
  const walk = (obj: unknown, depth: number): string | undefined => {
    if (depth > 8 || obj === null || obj === undefined) return undefined;
    if (typeof obj === "string") {
      const s = obj.trim();
      if (!/^https?:\/\//i.test(s) || s.length < 16) return undefined;
      if (/ibyteimg|tiktokcdn|byteimg|ttwstatic|musical\.ly|p\d+-(sign\.)?tiktokcdn/i.test(s)) return s;
      if (/\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(s)) return s;
      return undefined;
    }
    if (Array.isArray(obj)) {
      for (const item of obj) {
        const hit = walk(item, depth + 1);
        if (hit) return hit;
      }
    }
    if (typeof obj === "object") {
      for (const value of Object.values(obj)) {
        const hit = walk(value, depth + 1);
        if (hit) return hit;
      }
    }
    return undefined;
  };
  return walk(raw, 0) ?? "";
}

function repairMetaSnapshotImage(snapshot: unknown): string {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) return "";
  const snap = snapshot as Record<string, unknown>;
  const direct = firstHttpUrl(snap, [
    "image_url",
    "imageUrl",
    "picture",
    "full_picture",
    "fullPicture",
    "preview_url",
    "previewUrl",
    "thumbnail_url",
    "thumbnailUrl",
  ]);
  if (direct) return direct;

  const cards = snap.cards;
  if (Array.isArray(cards)) {
    for (const card of cards) {
      if (!card || typeof card !== "object") continue;
      const cardObj = card as Record<string, unknown>;
  const cardUrl = firstHttpUrl(cardObj, [
        "image_url",
        "imageUrl",
        "image_uri",
        "imageUri",
        "original_image_url",
        "resized_image_url",
        "video_preview_image_url",
        "preview_url",
        "previewUrl",
        "picture",
        "thumbnail_url",
        "thumbnailUrl",
        "thumbnail_uri",
        "thumbnailUri",
        "url",
        "uri",
        "static_image_url",
        "staticImageUrl",
      ]);
      if (cardUrl) return cardUrl;
    }
  }

  const images = snap.images;
  if (Array.isArray(images) && images[0] && typeof images[0] === "object") {
    const img0 = images[0] as Record<string, unknown>;
    return firstHttpUrl(img0, ["resized_image_url", "original_image_url", "video_preview_image_url"]);
  }

  return "";
}

export function repairMetaAdCardMedia(ad: MetaAdCard): MetaAdCard {
  const loose = ad as unknown as Record<string, unknown>;
  const currentImg = ad.img?.trim() ?? "";

  /** Prefer snapshot/deep scan over stale top-level `img` from older cache merges. */
  const fromSnapshot = repairMetaSnapshotImage(loose.snapshot);
  if (fromSnapshot) return { ...ad, img: fromSnapshot };

  const fromDeep = deepFindMetaPreviewUrl(loose);
  if (fromDeep) return { ...ad, img: fromDeep };

  if (currentImg && looksLikeMetaRasterPreviewUrl(currentImg)) return ad;

  const fromTop = firstHttpUrl(loose, [
    "image_url",
    "imageUrl",
    "picture",
    "full_picture",
    "thumbnail",
    "previewUrl",
    "preview_url",
    "thumbnail_url",
    "thumbnailUrl",
    "video_preview_image_url",
    "original_image_url",
    "resized_image_url",
  ]);
  if (fromTop) return { ...ad, img: fromTop };

  const videoUrl = ad.videoUrl?.trim() || firstHttpUrl(loose, ["videoUrl", "video_url", "video_hd_url"]);
  if (videoUrl && !ad.videoUrl?.trim()) {
    return { ...ad, videoUrl, isVideo: ad.isVideo || true };
  }
  return ad;
}

export function repairGoogleAdRowMedia(row: GoogleAdRow): GoogleAdRow {
  if (row.type === "youtube") return row;
  const still = pickGoogleStillPreviewExternalUrl(row.previewUrl, row.img);
  if (!still) return row;
  if (row.img === still && row.previewUrl === still) return row;
  return { ...row, img: still, previewUrl: still };
}

export function repairTikTokAdCardMedia(ad: TikTokAdCard): TikTokAdCard {
  if (ad.img?.trim()) return ad;
  const loose = ad as unknown as Record<string, unknown>;
  const fromTop = firstHttpUrl(loose, [
    "previewUrl",
    "preview_url",
    "thumbnail",
    "imageUrl",
    "image_url",
    "AD Preview",
    "Ad Preview",
  ]);
  if (fromTop) return { ...ad, img: fromTop };

  const fromDeep = deepFindTikTokImageUrl(loose);
  if (fromDeep) return { ...ad, img: fromDeep };

  const videoUrl = ad.videoUrl?.trim() || firstHttpUrl(loose, ["videoUrl", "video_url"]);
  if (videoUrl && !ad.videoUrl?.trim()) {
    return { ...ad, videoUrl };
  }
  return ad;
}

/** Best-effort repair for cached library payloads missing preview URLs after merge/rescrape. */
export function repairAdsLibraryResponseMedia(
  input: AdsLibraryResponse | null | undefined
): AdsLibraryResponse {
  const shell = coerceAdsLibraryResponse(input);
  return {
    ...shell,
    meta: {
      ...shell.meta,
      ads: (shell.meta.ads ?? []).map(repairMetaAdCardMedia),
    },
    tiktok: {
      ...shell.tiktok,
      ads: (shell.tiktok.ads ?? []).map(repairTikTokAdCardMedia),
    },
    google: {
      ...shell.google,
      rows: (shell.google.rows ?? []).map(repairGoogleAdRowMedia),
    },
  };
}
