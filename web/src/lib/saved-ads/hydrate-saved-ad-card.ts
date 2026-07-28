import { hydrateMetaAdCardForLibrary } from "@/lib/ad-library/count-active-ads";
import { isExpiredMetaCdnUrl } from "@/lib/ad-library/meta-cdn-expiry";
import type { MetaAdCard } from "@/lib/ad-library/normalize";
import { hydrateMetaLibraryCardForDisplay } from "@/lib/ad-library/resolve-meta-library-card-preview";
import { creativeThumbnailSrc, libraryPreviewUrlFromScrapedRow } from "@/lib/saved-ads/library-preview-url";
import type { Json } from "@/lib/supabase/types";

export type SavedAdDisplayRow = {
  platform: string;
  ad_creative_url: string | null;
  archived_creative_url?: string | null;
  raw_payload: Json;
  source_last_seen_at?: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function resolveSavedPreview(ad: SavedAdDisplayRow): string | null {
  const archived = ad.archived_creative_url?.trim() || "";
  const fromPayload = libraryPreviewUrlFromScrapedRow({
    platform: ad.platform,
    ad_creative_url: ad.ad_creative_url,
    raw_payload: ad.raw_payload,
  });
  if (fromPayload) {
    if (archived && isExpiredMetaCdnUrl(fromPayload)) return archived;
    return fromPayload;
  }
  return creativeThumbnailSrc({
    ad_creative_url: ad.ad_creative_url,
    archived_creative_url: ad.archived_creative_url,
  });
}

/** Hydrate a saved ad snapshot for library card display — prefers permanent archive over expired CDN. */
export function hydrateSavedAdForDisplay(ad: SavedAdDisplayRow): {
  raw_payload: Json;
  previewUrl: string | null;
} {
  const platform = ad.platform.trim().toLowerCase();
  const preview = resolveSavedPreview(ad);

  if (platform !== "meta" || !isRecord(ad.raw_payload)) {
    return { raw_payload: ad.raw_payload, previewUrl: preview };
  }

  const raw = ad.raw_payload as unknown as MetaAdCard;
  const seed = preview && !raw.img?.trim() ? { ...raw, img: preview } : raw;
  let card = hydrateMetaLibraryCardForDisplay(seed);
  const archived = ad.archived_creative_url?.trim() || "";

  if (!card.img?.trim() && preview) {
    card = { ...card, img: preview };
  } else if (!card.img?.trim() && archived) {
    card = { ...card, img: archived };
  } else if (card.img?.trim() && archived && isExpiredMetaCdnUrl(card.img)) {
    card = { ...card, img: archived };
  }

  const scrapeAtMs = ad.source_last_seen_at
    ? Number.isFinite(new Date(ad.source_last_seen_at).getTime())
      ? new Date(ad.source_last_seen_at).getTime()
      : undefined
    : undefined;

  return {
    raw_payload: hydrateMetaAdCardForLibrary(card, scrapeAtMs) as unknown as Json,
    previewUrl: preview ?? (archived || card.img?.trim() || null),
  };
}
