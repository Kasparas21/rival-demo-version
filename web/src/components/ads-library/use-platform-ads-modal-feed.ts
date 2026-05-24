"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { AdsLibraryPlatform } from "@/lib/ad-library/ads-library-platform";
import { PLATFORM_ADS_MODAL_BATCH_SIZE } from "@/lib/ad-library/constants";

import {
  type PlatformAdsFeedResponse,
  type PlatformAdsToolbarState,
} from "@/components/ads-library/platform-ads-modal-types";

function toolbarQueryKey(toolbar: PlatformAdsToolbarState): string {
  return JSON.stringify({
    datePreset: toolbar.datePreset,
    customRangeStart: toolbar.customRangeStart,
    customRangeEnd: toolbar.customRangeEnd,
    sort: toolbar.sort,
    groupDuplicates: toolbar.groupDuplicates,
  });
}

export function usePlatformAdsModalFeed({
  open,
  domain,
  platform,
  toolbar,
}: {
  open: boolean;
  domain: string;
  platform: AdsLibraryPlatform;
  toolbar: PlatformAdsToolbarState;
}) {
  const [ads, setAds] = useState<unknown[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ earliest: string; latest: string } | null>(null);
  const [metaScrapeAtMs, setMetaScrapeAtMs] = useState<number | null>(null);

  const offsetRef = useRef(0);
  const inFlightRef = useRef(false);
  const endReachedRef = useRef(false);

  const toolbarKey = useMemo(() => toolbarQueryKey(toolbar), [toolbar]);
  const fetchGenRef = useRef(0);

  const buildUrl = useCallback(
    (offset: number) => {
      const params = new URLSearchParams({
        domain: domain.trim(),
        platform,
        offset: String(offset),
        limit: String(PLATFORM_ADS_MODAL_BATCH_SIZE),
        sort: toolbar.sort,
        datePreset: toolbar.datePreset,
        groupDuplicates: toolbar.groupDuplicates ? "1" : "0",
      });
      if (toolbar.datePreset === "custom" && toolbar.customRangeStart != null && toolbar.customRangeEnd != null) {
        params.set("customStartMs", String(toolbar.customRangeStart));
        params.set("customEndMs", String(toolbar.customRangeEnd));
      }
      return `/api/competitor/ads-library/platform-ads?${params.toString()}`;
    },
    [domain, platform, toolbar],
  );

  const fetchBatch = useCallback(
    async (offset: number, append: boolean, gen: number) => {
      if (!domain.trim() || inFlightRef.current) return;
      if (append && endReachedRef.current) return;

      inFlightRef.current = true;
      if (append) setLoadingMore(true);
      else setLoading(true);
      if (!append) setError(null);

      try {
        const res = await fetch(buildUrl(offset), { credentials: "include" });
        const json = (await res.json()) as PlatformAdsFeedResponse | { ok: false; error?: string };
        if (gen !== fetchGenRef.current) return;
        if (!res.ok || json.ok !== true) {
          throw new Error(json.ok === false ? json.error ?? "Failed to load ads" : "Failed to load ads");
        }

        setTotal(json.total);
        setHasMore(json.hasMore);
        setDateRange(json.dateRange);
        setMetaScrapeAtMs(json.metaScrapeAtMs);
        endReachedRef.current = !json.hasMore;
        offsetRef.current = offset + json.ads.length;

        setAds((prev) => (append ? [...prev, ...json.ads] : json.ads));
      } catch (e) {
        if (gen !== fetchGenRef.current) return;
        setError(e instanceof Error ? e.message : "Failed to load ads");
        if (!append) {
          setAds([]);
          setTotal(0);
          setHasMore(false);
        }
      } finally {
        if (gen === fetchGenRef.current) {
          inFlightRef.current = false;
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [buildUrl, domain],
  );

  useEffect(() => {
    if (!open || !domain.trim()) return;

    fetchGenRef.current += 1;
    const gen = fetchGenRef.current;
    offsetRef.current = 0;
    endReachedRef.current = false;
    inFlightRef.current = false;
    setAds([]);
    setTotal(0);
    setHasMore(false);
    void fetchBatch(0, false, gen);
  }, [open, domain, platform, toolbarKey, fetchBatch]);

  useEffect(() => {
    if (!open) {
      fetchGenRef.current += 1;
      setAds([]);
      setTotal(0);
      setHasMore(false);
      setError(null);
      setDateRange(null);
      setMetaScrapeAtMs(null);
      offsetRef.current = 0;
      endReachedRef.current = false;
      inFlightRef.current = false;
    }
  }, [open]);

  const loadMore = useCallback(() => {
    if (!hasMore || loading || loadingMore || inFlightRef.current || endReachedRef.current) return;
    void fetchBatch(offsetRef.current, true, fetchGenRef.current);
  }, [fetchBatch, hasMore, loading, loadingMore]);

  const retry = useCallback(() => {
    fetchGenRef.current += 1;
    const gen = fetchGenRef.current;
    offsetRef.current = 0;
    endReachedRef.current = false;
    inFlightRef.current = false;
    setAds([]);
    void fetchBatch(0, false, gen);
  }, [fetchBatch]);

  return {
    ads,
    total,
    hasMore,
    loading,
    loadingMore,
    error,
    dateRange,
    metaScrapeAtMs,
    loadMore,
    retry,
  };
}
