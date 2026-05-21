import type { AdsLibraryPartialJson, AdsLibraryResponse } from "./api-types";
import { coerceAdsLibraryResponse } from "./api-types";
import { ALL_ADS_API_PLATFORMS } from "./channels-to-platforms";
import { countLibraryAdsForPlatform } from "./library-response-utils";
import { mirrorToLocalStorageIfSmall, safeSetSessionStorage } from "@/lib/cache/storage-quota";

export type FetchAdsLibraryResult = {
  response: AdsLibraryResponse | AdsLibraryPartialJson;
  httpOk: boolean;
};

function sortKeysDeep(x: unknown): unknown {
  if (x === null || typeof x !== "object") return x;
  if (Array.isArray(x)) return x.map(sortKeysDeep);
  const o = x as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(o).sort()) {
    out[k] = sortKeysDeep(o[k]);
  }
  return out;
}

/** Deterministic JSON for cache + inflight keys (object key order varies otherwise). */
export function stableAdsLibraryPayloadKey(payload: unknown): string {
  return JSON.stringify(sortKeysDeep(payload));
}

/** Same brand shape for scanning + competitor payloads so storage keys match. */
export function normalizedBrandForAdsLibraryPayload(brand: {
  name: string;
  domain: string;
  logoUrl?: string;
}): { name: string; domain: string; logoUrl?: string } {
  const rawDomain = brand.domain.trim();
  const domain =
    rawDomain
      .replace(/^https?:\/\//i, "")
      .replace(/^www\./i, "")
      .split("/")[0] || rawDomain;
  const name = brand.name.trim();
  const out: { name: string; domain: string; logoUrl?: string } = { name, domain };
  const logo = brand.logoUrl?.trim();
  if (logo) out.logoUrl = logo;
  return out;
}

const inflight = new Map<string, Promise<FetchAdsLibraryResult>>();
const cache = new Map<string, { expires: number; result: FetchAdsLibraryResult }>();

/** How long to reuse a successful response without calling the API again. */
const DEFAULT_SUCCESS_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const ERROR_TTL_MS = 60 * 1000; // 1 minute — misconfig / HTTP errors
const SESSION_CACHE_PREFIX = "ads-library:response:";
const LOCAL_CACHE_PREFIX = "ads-library:persistent:";

function cacheTtlFor(result: FetchAdsLibraryResult): number {
  if (!result.httpOk || result.response.configured === false) return ERROR_TTL_MS;
  return DEFAULT_SUCCESS_TTL_MS;
}

/**
 * Last saved response for this payload (session, then local), even if TTL expired.
 * Used to hydrate the UI on refresh without calling the API until the user rescrapes.
 */
function cleanDomainForCacheKey(d: string): string {
  const t = d.trim().toLowerCase();
  return t.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] || t;
}

function tryParseStoredResult(raw: string | null): FetchAdsLibraryResult | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { result?: FetchAdsLibraryResult };
    const r = parsed?.result;
    if (!r || r.response === undefined) return null;
    return r;
  } catch {
    return null;
  }
}

export function readAdsLibraryCacheLastKnownGood(payloadKey: string): FetchAdsLibraryResult | null {
  if (typeof window === "undefined") return null;
  try {
    const s = tryParseStoredResult(window.sessionStorage.getItem(`${SESSION_CACHE_PREFIX}${payloadKey}`));
    if (s) return s;
    return tryParseStoredResult(window.localStorage.getItem(`${LOCAL_CACHE_PREFIX}${payloadKey}`));
  } catch {
    return null;
  }
}

function totalAdsInFetchResult(result: FetchAdsLibraryResult): number {
  const shell = coerceAdsLibraryResponse(result.response as AdsLibraryResponse);
  return ALL_ADS_API_PLATFORMS.reduce(
    (sum, pl) => sum + countLibraryAdsForPlatform(pl, shell),
    0,
  );
}

/**
 * older cache entries still live under a different key string. Find the best matching
 * stored response for this brand domain and return it so hydration still works after refresh.
 */
function scanStorageForBrandDomain(
  store: Storage,
  prefix: string,
  brandDomain: string
): { expires: number; result: FetchAdsLibraryResult } | null {
  const target = cleanDomainForCacheKey(brandDomain);
  let best: { expires: number; result: FetchAdsLibraryResult } | null = null;
  for (let i = 0; i < store.length; i += 1) {
    const k = store.key(i);
    if (!k || !k.startsWith(prefix)) continue;
    const suffix = k.slice(prefix.length);
    let payload: unknown;
    try {
      payload = JSON.parse(suffix);
    } catch {
      continue;
    }
    const p = payload as { brand?: { domain?: string } };
    const dom = p.brand?.domain;
    if (!dom || cleanDomainForCacheKey(dom) !== target) continue;
    const raw = store.getItem(k);
    if (!raw) continue;
    let expires = 0;
    let result: FetchAdsLibraryResult | null = null;
    try {
      const parsed = JSON.parse(raw) as { expires?: number; result?: FetchAdsLibraryResult };
      expires = typeof parsed.expires === "number" ? parsed.expires : 0;
      const r = parsed.result;
      if (r && r.response !== undefined) result = r;
    } catch {
      continue;
    }
    if (!result) continue;
    const totalAds = totalAdsInFetchResult(result);
    const bestTotal = best ? totalAdsInFetchResult(best.result) : -1;
    if (!best || totalAds > bestTotal || (totalAds === bestTotal && expires > best.expires)) {
      best = { expires, result };
    }
  }
  return best;
}

export function readAdsLibraryCacheLastKnownGoodForBrandDomain(
  brandDomain: string
): FetchAdsLibraryResult | null {
  if (typeof window === "undefined") return null;
  try {
    const fromSession = scanStorageForBrandDomain(
      window.sessionStorage,
      SESSION_CACHE_PREFIX,
      brandDomain
    );
    const fromLocal = scanStorageForBrandDomain(
      window.localStorage,
      LOCAL_CACHE_PREFIX,
      brandDomain
    );
    if (!fromSession) return fromLocal?.result ?? null;
    if (!fromLocal) return fromSession.result;
    return fromSession.expires >= fromLocal.expires ? fromSession.result : fromLocal.result;
  } catch {
    return null;
  }
}

export function readAdsLibrarySessionCache(
  payloadKey: string
): { expires: number; result: FetchAdsLibraryResult } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(`${SESSION_CACHE_PREFIX}${payloadKey}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { expires?: number; result?: FetchAdsLibraryResult };
    if (!parsed || typeof parsed.expires !== "number" || !parsed.result) return null;
    if (parsed.expires <= Date.now()) {
      window.sessionStorage.removeItem(`${SESSION_CACHE_PREFIX}${payloadKey}`);
      return null;
    }
    return { expires: parsed.expires, result: parsed.result };
  } catch {
    /* ignore */
  }
  try {
    const raw = window.localStorage.getItem(`${LOCAL_CACHE_PREFIX}${payloadKey}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { expires?: number; result?: FetchAdsLibraryResult };
    if (!parsed || typeof parsed.expires !== "number" || !parsed.result) return null;
    if (parsed.expires <= Date.now()) {
      window.localStorage.removeItem(`${LOCAL_CACHE_PREFIX}${payloadKey}`);
      return null;
    }
    return { expires: parsed.expires, result: parsed.result };
  } catch {
    return null;
  }
}

export function writeAdsLibrarySessionCache(
  payloadKey: string,
  result: FetchAdsLibraryResult,
  ttlMs?: number
): void {
  if (typeof window === "undefined") return;
  try {
    const effectiveTtl = ttlMs ?? cacheTtlFor(result);
    const payload = { expires: Date.now() + effectiveTtl, result };
    const serialized = JSON.stringify(payload);
    const sessionKey = `${SESSION_CACHE_PREFIX}${payloadKey}`;
    const localKey = `${LOCAL_CACHE_PREFIX}${payloadKey}`;
    safeSetSessionStorage(sessionKey, serialized);
    mirrorToLocalStorageIfSmall(localKey, serialized);
  } catch {
    // Ignore storage quota and serialization issues.
  }
}

/**
 * Single network call per unique payload even if React Strict Mode runs effects twice.
 * Optional short TTL cache to avoid duplicate charges when navigating back to the page.
 */
export function fetchAdsLibraryDeduplicated(
  payload: Record<string, unknown>,
  options: {
    skipCache?: boolean;
    /** Server: read `ads_cache` only — never Apify (pairs with discovery-scan guard). */
    cacheOnly?: boolean;
    /** When true, still use server `ads_cache` (`skipCache: false`) but bypass client session/memory short-circuit. */
    clientSkipReadCache?: boolean;
    cacheTtlMs?: number;
    signal?: AbortSignal;
  } = {}
): Promise<FetchAdsLibraryResult> {
  /** Matches {@link writeAdsLibrarySessionCache} / `useAdLibrary` `payloadKey` — never includes `skipCache`. */
  const storageKey = stableAdsLibraryPayloadKey(payload);
  /**
   * Dedupes in-flight fetches and must differ when `skipCache` differs; otherwise a refresh (`skipCache: true`)
   * could await a concurrent background load (`skipCache: false`) and never hit Apify.
   */
  const fetchKey = stableAdsLibraryPayloadKey({
    ...payload,
    ...(options.skipCache ? { skipCache: true } : {}),
    ...(options.cacheOnly ? { cacheOnly: true } : {}),
  });

  if (!options.skipCache && !options.clientSkipReadCache) {
    const persisted = readAdsLibrarySessionCache(storageKey);
    if (persisted && persisted.expires > Date.now()) {
      cache.set(storageKey, { expires: persisted.expires, result: persisted.result });
      return Promise.resolve(persisted.result);
    }
    const hit = cache.get(storageKey);
    if (hit && hit.expires > Date.now()) {
      return Promise.resolve(hit.result);
    }
  }

  const running = inflight.get(fetchKey);
  if (running) return running;

  const promise = (async (): Promise<FetchAdsLibraryResult> => {
    try {
      const res = await fetch("/api/ads/library", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          ...(options.skipCache ? { skipCache: true } : {}),
          ...(options.cacheOnly ? { cacheOnly: true } : {}),
        }),
        signal: options.signal,
      });
      const json = (await res.json()) as AdsLibraryResponse | AdsLibraryPartialJson;
      const result: FetchAdsLibraryResult = { response: json, httpOk: res.ok };

      if (!options.skipCache) {
        const ttl = options.cacheTtlMs ?? cacheTtlFor(result);
        cache.set(storageKey, { expires: Date.now() + ttl, result });
      }

      return result;
    } finally {
      inflight.delete(fetchKey);
    }
  })();

  inflight.set(fetchKey, promise);
  return promise;
}

function storageKeysMatchingBrandDomains(
  store: Storage,
  prefix: string,
  targets: Set<string>
): string[] {
  const toRemove: string[] = [];
  for (let i = 0; i < store.length; i += 1) {
    const k = store.key(i);
    if (!k || !k.startsWith(prefix)) continue;
    const suffix = k.slice(prefix.length);
    let payload: unknown;
    try {
      payload = JSON.parse(suffix);
    } catch {
      continue;
    }
    const p = payload as { brand?: { domain?: string } };
    const dom = p.brand?.domain;
    if (!dom || !targets.has(cleanDomainForCacheKey(dom))) continue;
    toRemove.push(k);
  }
  return toRemove;
}

function memoryKeysMatchingBrandDomains(targets: Set<string>): string[] {
  const keys: string[] = [];
  for (const k of cache.keys()) {
    let payload: unknown;
    try {
      payload = JSON.parse(k);
    } catch {
      continue;
    }
    const p = payload as { brand?: { domain?: string } };
    const dom = p.brand?.domain;
    if (dom && targets.has(cleanDomainForCacheKey(dom))) keys.push(k);
  }
  for (const k of inflight.keys()) {
    let payload: unknown;
    try {
      payload = JSON.parse(k);
    } catch {
      continue;
    }
    const p = payload as { brand?: { domain?: string } };
    const dom = p.brand?.domain;
    if (dom && targets.has(cleanDomainForCacheKey(dom))) keys.push(k);
  }
  return [...new Set(keys)];
}

/**
 * Drops client-side ads library responses for the given domains (session, local, and in-memory).
 * Call after removing a competitor so re-adding does not hydrate stale creatives.
 */
export function clearAdsLibraryClientCachesForBrandDomains(domains: string[]): void {
  const targets = new Set(
    domains.map((d) => cleanDomainForCacheKey(d)).filter((d) => d.length > 0)
  );
  if (targets.size === 0) return;

  if (typeof window !== "undefined") {
    try {
      for (const prefix of [SESSION_CACHE_PREFIX, LOCAL_CACHE_PREFIX]) {
        for (const store of [window.sessionStorage, window.localStorage]) {
          for (const k of storageKeysMatchingBrandDomains(store, prefix, targets)) {
            store.removeItem(k);
          }
        }
      }
    } catch {
      /* ignore */
    }
  }

  for (const k of memoryKeysMatchingBrandDomains(targets)) {
    cache.delete(k);
    inflight.delete(k);
  }
}

/** Clear cached entries (e.g. after logout). */
export function clearAdsLibraryClientCache(): void {
  cache.clear();
  if (typeof window !== "undefined") {
    try {
      const keys: string[] = [];
      for (let i = 0; i < window.localStorage.length; i += 1) {
        const key = window.localStorage.key(i);
        if (key && key.startsWith(LOCAL_CACHE_PREFIX)) keys.push(key);
      }
      keys.forEach((k) => window.localStorage.removeItem(k));
    } catch {
      // ignore
    }
  }
}
