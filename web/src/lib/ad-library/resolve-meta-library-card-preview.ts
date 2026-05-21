import { resolveAdDetailCreativeMedia } from "@/lib/ad-detail/resolve-creative-media";

import {
  deepFindMetaPreviewUrl,
  looksLikeMetaRasterPreviewUrl,
  type MetaAdCard,
} from "./normalize";
import { repairMetaAdCardMedia } from "./repair-library-ad-media";

/** Same preview resolution as the ad detail drawer, for library grid cards. */
export function resolveMetaLibraryCardPreview(ad: MetaAdCard): string {
  const repaired = repairMetaAdCardMedia(ad);

  const resolved = resolveAdDetailCreativeMedia({
    platform: "meta",
    format: repaired.isVideo ? "video" : "image",
    ad_creative_url: repaired.img?.trim() || null,
    raw_payload: repaired,
  });
  if (resolved.kind === "image" && resolved.src.trim()) return resolved.src.trim();
  if (resolved.kind === "video" && resolved.poster?.trim()) return resolved.poster.trim();

  const deep = deepFindMetaPreviewUrl(repaired);
  if (deep) return deep;

  const img = repaired.img?.trim() ?? "";
  return looksLikeMetaRasterPreviewUrl(img) ? img : "";
}

/** Normalize a library card for inline grid / modal rendering. */
export function hydrateMetaLibraryCardForDisplay(ad: MetaAdCard): MetaAdCard {
  const repaired = repairMetaAdCardMedia(ad);
  const preview = resolveMetaLibraryCardPreview(repaired);
  if (!preview) {
    return { ...repaired, img: "", isVideo: false, videoUrl: undefined };
  }

  const stream = repaired.videoUrl?.trim() ?? "";
  const wantsVideo = Boolean(stream && repaired.isVideo);
  return {
    ...repaired,
    img: preview,
    isVideo: wantsVideo,
    videoUrl: wantsVideo ? stream : undefined,
  };
}
