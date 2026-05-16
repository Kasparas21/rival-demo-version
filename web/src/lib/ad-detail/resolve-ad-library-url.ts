/**
 * Build a public “open this ad in the platform’s transparency / ad library” URL from
 * `scraped_ads.raw_payload` (same shapes as normalized library cards).
 */

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
function isSyntheticFallbackId(platform: string, id: string): boolean {
  const t = id.trim();
  if (!t) return true;
  if (/^tt-\d+$/i.test(t)) return true;
  if (/^fb-\d+$/i.test(t)) return true;
  if (/^li-\d+$/i.test(t)) return true;
  if (/^ms-\d+$/i.test(t)) return true;
  if (platform === "meta" && /^fb-/i.test(t)) return true;
  return false;
}

export function resolveAdLibrarySourceUrl(platform: string, rawPayload: unknown): string | null {
  if (!rawPayload || typeof rawPayload !== "object" || Array.isArray(rawPayload)) return null;
  const p = rawPayload as Record<string, unknown>;
  const pl = platform.trim().toLowerCase();

  switch (pl) {
    case "meta": {
      const direct = stringField(p, ["adLibraryUrl", "ad_library_url", "facebook_ad_library_url"]);
      if (direct && isHttpUrl(direct)) return direct;

      const archive = stringField(p, ["ad_archive_id", "adArchiveId"]) ?? null;
      if (archive && /^\d+$/.test(archive)) {
        return `https://www.facebook.com/ads/library/?id=${encodeURIComponent(archive)}`;
      }
      const id = typeof p.id === "string" ? p.id.trim() : "";
      if (id && /^\d+$/.test(id)) {
        return `https://www.facebook.com/ads/library/?id=${encodeURIComponent(id)}`;
      }
      return null;
    }

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
    case "youtube": {
      const u = stringField(p, ["adUrl"]);
      return u && isHttpUrl(u) ? u : null;
    }

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

export function adLibraryLinkLabel(platform: string): string {
  switch (platform.trim().toLowerCase()) {
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
