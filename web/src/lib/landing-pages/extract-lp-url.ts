import type { Json } from "@/lib/supabase/types";
import { normalizeLandingPageUrl, unwrapOutboundRedirectUrl } from "./normalize-url";

/**
 * Extract the landing page URL from a scraped_ad's raw_payload.
 * Returns the normalized URL or null if no off-platform LP is available.
 *
 * Platform-specific extraction:
 * - meta: destinationUrl is the real LP
 * - google: only host is stored, no deep LP — return null (grouped by host separately in API)
 * - tiktok: adUrl is the TikTok library URL, not off-platform — return null
 * - linkedin / microsoft / pinterest / snapchat: try adUrl if it's an off-platform URL
 * - youtube: no LP extraction
 */
export function extractLandingPageUrl(platform: string, rawPayload: Json): string | null {
  if (!rawPayload || typeof rawPayload !== "object" || Array.isArray(rawPayload)) {
    return null;
  }

  const payload = rawPayload as Record<string, unknown>;
  const pl = platform.toLowerCase();

  switch (pl) {
    case "meta": {
      const dest = typeof payload.destinationUrl === "string" ? payload.destinationUrl : null;
      return dest ? normalizeLandingPageUrl(unwrapOutboundRedirectUrl(dest)) : null;
    }

    case "linkedin":
    case "microsoft":
    case "pinterest":
    case "snapchat": {
      const adUrl = typeof payload.adUrl === "string" ? payload.adUrl : null;
      if (!adUrl) return null;

      const platformDomains = [
        "linkedin.com/ad-library",
        "ads.microsoft.com",
        "pinterest.com/pin",
        "snapchat.com/ads",
      ];
      const low = adUrl.toLowerCase();
      const isPlatformOwn = platformDomains.some((d) => low.includes(d));
      if (isPlatformOwn) return null;

      return normalizeLandingPageUrl(unwrapOutboundRedirectUrl(adUrl));
    }

    case "google":
    case "tiktok":
    case "youtube":
    default:
      return null;
  }
}

/**
 * Google Search rows only store a hostname in `url`. Returns normalized origin URL for grouping.
 */
export function extractGoogleHostnameLandingKey(platform: string, rawPayload: Json): string | null {
  if (platform.toLowerCase() !== "google") return null;
  if (!rawPayload || typeof rawPayload !== "object" || Array.isArray(rawPayload)) {
    return null;
  }
  const payload = rawPayload as Record<string, unknown>;
  if (payload.type !== "google") return null;
  const hostLine = typeof payload.url === "string" ? payload.url.trim() : "";
  if (!hostLine) return null;
  const hostOnly = hostLine.replace(/^https?:\/\//i, "").split("/")[0]?.trim() ?? "";
  if (!hostOnly) return null;
  return normalizeLandingPageUrl(`https://${hostOnly}`);
}
