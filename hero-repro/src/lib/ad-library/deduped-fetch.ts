import type { AdsLibraryPartialJson, AdsLibraryResponse } from "./api-types";

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

/**
 * When the exact payload key changes (e.g. new `googleRegion` / `googleResultsLimit` fields),
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
    if (!best || expires > best.expires) {
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
    window.sessionStorage.setItem(`${SESSION_CACHE_PREFIX}${payloadKey}`, JSON.stringify(payload));
    window.localStorage.setItem(`${LOCAL_CACHE_PREFIX}${payloadKey}`, JSON.stringify(payload));
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
  options: { skipCache?: boolean; cacheTtlMs?: number } = {}
): Promise<FetchAdsLibraryResult> {
  const key = stableAdsLibraryPayloadKey(payload);

  if (!options.skipCache) {
    const persisted = readAdsLibrarySessionCache(key);
    if (persisted && persisted.expires > Date.now()) {
      cache.set(key, { expires: persisted.expires, result: persisted.result });
      return Promise.resolve(persisted.result);
    }
    const hit = cache.get(key);
    if (hit && hit.expires > Date.now()) {
      return Promise.resolve(hit.result);
    }
  }

  const running = inflight.get(key);
  if (running) return running;

  const promise = (async (): Promise<FetchAdsLibraryResult> => {
    try {
      const res = await fetch("/api/ads/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          ...(options.skipCache ? { skipCache: true } : {}),
        }),
      });
      const json = (await res.json()) as AdsLibraryResponse | AdsLibraryPartialJson;
      const result: FetchAdsLibraryResult = { response: json, httpOk: res.ok };

      if (!options.skipCache) {
        const ttl = options.cacheTtlMs ?? cacheTtlFor(result);
        cache.set(key, { expires: Date.now() + ttl, result });
      }

      return result;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, promise);
  return promise;
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
