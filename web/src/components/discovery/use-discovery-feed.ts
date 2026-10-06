"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  DEFAULT_DISCOVERY_TOOLBAR,
  toolbarForTab,
  type DiscoveryFeedTab,
  type DiscoveryToolbarState,
} from "@/components/discovery/discovery-types";
import {
  buildDiscoveryFeedUrl,
  discoveryDayKey,
  discoveryFeedCacheKey,
  discoveryShuffleCacheKey,
  sanitizeDiscoveryAds,
  type DiscoveryFeedPageCache,
  validateDiscoveryFeedCache,
} from "@/lib/discovery/discovery-cache";
import { readValidCache, useScrapeKeyedCache, writeCache } from "@/lib/cache/use-scrape-keyed-cache";
import type { DiscoveryAdDto, DiscoveryFeedResult } from "@/lib/discovery/types";

function readShuffleSeed(brandId: string, day: string): string | null {
  const key = discoveryShuffleCacheKey(brandId, day);
  const cached = readValidCache<string>(key, true, (v) => typeof v === "string" && v.length > 0);
  return cached;
}

function writeShuffleSeed(brandId: string, day: string, seed: string): void {
  writeCache(discoveryShuffleCacheKey(brandId, day), seed, true);
}

function getOrCreateShuffleSeed(brandId: string | null, day: string): string {
  if (!brandId || brandId === "default") return `${brandId ?? "default"}:${day}`;
  if (typeof window === "undefined") return `${brandId}:${day}`;
  const existing = readShuffleSeed(brandId, day);
  if (existing) return existing;
  const seed = `${brandId}:${day}:${Date.now().toString(36)}`;
  writeShuffleSeed(brandId, day, seed);
  return seed;
}

async function fetchDiscoveryPage(
  brandId: string,
  toolbar: DiscoveryToolbarState,
  offset: number,
  shuffleSeed: string,
  search: string,
  allClientBrandIds: string[],
): Promise<DiscoveryFeedPageCache> {
  const res = await fetch(
    buildDiscoveryFeedUrl(brandId, toolbar, offset, shuffleSeed, search, undefined, allClientBrandIds),
    {
      credentials: "include",
    },
  );
  const json = (await res.json()) as DiscoveryFeedResult | { ok: false; error?: string };
  if (!res.ok || !("ads" in json)) {
    throw new Error(("error" in json && json.error) || "Failed to load discovery feed");
  }
  return {
    ads: sanitizeDiscoveryAds(json.ads),
    total: json.total,
    has_more: json.has_more,
    competitors: json.competitors,
    platform_counts: json.platform_counts,
    market_stats: json.market_stats,
    shuffle_seed: json.shuffle_seed,
    offset: offset + json.ads.length,
  };
}

function toolbarForBrand(prev: DiscoveryToolbarState, brandId: string | null): DiscoveryToolbarState {
  if (!brandId || brandId === "default") return prev;
  return { ...prev, selectedClientBrandIds: new Set([brandId]), selectedCompetitorIds: new Set() };
}

/**
 * `ready` stays false until the brand list has loaded: before that the layout reports the `_workspace`
 * placeholder, and its feed request raced the real brand's (Explore could settle on "0 ads").
 */
export function useDiscoveryFeed(
  brandId: string | null,
  allClientBrandIds: string[] = [],
  ready = true,
  initialTab: DiscoveryFeedTab = "explore",
) {
  const day = discoveryDayKey();
  const enabled = ready && Boolean(brandId && brandId !== "default");

  const [tab, setTab] = useState<DiscoveryFeedTab>(initialTab);
  const [toolbar, setToolbar] = useState<DiscoveryToolbarState>(() =>
    toolbarForBrand({ ...DEFAULT_DISCOVERY_TOOLBAR, ...toolbarForTab(initialTab) }, brandId),
  );
  const [searchDebounced, setSearchDebounced] = useState("");

  /** Brand switches reset the brand filter in the same render, so no request goes out with the old one. */
  const [toolbarBrandId, setToolbarBrandId] = useState(brandId);
  if (toolbarBrandId !== brandId) {
    setToolbarBrandId(brandId);
    setToolbar((prev) => toolbarForBrand(prev, brandId));
  }

  /** Set by Reshuffle; otherwise the brand's stored seed for today. */
  const [reshuffledSeed, setReshuffledSeed] = useState<{ brandId: string; day: string; seed: string } | null>(null);
  const shuffleSeed = useMemo(() => {
    if (reshuffledSeed && reshuffledSeed.brandId === brandId && reshuffledSeed.day === day) return reshuffledSeed.seed;
    return getOrCreateShuffleSeed(brandId, day);
  }, [brandId, day, reshuffledSeed]);

  useEffect(() => {
    const t = window.setTimeout(() => setSearchDebounced(toolbar.search.trim()), 250);
    return () => window.clearTimeout(t);
  }, [toolbar.search]);

  const queryCacheKey = useMemo(() => {
    if (!enabled || !brandId) return "";
    return discoveryFeedCacheKey(brandId, toolbar, searchDebounced, shuffleSeed, day);
  }, [brandId, day, enabled, searchDebounced, shuffleSeed, toolbar]);

  const {
    data: firstPage,
    loading,
    error,
    cacheHit,
  } = useScrapeKeyedCache<DiscoveryFeedPageCache>({
    cacheKey: queryCacheKey,
    enabled: enabled && Boolean(queryCacheKey),
    validateCached: validateDiscoveryFeedCache,
    persistAcrossTabs: true,
    fetcher: async () => {
      if (!brandId) throw new Error("Missing brand");
      const page = await fetchDiscoveryPage(
        brandId,
        toolbar,
        0,
        shuffleSeed,
        searchDebounced,
        allClientBrandIds,
      );
      writeShuffleSeed(brandId, day, page.shuffle_seed || shuffleSeed);
      return page;
    },
  });

  const [extraAds, setExtraAds] = useState<DiscoveryAdDto[]>([]);
  const [extraHasMore, setExtraHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadMoreGen = useRef(0);

  useEffect(() => {
    setExtraAds([]);
    setExtraHasMore(false);
    setLoadingMore(false);
    loadMoreGen.current += 1;
  }, [queryCacheKey]);

  const ads = useMemo(() => {
    const base = sanitizeDiscoveryAds(firstPage?.ads ?? []);
    if (extraAds.length === 0) return base;
    return [...base, ...sanitizeDiscoveryAds(extraAds)];
  }, [extraAds, firstPage?.ads]);

  const total = firstPage?.total ?? 0;
  const competitors = firstPage?.competitors ?? [];
  const platformCounts = firstPage?.platform_counts ?? {};
  const marketStats = firstPage?.market_stats ?? null;
  const hasMore = extraAds.length > 0 ? extraHasMore : (firstPage?.has_more ?? false);
  const offset = (firstPage?.offset ?? firstPage?.ads.length ?? 0) + extraAds.length;

  const patchToolbar = useCallback((patch: Partial<DiscoveryToolbarState>) => {
    setToolbar((prev) => ({ ...prev, ...patch }));
  }, []);

  const selectTab = useCallback((next: DiscoveryFeedTab) => {
    setTab(next);
    setToolbar((prev) => ({ ...prev, ...toolbarForTab(next) }));
  }, []);

  const reshuffle = useCallback(() => {
    if (!brandId) return;
    const next = `${brandId}:${day}:${Date.now().toString(36)}`;
    writeShuffleSeed(brandId, day, next);
    setReshuffledSeed({ brandId, day, seed: next });
    patchToolbar({ sort: "shuffle" });
    setTab("explore");
  }, [brandId, day, patchToolbar]);

  const loadMore = useCallback(async () => {
    if (!brandId || !hasMore || loading || loadingMore) return;
    const gen = ++loadMoreGen.current;
    setLoadingMore(true);
    try {
      const page = await fetchDiscoveryPage(
        brandId,
        toolbar,
        offset,
        shuffleSeed,
        searchDebounced,
        allClientBrandIds,
      );
      if (gen !== loadMoreGen.current) return;
      setExtraAds((prev) => [...prev, ...page.ads]);
      setExtraHasMore(page.has_more);
    } catch {
      if (gen !== loadMoreGen.current) return;
      setExtraHasMore(false);
    } finally {
      if (gen === loadMoreGen.current) setLoadingMore(false);
    }
  }, [brandId, hasMore, loading, loadingMore, offset, searchDebounced, shuffleSeed, toolbar, allClientBrandIds]);

  return {
    tab,
    selectTab,
    toolbar,
    patchToolbar,
    ads,
    total,
    competitors,
    platformCounts,
    marketStats,
    loading: loading && !cacheHit,
    loadingMore,
    error: error?.message ?? null,
    hasMore,
    reshuffle,
    loadMore,
    feedKey: queryCacheKey,
  };
}
