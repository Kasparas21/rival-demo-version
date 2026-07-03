/**
 * Build a public “open this ad in the platform’s transparency / ad library” URL from
 * `scraped_ads.raw_payload` (same shapes as normalized library cards).
 */

import { normalizeAdDetailPlatformKey } from "@/lib/ad-detail/ad-detail-platform";
import { resolveMetaAdLibraryUrlFromPayload } from "@/lib/ad-library/meta-ad-library-url";
import { extractDomainFromTransparencyDomainSearchUrl } from "@/lib/ad-library/google-transparency-url";
import {
  buildGoogleTransparencyCreativeUrl,
  parseGoogleTransparencyAdvertiserCreative,
  parseStableGoogleTransparencyRowId,
} from "@/lib/ad-library/google-stable-id";
import type { GoogleAdRow } from "@/lib/ad-library/normalize";

function stringField(o: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function isHttpUrl(s: string): boolean {
  return /^https?:\/\//i.test(s.trim());
}

/** Synthetic ids from normalizers — not safe for public library URLs. */
/** Advertiser account or `?domain=` search — not a single-creative detail page. */
function isGoogleTransparencyAccountOrSearchUrl(url: string): boolean {
  if (!isHttpUrl(url)) return false;
  if (parseGoogleTransparencyAdvertiserCreative(url)) return false;
  try {
    const u = new URL(url.trim());
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    if (host !== "adstransparency.google.com") return false;
    if (extractDomainFromTransparencyDomainSearchUrl(url)) return true;
    const segments = u.pathname.replace(/\/+$/, "").split("/").filter(Boolean);
    return segments.length === 2 && segments[0] === "advertiser" && /^AR\d+$/i.test(segments[1] ?? "");
  } catch {
    return false;
  }
}

function googleTransparencyIdsFromPayload(p: Record<string, unknown>): {
  advertiserId: string;
  creativeId: string;
} | null {
  const advertiserId =
    stringField(p, ["advertiserId", "advertiser_id", "advertiserID"]) ?? null;
  let creativeId = stringField(p, ["creativeId", "creative_id", "creativeID"]);
  if (!creativeId && typeof p.id === "string") {
    const fromStable = parseStableGoogleTransparencyRowId(p.id);
    if (fromStable) return fromStable;
    const rawId = p.id.trim();
    if (/^CR\d+/i.test(rawId)) creativeId = rawId;
  }
  if (advertiserId && creativeId && /^CR\d+/i.test(creativeId)) {
    return { advertiserId, creativeId };
  }
  return null;
}

function resolveGoogleFamilyAdLibraryUrl(p: Record<string, unknown>): string | null {
  for (const key of ["creativeUrl", "creative_url", "creativeURL", "adUrl", "ad_url", "adLibraryUrl", "ad_library_url"]) {
    const raw = typeof p[key] === "string" ? (p[key] as string).trim() : "";
    if (raw && isHttpUrl(raw) && parseGoogleTransparencyAdvertiserCreative(raw)) {
      return raw;
    }
  }

  const ids = googleTransparencyIdsFromPayload(p);
  if (ids) {
    return buildGoogleTransparencyCreativeUrl(ids.advertiserId, ids.creativeId);
  }

  const fallback = stringField(p, [
    "creativeUrl",
    "creative_url",
    "creativeURL",
    "adUrl",
    "ad_url",
    "adLibraryUrl",
    "ad_library_url",
  ]);
  if (fallback && isHttpUrl(fallback) && !isGoogleTransparencyAccountOrSearchUrl(fallback)) {
    return fallback;
  }

  return null;
}

function isSyntheticFallbackId(platform: string, id: string): boolean {
  const t = id.trim();
  if (!t) return true;
  if (/^tt-\d+$/i.test(t)) return true;
  if (/^fb-\d+$/i.test(t)) return true;
  if (/^li-\d+$/i.test(t)) return true;
  if (/^ms-\d+$/i.test(t)) return true;
  const plNorm = normalizeAdDetailPlatformKey(platform);
  if (plNorm === "meta" && /^fb-/i.test(t)) return true;
  return false;
}

export function resolveAdLibrarySourceUrl(platform: string, rawPayload: unknown): string | null {
  if (!rawPayload || typeof rawPayload !== "object" || Array.isArray(rawPayload)) return null;
  const p = rawPayload as Record<string, unknown>;
  const pl = normalizeAdDetailPlatformKey(platform);

  switch (pl) {
    case "meta":
      return resolveMetaAdLibraryUrlFromPayload(p);

    case "tiktok": {
      const u = stringField(p, ["adUrl", "adLibraryUrl", "Ad Detail URL", "ad_detail_url", "url"]);
      if (u && isHttpUrl(u) && /library\.tiktok\.com|tiktok\.com\/ads/i.test(u)) return u;

      const id = typeof p.id === "string" ? p.id.trim() : "";
      if (id && !isSyntheticFallbackId("tiktok", id)) {
        return `https://library.tiktok.com/ads/detail/${encodeURIComponent(id)}`;
      }
      return null;
    }

    case "linkedin": {
      const detail = stringField(p, ["adDetailUrl", "ad_detail_url", "detailUrl"]);
      if (detail && isHttpUrl(detail) && detail.toLowerCase().includes("linkedin.com/ad-library")) {
        return detail;
      }
      const adUrl = typeof p.adUrl === "string" ? p.adUrl.trim() : "";
      if (adUrl && isHttpUrl(adUrl) && adUrl.toLowerCase().includes("linkedin.com/ad-library")) {
        return adUrl;
      }
      const url = typeof p.url === "string" ? p.url.trim() : "";
      if (url && isHttpUrl(url) && url.toLowerCase().includes("linkedin.com/ad-library/detail")) {
        return url;
      }
      const id = typeof p.id === "string" ? p.id.trim() : "";
      if (id && !isSyntheticFallbackId("linkedin", id)) {
        return `https://www.linkedin.com/ad-library/detail/${encodeURIComponent(id)}`;
      }
      return null;
    }

    case "google":
    case "youtube":
      return resolveGoogleFamilyAdLibraryUrl(p);

    case "pinterest":
    case "snapchat":
    case "microsoft": {
      const u = stringField(p, ["adUrl", "adLibraryUrl", "DetailUrl", "detailUrl"]);
      if (!u || !isHttpUrl(u)) return null;
      if (pl === "microsoft" && /^https:\/\/ads\.microsoft\.com\/?$/i.test(u.trim())) return null;
      return u;
    }

    default:
      return null;
  }
}

/** Per-creative Transparency URL for Google / YouTube library cards (not advertiser account). */
export function resolveGoogleAdRowTransparencyHref(
  ad: GoogleAdRow,
  fallbackDomain?: string | null
): string {
  const platform = ad.type === "youtube" ? "youtube" : "google";
  const resolved = resolveAdLibrarySourceUrl(platform, ad);
  if (resolved) return resolved;
  const domain = fallbackDomain?.trim();
  if (domain) {
    return `https://adstransparency.google.com/?region=any&domain=${encodeURIComponent(domain)}`;
  }
  const raw = ad.adUrl?.trim();
  if (raw) return raw;
  return "https://adstransparency.google.com/";
}

export function adLibraryLinkLabel(platform: string): string {
  const pl = normalizeAdDetailPlatformKey(platform);
  switch (pl) {
    case "meta":
      return "View in Meta Ads Library";
    case "tiktok":
      return "View in TikTok Ads Library";
    case "linkedin":
      return "View in LinkedIn Ad Library";
    case "google":
      return "View in Google Ads Transparency";
    case "youtube":
      return "View in Google Ads Transparency";
    case "pinterest":
      return "View in Pinterest Ad Library";
    case "snapchat":
      return "View in Snapchat Ads Library";
    case "microsoft":
      return "View in Microsoft Advertising Ad Library";
    default:
      return "View in ad library";
  }
}
