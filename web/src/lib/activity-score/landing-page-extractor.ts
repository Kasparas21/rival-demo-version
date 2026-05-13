import type { Json } from "@/lib/supabase/types";
import { extractGoogleHostnameLandingKey, extractLandingPageUrl } from "@/lib/landing-pages/extract-lp-url";
import { normalizeLandingPageUrl } from "@/lib/landing-pages/normalize-url";

function firstNonemptyString(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

/**
 * Best-effort landing URL per platform from scraped_ad.raw_payload.
 * Extends {@link extractLandingPageUrl} with extra keys some actors use (esp. Meta snapshot, TikTok product URLs).
 */
export function extractActivityLandingKey(platform: string, rawPayload: Json): string | null {
  const base = extractLandingPageUrl(platform, rawPayload);
  if (base) return base;

  const pl = platform.toLowerCase();
  const gh = extractGoogleHostnameLandingKey(platform, rawPayload);
  if (gh) return gh;

  if (!rawPayload || typeof rawPayload !== "object" || Array.isArray(rawPayload)) {
    return null;
  }
  const p = rawPayload as Record<string, unknown>;

  if (pl === "meta") {
    const extra =
      firstNonemptyString(p, ["linkDestination", "link_destination", "ctaUrl", "cta_url"]) ??
      (() => {
        const snap = p.snapshot;
        if (snap && typeof snap === "object" && !Array.isArray(snap)) {
          return firstNonemptyString(snap as Record<string, unknown>, [
            "link_url",
            "linkUrl",
            "caption_url",
            "website_url",
          ]);
        }
        return null;
      })();
    return extra ? normalizeLandingPageUrl(extra) : null;
  }

  if (pl === "tiktok" || pl === "youtube") {
    const u =
      firstNonemptyString(p, [
        "productUrl",
        "landingUrl",
        "landing_url",
        "destinationUrl",
        "externalUrl",
        "website",
      ]) ?? null;
    return u ? normalizeLandingPageUrl(u) : null;
  }

  return null;
}
