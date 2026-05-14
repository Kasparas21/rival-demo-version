"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

export const SESSION_PREFIX = "rival:cache:";

export function readCache<T>(key: string, useLocal: boolean): T | null {
  if (typeof window === "undefined") return null;
  try {
    const storage = useLocal ? localStorage : sessionStorage;
    const raw = storage.getItem(SESSION_PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeCache<T>(key: string, data: T, useLocal: boolean): void {
  if (typeof window === "undefined") return;
  try {
    const storage = useLocal ? localStorage : sessionStorage;
    storage.setItem(SESSION_PREFIX + key, JSON.stringify(data));
  } catch {
    // Quota or private mode — fail silently; next visit refetches.
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
  persistAcrossTabs?: boolean;
  invalidationGroup?: string;
};

export function useScrapeKeyedCache<T>(
  opts: UseScrapeKeyedCacheOptions<T>
): CacheState<T> & { refetch: (opts?: { force?: boolean }) => Promise<void>; invalidate: () => void } {
  const { cacheKey, fetcher, enabled = true, validateCached, persistAcrossTabs = false } = opts;
  const useLocal = persistAcrossTabs;

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const validateRef = useRef(validateCached);
  validateRef.current = validateCached;

  const [state, setState] = useState<CacheState<T>>(() => ({
    data: null,
    loading: enabled,
    isValidating: false,
    error: null,
    cacheHit: false,
  }));

  const inFlightRef = useRef<Promise<void> | null>(null);

  const runFetch = useCallback(
    async (mode: { reason: "initial-miss" | "refetch"; force?: boolean }) => {
      if (!enabled) return;
      if (inFlightRef.current) {
        await inFlightRef.current;
        return;
      }

      const run = (async () => {
        setState((s) => ({
          ...s,
          isValidating: s.data != null,
          loading: s.data == null,
          error: null,
        }));

        try {
          const fresh = await fetcherRef.current({ force: mode.force === true });
          writeCache(cacheKey, fresh, useLocal);
          setState({
            data: fresh,
            loading: false,
            isValidating: false,
            error: null,
            cacheHit: false,
          });
        } catch (err) {
          const e = err instanceof Error ? err : new Error(String(err));
          setState((s) => ({
            ...s,
            loading: false,
            isValidating: false,
            error: e,
          }));
        }
      })();

      inFlightRef.current = run;
      try {
        await run;
      } finally {
        inFlightRef.current = null;
      }
    },
    [cacheKey, enabled, useLocal]
  );

  useLayoutEffect(() => {
    if (!enabled) {
      setState({ data: null, loading: false, isValidating: false, error: null, cacheHit: false });
      return;
    }

    const cached = readCache<T>(cacheKey, useLocal);
    const valid = cached != null && (!validateRef.current || validateRef.current(cached));

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
      });
    } else {
      setState({
        data: null,
        loading: true,
        isValidating: false,
        error: null,
        cacheHit: false,
      });
    }
  }, [cacheKey, enabled, useLocal]);

  useEffect(() => {
    if (!enabled) return;

    const cached = readCache<T>(cacheKey, useLocal);
    const valid = cached != null && (!validateRef.current || validateRef.current(cached));
    if (valid) return;

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
    }));
  }, [cacheKey, useLocal, enabled]);

  return { ...state, refetch, invalidate };
}
