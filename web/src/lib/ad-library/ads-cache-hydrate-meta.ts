import { ALL_ADS_API_PLATFORMS } from "@/lib/ad-library/channels-to-platforms";
import type { CacheablePlatform } from "@/lib/ad-library/cache-ttl";

export type AdsCacheHydratePlatformMeta = {
  platform: string;
  id: string;
  scraped_at: string;
};

export type AdsCacheHydrateClientMeta = {
  platforms: AdsCacheHydratePlatformMeta[];
};

const HYDRATE_META_PREFIX = "ads-library:hydrate-meta:";

function cleanDomainForMetaKey(d: string): string {
  const t = d.trim().toLowerCase();
  return t.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] || t;
}

export function hydrateMetaStorageKey(domain: string): string {
  return `${HYDRATE_META_PREFIX}${cleanDomainForMetaKey(domain)}`;
}

export function readAdsCacheHydrateClientMeta(domain: string): AdsCacheHydrateClientMeta | null {
  if (typeof window === "undefined") return null;
  const key = hydrateMetaStorageKey(domain);
  try {
    const raw = window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AdsCacheHydrateClientMeta;
    if (!parsed?.platforms?.length) return null;
    const platforms = parsed.platforms.filter(
      (p): p is AdsCacheHydratePlatformMeta =>
        Boolean(p?.platform && p?.id && p?.scraped_at && typeof p.scraped_at === "string"),
    );
    if (platforms.length === 0) return null;
    return { platforms };
  } catch {
    return null;
  }
}

export function writeAdsCacheHydrateClientMeta(domain: string, meta: AdsCacheHydrateClientMeta): void {
  if (typeof window === "undefined") return;
  const key = hydrateMetaStorageKey(domain);
  try {
    const serialized = JSON.stringify(meta);
    window.sessionStorage.setItem(key, serialized);
    window.localStorage.setItem(key, serialized);
  } catch {
    /* quota */
  }
}

export function clearAdsCacheHydrateClientMetaForDomains(domains: string[]): void {
  if (typeof window === "undefined") return;
  const keys = new Set(domains.map((d) => hydrateMetaStorageKey(d)).filter(Boolean));
  if (keys.size === 0) return;
  try {
    for (const store of [window.sessionStorage, window.localStorage]) {
      for (const key of keys) {
        store.removeItem(key);
      }
    }
  } catch {
    /* ignore */
  }
}

export function buildAdsCacheHydrateClientMetaFromRows(
  rows: Array<{ id?: string; platform: string; scraped_at: string }>,
): AdsCacheHydrateClientMeta | null {
  const platforms: AdsCacheHydratePlatformMeta[] = [];
  for (const row of rows) {
    const id = row.id?.trim();
    const platform = row.platform?.trim();
    const scraped_at = row.scraped_at?.trim();
    if (!id || !platform || !scraped_at) continue;
    if (!(ALL_ADS_API_PLATFORMS as readonly string[]).includes(platform)) continue;
    platforms.push({ platform, id, scraped_at });
  }
  if (platforms.length === 0) return null;
  return { platforms };
}

export type AdsCacheMetadataRow = {
  id: string;
  platform: string;
  scraped_at: string;
  competitor_domain: string;
  expires_at?: string | null;
};

function isCacheablePlatform(p: string): p is CacheablePlatform {
  return (ALL_ADS_API_PLATFORMS as readonly string[]).includes(p);
}

/** Metadata-only platform pick — prefers canonical domain, then valid TTL, then newest scraped_at. */
export function pickBestAdsCacheMetadataByPlatform(
  rows: AdsCacheMetadataRow[],
  preferredDomain: string,
  nowIso: string,
): Map<CacheablePlatform, AdsCacheMetadataRow> {
  const pref = preferredDomain.trim().toLowerCase();
  const best = new Map<CacheablePlatform, AdsCacheMetadataRow>();

  for (const row of rows) {
    const pl = row.platform;
    if (!pl || !isCacheablePlatform(pl)) continue;
    const prev = best.get(pl);
    if (!prev) {
      best.set(pl, row);
      continue;
    }

    const rDom = String(row.competitor_domain ?? "").trim().toLowerCase();
    const pDom = String(prev.competitor_domain ?? "").trim().toLowerCase();
    const rPref = pref.length > 0 && rDom === pref;
    const pPref = pref.length > 0 && pDom === pref;
    if (rPref && !pPref) {
      best.set(pl, row);
      continue;
    }
    if (!rPref && pPref) continue;

    const rFresh = rowExpiresStillValid(row.expires_at ?? null, nowIso);
    const pFresh = rowExpiresStillValid(prev.expires_at ?? null, nowIso);
    if (rFresh && !pFresh) {
      best.set(pl, row);
      continue;
    }
    if (!rFresh && pFresh) continue;

    const rTime = Date.parse(row.scraped_at);
    const pTime = Date.parse(prev.scraped_at);
    if (!Number.isNaN(rTime) && !Number.isNaN(pTime) && rTime > pTime) {
      best.set(pl, row);
    }
  }

  return best;
}

function rowExpiresStillValid(expiresAt: string | null | undefined, nowIso: string): boolean {
  if (expiresAt == null || String(expiresAt).trim() === "") return false;
  const ex = Date.parse(String(expiresAt));
  const now = Date.parse(nowIso);
  if (Number.isNaN(ex) || Number.isNaN(now)) return false;
  return ex > now;
}

export function isAdsCacheHydrateClientMetaFresh(
  clientMeta: AdsCacheHydrateClientMeta,
  serverRows: AdsCacheMetadataRow[],
  preferredDomain: string,
  nowIso: string,
): boolean {
  if (serverRows.length === 0) return false;

  const clientMap = new Map(clientMeta.platforms.map((p) => [p.platform, p]));
  const serverById = new Map(serverRows.map((r) => [r.id, r]));

  for (const client of clientMeta.platforms) {
    const row = serverById.get(client.id);
    if (!row || row.platform !== client.platform || row.scraped_at !== client.scraped_at) {
      return false;
    }
  }

  const serverByPlatform = pickBestAdsCacheMetadataByPlatform(serverRows, preferredDomain, nowIso);
  if (serverByPlatform.size !== clientMap.size) return false;

  for (const [platform, serverRow] of serverByPlatform) {
    const clientRow = clientMap.get(platform);
    if (!clientRow || clientRow.id !== serverRow.id) return false;
  }

  return true;
}
