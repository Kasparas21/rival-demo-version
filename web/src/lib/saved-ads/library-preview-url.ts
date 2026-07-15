import { resolveAdDetailCreativeMedia } from "@/lib/ad-detail/resolve-creative-media";
import { resolveMetaLibraryCardPreview } from "@/lib/ad-library/resolve-meta-library-card-preview";
import type { MetaAdCard } from "@/lib/ad-library/normalize";

/** Thumbnail src for list UIs — live CDN first, archived Storage copy as immediate fallback. */
export function creativeThumbnailSrc(row: {
  ad_creative_url: string | null;
  archived_creative_url?: string | null;
}): string | null {
  const live = row.ad_creative_url?.trim();
  if (live) return live;
  return row.archived_creative_url?.trim() || null;
}

/** Still preview URL from a `scraped_ads` row — same sources as the ad detail drawer. */
export function libraryPreviewUrlFromScrapedRow(row: {
  platform: string;
  ad_creative_url: string | null;
  raw_payload: unknown;
}): string | null {
  const pl = row.platform.trim().toLowerCase();

  if (pl === "meta" && row.raw_payload && typeof row.raw_payload === "object" && !Array.isArray(row.raw_payload)) {
    const preview = resolveMetaLibraryCardPreview(row.raw_payload as MetaAdCard);
    if (preview) return preview;
  }

  const resolved = resolveAdDetailCreativeMedia({
    platform: row.platform,
    format: "image",
    ad_creative_url: row.ad_creative_url,
    raw_payload: row.raw_payload,
  });
  if (resolved.kind === "image") return resolved.src;
  if (resolved.kind === "video" && resolved.poster?.trim()) return resolved.poster.trim();
  return null;
}
