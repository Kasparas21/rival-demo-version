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

function initialCacheState<T>(
  enabled: boolean,
  cacheKey: string,
  useLocal: boolean,
  validateCached?: (cached: T) => boolean
): InternalCacheState<T> {
  if (!enabled) {
    return { data: null, loading: false, isValidating: false, error: null, cacheHit: false, boundKey: null };
  }
  const cached = readValidCache<T>(cacheKey, useLocal, validateCached);
  if (cached != null) {
    return {
      data: cached,
      loading: false,
      isValidating: false,
      error: null,
      cacheHit: true,
      boundKey: cacheKey,
    };
  }
  return {
    data: null,
    loading: true,
    isValidating: false,
    error: null,
    cacheHit: false,
    boundKey: cacheKey,
  };
}

function resolveCacheState<T>(enabled: boolean, cacheKey: string, state: InternalCacheState<T>): CacheState<T> {
  if (!enabled) {
    return { data: null, loading: false, isValidating: false, error: null, cacheHit: false };
  }
  if (state.boundKey !== cacheKey) {
    return { data: null, loading: true, isValidating: false, error: null, cacheHit: false };
  }
  return {
    data: state.data,
    loading: state.loading,
    isValidating: state.isValidating,
    error: state.error,
    cacheHit: state.cacheHit,
  };
}

export function useScrapeKeyedCache<T>(
  opts: UseScrapeKeyedCacheOptions<T>
): CacheState<T> & { refetch: (opts?: { force?: boolean }) => Promise<void>; invalidate: () => void } {
  const { cacheKey, fetcher, enabled = true, validateCached, persistAcrossTabs = true } = opts;
  const useLocal = persistAcrossTabs;

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const validateRef = useRef(validateCached);
  validateRef.current = validateCached;

  const [state, setState] = useState<InternalCacheState<T>>(() =>
    initialCacheState(enabled, cacheKey, useLocal, validateCached)
  );

  const inFlightRef = useRef<Promise<void> | null>(null);
  const fetchGenRef = useRef(0);

  const runFetch = useCallback(
    async (mode: { reason: "initial-miss" | "refetch"; force?: boolean }) => {
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

          writeCache(cacheKey, fresh, useLocal);
          setState({
            data: fresh,
            loading: false,
            isValidating: false,
            error: null,
            cacheHit: false,
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
    fetchGenRef.current += 1;
    inFlightRef.current = null;

    if (!enabled) {
      setState({
        data: null,
        loading: false,
        isValidating: false,
        error: null,
        cacheHit: false,
        boundKey: null,
      });
      return;
    }

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
        boundKey: cacheKey,
      });
    } else {
      setState({
        data: null,
        loading: true,
        isValidating: false,
        error: null,
        cacheHit: false,
        boundKey: cacheKey,
      });
    }
  }, [cacheKey, enabled, useLocal]);

  useEffect(() => {
    if (!enabled) return;

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

  const invalidate = useCallback(() => {
    deleteCache(cacheKey, useLocal);
    setState((s) => ({
      ...s,
      cacheHit: false,
      data: null,
      loading: enabled,
      boundKey: cacheKey,
    }));
  }, [cacheKey, useLocal, enabled]);

  const resolved = resolveCacheState(enabled, cacheKey, state);

  return { ...resolved, refetch, invalidate };
}
