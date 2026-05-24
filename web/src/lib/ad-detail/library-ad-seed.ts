import type { AdDetailOpenSeed } from "@/lib/ad-detail/ad-detail-cache";
import { resolveMetaLibraryCardPreview } from "@/lib/ad-library/resolve-meta-library-card-preview";
import type { MetaAdCard } from "@/lib/ad-library/normalize";

export type LibrarySeedCompetitor = {
  id: string;
  name: string;
  domain: string;
  logo_url?: string | null;
};

function stringField(o: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function creativeFromPayload(platform: string, raw: Record<string, unknown>): string | null {
  const pl = platform.toLowerCase();
  if (pl === "meta") {
    const preview = resolveMetaLibraryCardPreview(raw as MetaAdCard);
    if (preview) return preview;
  }
  const img = stringField(raw, ["img", "imageUrl", "thumbnail", "previewUrl", "thumbnailUrl"]);
  if (img) return img;
  const video = stringField(raw, ["videoUrl", "video_url", "Video URL"]);
  return video || null;
}

/** Build instant-preview seed from an ad library card payload (before /api/ad-detail returns). */
export function buildLibraryCardDetailSeed(
  platform: string,
  scrapedAdId: string,
  rawAd: unknown,
  competitor: LibrarySeedCompetitor,
): AdDetailOpenSeed {
  const payload =
    rawAd && typeof rawAd === "object" && !Array.isArray(rawAd) ? (rawAd as Record<string, unknown>) : {};
  const pl = platform.trim().toLowerCase();
  const adText =
    stringField(payload, ["ad_text", "body", "description", "creativeCopy", "text"]) ||
    (typeof payload.adText === "string" ? payload.adText.trim() : "");
  const creative = creativeFromPayload(pl, payload);
  const isVideo =
    Boolean(stringField(payload, ["videoUrl", "video_url", "Video URL"])) ||
    payload.isVideo === true ||
    payload.format === "video";

  return {
    adId: scrapedAdId,
    platform: pl,
    format: isVideo ? "video" : "image",
    ad_creative_url: creative,
    ad_text: adText,
    cta: stringField(payload, ["cta", "ctaLabel"]) || null,
    raw_payload: payload,
    display_label: adText.slice(0, 50) || "Ad preview",
    competitor: {
      id: competitor.id,
      name: competitor.name,
      domain: competitor.domain,
      logo_url: competitor.logo_url ?? null,
    },
  };
}
