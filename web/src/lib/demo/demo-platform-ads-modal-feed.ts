"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { PlatformAdsToolbarState } from "@/components/ads-library/platform-ads-modal-types";
import { PLATFORM_ADS_MODAL_BATCH_SIZE } from "@/lib/ad-library/constants";
import type { PlatformAdsDatePreset, PlatformAdsSort } from "@/lib/ad-library/platform-ads-page";
import type { DemoAd, DemoPlatform } from "@/lib/demo/dashboard-demo-data";

const DEMO_AD_COPY_SUFFIX = /~c\d+$/;

export function resolveDemoAdSource(ad: DemoAd): DemoAd {
  const baseId = ad.id.replace(DEMO_AD_COPY_SUFFIX, "");
  return { ...ad, id: baseId };
}

function demoAdStartedAtMs(ad: DemoAd, nowMs: number): number {
  return nowMs - ad.activeDays * 86_400_000;
}

function demoAdLifespanMs(ad: DemoAd): number {
  return (ad.lifespanDays ?? ad.activeDays) * 86_400_000;
}

function datePresetWindow(preset: PlatformAdsDatePreset, nowMs: number): { start: number; end: number } | null {
  if (preset === "all") return null;
  if (preset === "custom") return null;
  const days = preset === "7d" ? 7 : preset === "14d" ? 14 : preset === "30d" ? 30 : preset === "90d" ? 90 : 365;
  return { start: nowMs - days * 86_400_000, end: nowMs };
}

function expandDemoPlatformAds(baseAds: DemoAd[], targetTotal: number): DemoAd[] {
  if (baseAds.length === 0) return [];
  const sorted = [...baseAds].sort((a, b) => b.activeDays - a.activeDays);
  const result: DemoAd[] = [];
  for (let i = 0; i < targetTotal; i++) {
    const base = sorted[i % sorted.length]!;
    if (i < sorted.length) {
      result.push(base);
      continue;
    }
    result.push({
      ...base,
      id: `${base.id}~c${i}`,
      activeDays: Math.max(1, base.activeDays - (i % 28)),
      lifespanDays: Math.max(base.activeDays, (base.lifespanDays ?? base.activeDays) + (i % 12)),
    });
  }
  return result;
}

function filterDemoAds(ads: DemoAd[], toolbar: PlatformAdsToolbarState, nowMs: number): DemoAd[] {
  let window =
    toolbar.datePreset === "custom" && toolbar.customRangeStart != null && toolbar.customRangeEnd != null
      ? { start: toolbar.customRangeStart, end: toolbar.customRangeEnd }
      : datePresetWindow(toolbar.datePreset, nowMs);

  if (!window) return ads;

  return ads.filter((ad) => {
    const start = demoAdStartedAtMs(ad, nowMs);
    const end = nowMs;
    return end >= window!.start && start <= window!.end;
  });
}

function groupDemoDuplicates(ads: DemoAd[]): DemoAd[] {
  const seen = new Map<string, DemoAd>();
  for (const ad of ads) {
    const key = `${ad.headline}::${ad.body}`;
    const existing = seen.get(key);
    if (!existing || ad.activeDays > existing.activeDays) {
      seen.set(key, ad);
    }
  }
  return [...seen.values()];
}

function sortDemoAds(ads: DemoAd[], sort: PlatformAdsSort, nowMs: number): DemoAd[] {
  const withSpan = ads.map((ad) => ({
    ad,
    startMs: demoAdStartedAtMs(ad, nowMs),
    lifespanMs: demoAdLifespanMs(ad),
  }));
  switch (sort) {
    case "oldest":
      return withSpan.sort((a, b) => a.startMs - b.startMs).map((x) => x.ad);
    case "longest_running":
      return withSpan.sort((a, b) => b.lifespanMs - a.lifespanMs).map((x) => x.ad);
    case "impressions":
    case "ultimate_winner":
      return [...ads].sort((a, b) => b.activeDays - a.activeDays);
    case "newest":
    default:
      return withSpan.sort((a, b) => b.startMs - a.startMs).map((x) => x.ad);
  }
}

function toolbarQueryKey(toolbar: PlatformAdsToolbarState): string {
  return JSON.stringify({
    datePreset: toolbar.datePreset,
    customRangeStart: toolbar.customRangeStart,
    customRangeEnd: toolbar.customRangeEnd,
    sort: toolbar.sort,
    groupDuplicates: toolbar.groupDuplicates,
  });
}

export function useDemoPlatformAdsModalFeed({
  open,
  platform,
  baseAds,
  displayTotal,
  toolbar,
}: {
  open: boolean;
  platform: DemoPlatform;
  baseAds: DemoAd[];
  displayTotal: number;
  toolbar: PlatformAdsToolbarState;
}) {
  const [visibleCount, setVisibleCount] = useState(PLATFORM_ADS_MODAL_BATCH_SIZE);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadGenRef = useRef(0);

  const toolbarKey = useMemo(() => toolbarQueryKey(toolbar), [toolbar]);
  const nowMs = useMemo(() => Date.now(), [open, toolbarKey, platform]);

  const expandedAds = useMemo(
    () => expandDemoPlatformAds(baseAds.filter((ad) => ad.platform === platform), displayTotal),
    [baseAds, displayTotal, platform],
  );

  const filteredSorted = useMemo(() => {
    let ads = filterDemoAds(expandedAds, toolbar, nowMs);
    if (toolbar.groupDuplicates) {
      ads = groupDemoDuplicates(ads);
    }
    return sortDemoAds(ads, toolbar.sort, nowMs);
  }, [expandedAds, nowMs, toolbar]);

  const dateRange = useMemo(() => {
    if (expandedAds.length === 0) return null;
    const starts = expandedAds.map((ad) => demoAdStartedAtMs(ad, nowMs));
    return {
      earliest: new Date(Math.min(...starts)).toISOString(),
      latest: new Date(nowMs).toISOString(),
    };
  }, [expandedAds, nowMs]);

  useEffect(() => {
    if (!open) {
      loadGenRef.current += 1;
      setVisibleCount(PLATFORM_ADS_MODAL_BATCH_SIZE);
      setLoading(false);
      setLoadingMore(false);
      return;
    }

    loadGenRef.current += 1;
    const gen = loadGenRef.current;
    setVisibleCount(PLATFORM_ADS_MODAL_BATCH_SIZE);
    setLoading(true);
    const timer = window.setTimeout(() => {
      if (gen !== loadGenRef.current) return;
      setLoading(false);
    }, 120);
    return () => window.clearTimeout(timer);
  }, [open, platform, toolbarKey]);

  const visibleAds = useMemo(
    () => filteredSorted.slice(0, visibleCount),
    [filteredSorted, visibleCount],
  );

  const hasMore = visibleCount < filteredSorted.length;

  const loadMore = useCallback(() => {
    if (!hasMore || loading || loadingMore) return;
    setLoadingMore(true);
    window.setTimeout(() => {
      setVisibleCount((count) => Math.min(count + PLATFORM_ADS_MODAL_BATCH_SIZE, filteredSorted.length));
      setLoadingMore(false);
    }, 180);
  }, [filteredSorted.length, hasMore, loading, loadingMore]);

  const retry = useCallback(() => {
    setVisibleCount(PLATFORM_ADS_MODAL_BATCH_SIZE);
  }, []);

  return {
    ads: visibleAds,
    total: filteredSorted.length,
    hasMore,
    loading,
    loadingMore,
    error: null as string | null,
    dateRange,
    metaScrapeAtMs: null as number | null,
    loadMore,
    retry,
  };
}
