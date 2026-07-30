import {
  extractGoogleHostnameLandingKey,
  extractLandingPageUrl,
} from "@/lib/landing-pages/extract-lp-url";
import { landingPageGroupKey, unwrapOutboundRedirectUrl } from "@/lib/landing-pages/normalize-url";
import type { Json } from "@/lib/supabase/types";

export type AdLandingPageRef = {
  platform: string;
  raw_payload?: unknown;
};

/** Canonical landing-page group key for a scraped ad row, or null when unknown. */
export function landingPageKeyFromAd(ad: AdLandingPageRef): string | null {
  const platform = (ad.platform ?? "").trim().toLowerCase();
  const payload = ad.raw_payload ?? null;

  const lpUrl = extractLandingPageUrl(platform, (payload ?? {}) as Json);
  if (lpUrl) {
    return landingPageGroupKey(lpUrl);
  }

  const googleHost = extractGoogleHostnameLandingKey(platform, (payload ?? {}) as Json);
  if (googleHost) {
    return landingPageGroupKey(googleHost);
  }

  return null;
}

/** Extract a landing-page key from a platform ads-library card (normalized scrape shape). */
export function landingPageKeyFromLibraryAd(platform: string, ad: unknown): string | null {
  if (!ad || typeof ad !== "object") return null;

  const record = ad as Record<string, unknown>;
  if (record.raw_payload != null) {
    return landingPageKeyFromAd({
      platform,
      raw_payload: record.raw_payload as Json,
    });
  }

  const destination =
    (typeof record.destinationUrl === "string" && record.destinationUrl.trim()) ||
    (typeof record.landingPageUrl === "string" && record.landingPageUrl.trim()) ||
    null;

  if (destination) {
    const key = landingPageGroupKey(unwrapOutboundRedirectUrl(destination));
    if (key) return key;
  }

  const pl = platform.toLowerCase();
  if (pl === "google") {
    const hostLine = typeof record.url === "string" ? record.url.trim() : "";
    if (hostLine) {
      return extractGoogleHostnameLandingKey(
        "google",
        { type: "google", url: hostLine } as Json,
      );
    }
  }

  return null;
}

export function countUniqueLandingPageKeys(keys: Iterable<string | null | undefined>): number {
  const unique = new Set<string>();
  for (const key of keys) {
    if (key) unique.add(key);
  }
  return unique.size;
}

export function collectUniqueLandingPageKeysFromAds(ads: AdLandingPageRef[]): Set<string> {
  const keys = new Set<string>();
  for (const ad of ads) {
    const key = landingPageKeyFromAd(ad);
    if (key) keys.add(key);
  }
  return keys;
}
