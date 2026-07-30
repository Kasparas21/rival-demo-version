"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  resolveDiscoveryClientBrandIds,
  type DiscoveryToolbarState,
} from "@/components/discovery/discovery-types";
import { useScrapeKeyedCache } from "@/lib/cache/use-scrape-keyed-cache";
import type {
  DiscoveryCompetitorChip,
  DiscoveryLandingPageChangeDto,
  DiscoveryLandingPageChangeFilter,
  DiscoveryLandingPagesResult,
} from "@/lib/discovery/types";

type PageCache = {
  changes: DiscoveryLandingPageChangeDto[];
  total: number;
  has_more: boolean;
  competitors: DiscoveryCompetitorChip[];
  filter_counts: Record<DiscoveryLandingPageChangeFilter, number>;
  offset: number;
};

function buildLandingPagesUrl(
  brandId: string,
  toolbar: DiscoveryToolbarState,
  offset: number,
  search: string,
  allClientBrandIds: string[],
): string {
  const params = new URLSearchParams();
  params.set("brandId", brandId);
  params.set("offset", String(offset));
  params.set("limit", "12");
  params.set("sort", toolbar.landingPageSort);
  params.set("datePreset", toolbar.datePreset);
  params.set("changeFilter", toolbar.changeFilter);
  if (search) params.set("q", search);

  const clientIds = resolveDiscoveryClientBrandIds(
    toolbar.selectedClientBrandIds,
    brandId,
    allClientBrandIds.map((id) => ({ id })),
  );
  for (const id of clientIds) params.append("clientBrand", id);

  return `/api/discovery/landing-pages?${params.toString()}`;
}

function landingPagesCacheKey(
  brandId: string,
  toolbar: DiscoveryToolbarState,
  search: string,
  competitorKey: string,
): string {
  const clientIds = [...toolbar.selectedClientBrandIds].sort().join(",");
  const competitorIds = [...toolbar.selectedCompetitorIds].sort().join(",");
  return [
    "discovery-landing-pages",
    brandId,
    toolbar.datePreset,
    toolbar.landingPageSort,
    toolbar.changeFilter,
    search,
    clientIds,
    competitorIds,
    competitorKey,
  ].join("|");
}

async function fetchLandingPagesPage(
  brandId: string,
  toolbar: DiscoveryToolbarState,
  offset: number,
  search: string,
  allClientBrandIds: string[],
): Promise<PageCache> {
  const base = buildLandingPagesUrl(brandId, toolbar, offset, search, allClientBrandIds);
  const url = new URL(base, typeof window !== "undefined" ? window.location.origin : "http://localhost");

  for (const id of toolbar.selectedCompetitorIds) {
    url.searchParams.append("competitorId", id);
  }

  const res = await fetch(url.pathname + url.search, { credentials: "include" });
  const json = (await res.json()) as DiscoveryLandingPagesResult | { ok: false; error?: string };
  if (!res.ok || !("changes" in json)) {
    throw new Error(("error" in json && json.error) || "Failed to load landing page changes");
  }

  return {
    changes: json.changes,
    total: json.total,
    has_more: json.has_more,
    competitors: json.competitors,
    filter_counts: json.filter_counts,
    offset: offset + json.changes.length,
  };
}

export function useDiscoveryLandingPages(
  brandId: string | null,
  toolbar: DiscoveryToolbarState,
  allClientBrandIds: string[],
) {
  const enabled = Boolean(brandId && brandId !== "default");
  const [searchDebounced, setSearchDebounced] = useState("");

  useEffect(() => {
    const t = window.setTimeout(() => setSearchDebounced(toolbar.search.trim()), 250);
    return () => window.clearTimeout(t);
  }, [toolbar.search]);

  const [competitors, setCompetitors] = useState<DiscoveryCompetitorChip[]>([]);
  const competitorKey = competitors.map((c) => c.id).join(",");

  const queryCacheKey = useMemo(() => {
    if (!enabled || !brandId) return "";
    return landingPagesCacheKey(brandId, toolbar, searchDebounced, competitorKey);
  }, [brandId, competitorKey, enabled, searchDebounced, toolbar]);

  const {
    data: firstPage,
    loading,
    error,
    refetch,
  } = useScrapeKeyedCache<PageCache>({
    cacheKey: queryCacheKey,
    enabled: enabled && Boolean(queryCacheKey),
    persistAcrossTabs: true,
    fetcher: async () => {
      if (!brandId) throw new Error("Missing brand");
      const page = await fetchLandingPagesPage(
        brandId,
        toolbar,
        0,
        searchDebounced,
        allClientBrandIds,
      );
      if (page.competitors.length > 0) {
        setCompetitors(page.competitors);
      }
      return page;
    },
  });

  useEffect(() => {
    if (firstPage?.competitors?.length) {
      setCompetitors(firstPage.competitors);
    }
  }, [firstPage?.competitors]);

  const [extraChanges, setExtraChanges] = useState<DiscoveryLandingPageChangeDto[]>([]);
  const [extraHasMore, setExtraHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadMoreGen = useRef(0);

  useEffect(() => {
    setExtraChanges([]);
    setExtraHasMore(false);
    setLoadingMore(false);
    loadMoreGen.current += 1;
  }, [queryCacheKey]);

  const changes = useMemo(() => {
    const base = firstPage?.changes ?? [];
    if (extraChanges.length === 0) return base;
    return [...base, ...extraChanges];
  }, [extraChanges, firstPage?.changes]);

  const total = firstPage?.total ?? 0;
  const hasMore = extraChanges.length > 0 ? extraHasMore : (firstPage?.has_more ?? false);
  const offset = (firstPage?.offset ?? firstPage?.changes.length ?? 0) + extraChanges.length;

  const loadMore = useCallback(async () => {
    if (!brandId || !hasMore || loading || loadingMore) return;
    const gen = ++loadMoreGen.current;
    setLoadingMore(true);
    try {
      const page = await fetchLandingPagesPage(
        brandId,
        toolbar,
        offset,
        searchDebounced,
        allClientBrandIds,
      );
      if (gen !== loadMoreGen.current) return;
      setExtraChanges((prev) => [...prev, ...page.changes]);
      setExtraHasMore(page.has_more);
    } catch {
      if (gen !== loadMoreGen.current) return;
      setExtraHasMore(false);
    } finally {
      if (gen === loadMoreGen.current) setLoadingMore(false);
    }
  }, [
    allClientBrandIds,
    brandId,
    hasMore,
    loading,
    loadingMore,
    offset,
    searchDebounced,
    toolbar,
  ]);

  const filterCounts = firstPage?.filter_counts ?? {
    all: 0,
    permanent: 0,
    ab_test: 0,
    unknown: 0,
  };

  return {
    changes,
    total,
    competitors,
    filterCounts,
    loading,
    loadingMore,
    error: error?.message ?? null,
    hasMore,
    loadMore,
    refetch,
  };
}
