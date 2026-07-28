import { hydrateMetaAdCardForLibrary } from "@/lib/ad-library/count-active-ads";
import type { LibraryRunStatus } from "@/lib/ad-library/library-run-status";
import { isExpiredMetaCdnUrl } from "@/lib/ad-library/meta-cdn-expiry";
import type { MetaAdCard } from "@/lib/ad-library/normalize";
import { hydrateMetaLibraryCardForDisplay } from "@/lib/ad-library/resolve-meta-library-card-preview";
import { creativeThumbnailSrc, libraryPreviewUrlFromScrapedRow } from "@/lib/saved-ads/library-preview-url";

import type { DiscoveryAdDto } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function resolveDiscoveryPreview(ad: DiscoveryAdDto): string | null {
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

/** Align Discovery cards with competitor library preview resolution (snapshot repair + archives). */
export function hydrateDiscoveryMetaAdCard(ad: DiscoveryAdDto): {
  card: MetaAdCard;
  runStatus?: LibraryRunStatus;
} | null {
  if (ad.platform.trim().toLowerCase() !== "meta" || !isRecord(ad.raw_payload)) {
    return null;
  }

  const raw = ad.raw_payload as unknown as MetaAdCard;
  const preview = resolveDiscoveryPreview(ad);
  const seed =
    preview && !raw.img?.trim()
      ? { ...raw, img: preview }
      : !raw.img?.trim() && preview
        ? { ...raw, img: preview }
        : raw;

  let card = hydrateMetaLibraryCardForDisplay(seed);
  if (!card.img?.trim() && preview) {
    card = { ...card, img: preview };
  }

  const archived = ad.archived_creative_url?.trim() || "";
  if (!card.img?.trim() && archived) {
    card = { ...card, img: archived };
  } else if (card.img?.trim() && archived && isExpiredMetaCdnUrl(card.img)) {
    card = { ...card, img: archived };
  }

  const scrapeAtMs = Number.isFinite(new Date(ad.last_seen_at).getTime())
    ? new Date(ad.last_seen_at).getTime()
    : undefined;

  return {
    card: hydrateMetaAdCardForLibrary(card, scrapeAtMs),
    runStatus: archived
      ? { isRunning: !ad.is_killed, archivedCreativeUrl: archived }
      : undefined,
  };
}
