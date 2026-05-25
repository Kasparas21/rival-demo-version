import type { CacheablePlatform } from "./cache-ttl";
import type { AdsLibraryPlatform } from "./ads-library-platform";

export type AdsCachePickRow = {
  id?: string;
  platform: string;
  ads_data: unknown;
  competitor_domain: string;
  scraped_at: string;
  expires_at?: string | null;
};

function isCacheablePlatform(p: string): p is CacheablePlatform {
  return (
    p === "meta" ||
    p === "google" ||
    p === "linkedin" ||
    p === "tiktok" ||
    p === "microsoft" ||
    p === "pinterest" ||
    p === "snapchat"
  );
}

export function rowExpiresStillValid(expiresAt: string | null | undefined, nowIso: string): boolean {
  if (expiresAt == null || String(expiresAt).trim() === "") return false;
  const ex = Date.parse(String(expiresAt));
  const now = Date.parse(nowIso);
  if (Number.isNaN(ex) || Number.isNaN(now)) return false;
  return ex > now;
}

/** Count creatives stored in an `ads_cache.ads_data` blob for a platform. */
export function countAdsInCachePayload(platform: AdsLibraryPlatform, adsData: unknown): number {
  if (!adsData || typeof adsData !== "object") return 0;
  const o = adsData as Record<string, unknown>;
  if (o.error != null) return 0;
  if (platform === "google") return Array.isArray(o.rows) ? o.rows.length : 0;
  return Array.isArray(o.ads) ? o.ads.length : 0;
}

function countAdsInCacheRow(row: AdsCachePickRow): number {
  const pl = row.platform;
  if (!pl || !isCacheablePlatform(pl)) return 0;
  return countAdsInCachePayload(pl, row.ads_data);
}

/**
 * Pick the best cached platform row across slug/domain variants.
 * Never prefers a newer empty snapshot over an older non-empty one (manual refresh can return 0 today).
 */
export function pickBestAdsCacheRowMapByPlatform(
  rows: AdsCachePickRow[],
  preferredDomain: string,
  nowIso: string,
): Map<CacheablePlatform, AdsCachePickRow> {
  const pref = preferredDomain.trim().toLowerCase();
  const bestRow = new Map<CacheablePlatform, AdsCachePickRow>();

  for (const row of rows) {
    const pl = row.platform;
    if (!pl || !isCacheablePlatform(pl)) continue;
    const cp = pl as CacheablePlatform;
    const prev = bestRow.get(cp);
    if (!prev) {
      bestRow.set(cp, row);
      continue;
    }

    const rDom = String(row.competitor_domain ?? "").trim().toLowerCase();
    const pDom = String(prev.competitor_domain ?? "").trim().toLowerCase();
    const rPref = pref.length > 0 && rDom === pref;
    const pPref = pref.length > 0 && pDom === pref;
    if (rPref && !pPref) {
      bestRow.set(cp, row);
      continue;
    }
    if (!rPref && pPref) continue;

    const rFresh = rowExpiresStillValid(row.expires_at ?? null, nowIso);
    const pFresh = rowExpiresStillValid(prev.expires_at ?? null, nowIso);
    const rCount = countAdsInCacheRow(row);
    const pCount = countAdsInCacheRow(prev);
    if (rFresh && !pFresh) {
      if (rCount > 0 || pCount === 0) {
        bestRow.set(cp, row);
      }
      continue;
    }
    if (!rFresh && pFresh) {
      if (pCount === 0 && rCount > 0) {
        bestRow.set(cp, row);
      }
      continue;
    }

    const rTime = Date.parse(row.scraped_at);
    const pTime = Date.parse(prev.scraped_at);

    if (!Number.isNaN(rTime) && !Number.isNaN(pTime) && rTime > pTime) {
      if (rCount > 0 || pCount === 0) {
        bestRow.set(cp, row);
      }
      continue;
    }
    if (!Number.isNaN(rTime) && !Number.isNaN(pTime) && pTime > rTime) {
      if (pCount === 0 && rCount > 0) {
        bestRow.set(cp, row);
      }
      continue;
    }

    if (rCount > pCount) {
      bestRow.set(cp, row);
    }
  }

  return bestRow;
}

export function pickBestAdsCacheHitsByPlatform(
  rows: AdsCachePickRow[],
  preferredDomain: string,
  nowIso: string,
): Map<CacheablePlatform, unknown> {
  const bestRow = pickBestAdsCacheRowMapByPlatform(rows, preferredDomain, nowIso);
  const out = new Map<CacheablePlatform, unknown>();
  for (const [p, r] of bestRow) out.set(p, r.ads_data);
  return out;
}
