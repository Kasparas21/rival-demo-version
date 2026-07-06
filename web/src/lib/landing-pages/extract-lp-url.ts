import type { Json } from "@/lib/supabase/types";
import { normalizeLandingPageUrl, unwrapOutboundRedirectUrl } from "./normalize-url";

function firstNonemptyString(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function isTikTokLibraryUrl(url: string): boolean {
  const low = url.toLowerCase();
  return low.includes("library.tiktok.com") || low.includes("ads.tiktok.com");
}

/** Snapchat Ads Gallery / on-platform ad URLs — not a competitor landing page. */
function isSnapchatLibraryUrl(url: string): boolean {
  const low = url.toLowerCase();
  return low.includes("adsgallery.snap.com") || low.includes("snapchat.com/ads");
}

const TIKTOK_EXTERNAL_URL_KEYS = [
  "External URL",
  "externalUrl",
  "external_url",
  "productUrl",
  "landingUrl",
  "landing_url",
  "destinationUrl",
  "website",
] as const;

/**
 * Off-platform destination from TikTok Ads Library scrape (`data_xplorer/tiktok-ads-scraper`).
 * `Ad Details` blocks often include `{ "External URL": "https://..." }`.
 */
export function extractTikTokExternalLandingUrl(rawPayload: Json): string | null {
  if (!rawPayload || typeof rawPayload !== "object" || Array.isArray(rawPayload)) {
    return null;
  }
  const payload = rawPayload as Record<string, unknown>;

  const top = firstNonemptyString(payload, [...TIKTOK_EXTERNAL_URL_KEYS]);
  if (top && !isTikTokLibraryUrl(top)) {
    return normalizeLandingPageUrl(unwrapOutboundRedirectUrl(top));
  }

  const details = payload["Ad Details"];
  if (Array.isArray(details)) {
    for (const block of details) {
      if (!block || typeof block !== "object" || Array.isArray(block)) continue;
      const fromBlock = firstNonemptyString(block as Record<string, unknown>, [...TIKTOK_EXTERNAL_URL_KEYS]);
      if (fromBlock && !isTikTokLibraryUrl(fromBlock)) {
        return normalizeLandingPageUrl(unwrapOutboundRedirectUrl(fromBlock));
      }
    }
  }

  const adUrl =
    firstNonemptyString(payload, ["adUrl", "adLibraryUrl", "Ad Detail URL", "ad_detail_url"]) ?? null;
  if (adUrl && !isTikTokLibraryUrl(adUrl)) {
    return normalizeLandingPageUrl(unwrapOutboundRedirectUrl(adUrl));
  }

  return null;
}

/**
 * Extract the landing page URL from a scraped_ad's raw_payload.
 * Returns the normalized URL or null if no off-platform LP is available.
 *
 * Platform-specific extraction:
 * - meta: destinationUrl is the real LP
 * - google: only host is stored, no deep LP — return null (grouped by host separately in API)
 * - tiktok: External URL in Ad Details (or productUrl / landingUrl when present)
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
    case "pinterest": {
      const adUrl = typeof payload.adUrl === "string" ? payload.adUrl : null;
      if (!adUrl) return null;

      const platformDomains = [
        "linkedin.com/ad-library",
        "ads.microsoft.com",
        "pinterest.com/pin",
      ];
      const low = adUrl.toLowerCase();
      const isPlatformOwn = platformDomains.some((d) => low.includes(d));
      if (isPlatformOwn) return null;

      return normalizeLandingPageUrl(unwrapOutboundRedirectUrl(adUrl));
    }

    case "snapchat": {
      const adUrl = typeof payload.adUrl === "string" ? payload.adUrl : null;
      if (!adUrl) return null;
      if (isSnapchatLibraryUrl(adUrl)) return null;
      return normalizeLandingPageUrl(unwrapOutboundRedirectUrl(adUrl));
    }

    case "tiktok":
      return extractTikTokExternalLandingUrl(rawPayload);

    case "google":
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
