"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  mirrorToLocalStorageIfSmall,
  safeSetSessionStorage,
} from "@/lib/cache/storage-quota";

export const SESSION_PREFIX = "rival:cache:";

export function readCache<T>(key: string, useLocal: boolean): T | null {
  if (typeof window === "undefined") return null;
  const fullKey = SESSION_PREFIX + key;
  try {
    if (useLocal) {
      const fromSession = sessionStorage.getItem(fullKey);
      if (fromSession) return JSON.parse(fromSession) as T;
      const fromLocal = localStorage.getItem(fullKey);
      if (fromLocal) return JSON.parse(fromLocal) as T;
      return null;
    }
    const raw = sessionStorage.getItem(fullKey);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeCache<T>(key: string, data: T, useLocal: boolean): void {
  if (typeof window === "undefined") return;
  const fullKey = SESSION_PREFIX + key;
  try {
    const serialized = JSON.stringify(data);
    safeSetSessionStorage(fullKey, serialized);
    if (useLocal) {
      mirrorToLocalStorageIfSmall(fullKey, serialized);
    }
  } catch {
    // Fail silently; next visit refetches.
  }
}

export function deleteCache(key: string, useLocal: boolean): void {
  if (typeof window === "undefined") return;
  try {
    const storage = useLocal ? localStorage : sessionStorage;
    storage.removeItem(SESSION_PREFIX + key);
  } catch {
    /* ignore */
  }
}

export function readValidCache<T>(
  cacheKey: string,
  useLocal: boolean,
  validateCached?: (cached: T) => boolean
): T | null {
  const cached = readCache<T>(cacheKey, useLocal);
  if (cached == null) return null;
  if (validateCached && !validateCached(cached)) return null;
  return cached;
}

export type CacheState<T> = {
  data: T | null;
  loading: boolean;
  isValidating: boolean;
  error: Error | null;
  cacheHit: boolean;
  lastFetchedAt: number | null;
};

export type UseScrapeKeyedCacheOptions<T> = {
  /** Logical key after `rival:cache:` — should start with normalized domain (e.g. `brand.com:feature:…`) for scrape invalidation. */
  cacheKey: string;
  fetcher: (opts?: { force?: boolean }) => Promise<T>;
  enabled?: boolean;
  validateCached?: (cached: T) => boolean;
  /** When true (default), persist in localStorage so switching competitors reuses prior results instantly. */
  persistAcrossTabs?: boolean;
  invalidationGroup?: string;
};

type InternalCacheState<T> = CacheState<T> & { boundKey: string | null };

function initialCacheState<T>(enabled: boolean, cacheKey: string): InternalCacheState<T> {
  if (!enabled) {
    return {
      data: null,
      loading: false,
      isValidating: false,
      error: null,
      cacheHit: false,
      lastFetchedAt: null,
      boundKey: null,
    };
  }
  /** Always match SSR first paint — client cache is applied in `useLayoutEffect` before paint. */
  return {
    data: null,
    loading: true,
    isValidating: false,
    error: null,
    cacheHit: false,
    lastFetchedAt: null,
    boundKey: cacheKey,
  };
}

function resolveCacheState<T>(enabled: boolean, cacheKey: string, state: InternalCacheState<T>): CacheState<T> {
  if (!enabled) {
    if (state.boundKey === cacheKey && state.data != null) {
      return {
        data: state.data,
        loading: false,
        isValidating: false,
        error: state.error,
        cacheHit: state.cacheHit,
        lastFetchedAt: state.lastFetchedAt,
      };
    }
    return {
      data: null,
      loading: false,
      isValidating: false,
      error: null,
      cacheHit: false,
      lastFetchedAt: null,
    };
  }
  if (state.boundKey !== cacheKey) {
    return {
      data: null,
      loading: true,
      isValidating: false,
      error: null,
      cacheHit: false,
      lastFetchedAt: null,
    };
  }
  return {
    data: state.data,
    loading: state.loading,
    isValidating: state.isValidating,
    error: state.error,
    cacheHit: state.cacheHit,
    lastFetchedAt: state.lastFetchedAt,
  };
}

export function useScrapeKeyedCache<T>(
  opts: UseScrapeKeyedCacheOptions<T>
): CacheState<T> & {
  refetch: (opts?: { force?: boolean }) => Promise<void>;
  refetchIfStale: (maxAgeMs?: number) => Promise<void>;
  invalidate: () => void;
} {
  const { cacheKey, fetcher, enabled = true, validateCached, persistAcrossTabs = true } = opts;
  const useLocal = persistAcrossTabs;

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const validateRef = useRef(validateCached);
  validateRef.current = validateCached;

  const [state, setState] = useState<InternalCacheState<T>>(() => initialCacheState(enabled, cacheKey));

  const inFlightRef = useRef<Promise<void> | null>(null);
  const fetchGenRef = useRef(0);
  const stateRef = useRef(state);
  stateRef.current = state;

  const runFetch = useCallback(
    async (mode: { reason: "initial-miss" | "refetch" | "stale"; force?: boolean }) => {
      if (!enabled) return;
      const gen = fetchGenRef.current;

      if (inFlightRef.current) {
        await inFlightRef.current;
        if (fetchGenRef.current !== gen) return;
      }

      const run = (async () => {
        if (fetchGenRef.current !== gen) return;

        setState((s) => {
          if (s.boundKey !== cacheKey) return s;
          return {
            ...s,
            isValidating: s.data != null,
            loading: s.data == null,
            error: null,
          };
        });

        try {
          const fresh = await fetcherRef.current({ force: mode.force === true });
          if (fetchGenRef.current !== gen) return;

          const now = Date.now();
          writeCache(cacheKey, fresh, useLocal);
          setState({
            data: fresh,
            loading: false,
            isValidating: false,
            error: null,
            cacheHit: false,
            lastFetchedAt: now,
            boundKey: cacheKey,
          });
        } catch (err) {
          if (fetchGenRef.current !== gen) return;
          const e = err instanceof Error ? err : new Error(String(err));
          setState((s) => {
            if (s.boundKey !== cacheKey) return s;
            return {
              ...s,
              loading: false,
              isValidating: false,
              error: e,
            };
          });
        }
      })();

      inFlightRef.current = run;
      try {
        await run;
      } finally {
        if (inFlightRef.current === run) {
          inFlightRef.current = null;
        }
      }
    },
    [cacheKey, enabled, useLocal]
  );

  useLayoutEffect(() => {
    if (!enabled) {
      return;
    }

    const current = stateRef.current;
    if (current.boundKey === cacheKey && current.data != null) {
      return;
    }

    fetchGenRef.current += 1;
    inFlightRef.current = null;

    const cached = readValidCache<T>(cacheKey, useLocal, validateRef.current);
    const valid = cached != null;

    if (process.env.NODE_ENV === "development") {
      console.log(`[scrape-cache] ${valid ? "HIT" : "MISS"}: ${cacheKey}`);
    }

    if (valid) {
      setState({
        data: cached,
        loading: false,
        isValidating: false,
        error: null,
        cacheHit: true,
        lastFetchedAt: Date.now(),
        boundKey: cacheKey,
      });
    } else {
      setState({
        data: null,
        loading: true,
        isValidating: false,
        error: null,
        cacheHit: false,
        lastFetchedAt: null,
        boundKey: cacheKey,
      });
    }
  }, [cacheKey, enabled, useLocal]);

  useEffect(() => {
    if (!enabled) return;

    const current = stateRef.current;
    if (current.boundKey === cacheKey && current.data != null) {
      return;
    }

    const cached = readValidCache<T>(cacheKey, useLocal, validateRef.current);
    if (cached != null) return;

    void runFetch({ reason: "initial-miss", force: false });
  }, [cacheKey, enabled, useLocal, runFetch]);

  const refetch = useCallback(
    async (refetchOpts?: { force?: boolean }) => {
      deleteCache(cacheKey, useLocal);
      await runFetch({ reason: "refetch", force: refetchOpts?.force === true });
    },
    [cacheKey, useLocal, runFetch]
  );

  const refetchIfStale = useCallback(
    async (maxAgeMs = 5 * 60 * 1000) => {
      if (!enabled) return;
      const current = stateRef.current;
      if (current.boundKey !== cacheKey) {
        await runFetch({ reason: "initial-miss", force: false });
        return;
      }
      if (current.data == null) {
        await runFetch({ reason: "initial-miss", force: false });
        return;
      }
      const age = current.lastFetchedAt != null ? Date.now() - current.lastFetchedAt : Infinity;
      if (age < maxAgeMs) return;
      await runFetch({ reason: "stale", force: false });
    },
    [cacheKey, enabled, runFetch]
  );

  const invalidate = useCallback(() => {
    deleteCache(cacheKey, useLocal);
    setState((s) => ({
      ...s,
      cacheHit: false,
      data: null,
      loading: enabled,
      lastFetchedAt: null,
      boundKey: cacheKey,
    }));
  }, [cacheKey, useLocal, enabled]);

  const resolved = resolveCacheState(enabled, cacheKey, state);

  return { ...resolved, refetch, refetchIfStale, invalidate };
}

/** Warm session/local cache before a tab mounts — skips network if cache is already valid. */
export async function prefetchScrapeKeyedCache<T>(opts: {
  cacheKey: string;
  fetcher: () => Promise<T>;
  validateCached?: (cached: T) => boolean;
  persistAcrossTabs?: boolean;
}): Promise<void> {
  if (typeof window === "undefined") return;
  const useLocal = opts.persistAcrossTabs ?? true;
  const existing = readValidCache<T>(opts.cacheKey, useLocal, opts.validateCached);
  if (existing != null) return;
  try {
    const fresh = await opts.fetcher();
    if (opts.validateCached && !opts.validateCached(fresh)) return;
    writeCache(opts.cacheKey, fresh, useLocal);
  } catch {
    /* prefetch is best-effort */
  }
}
