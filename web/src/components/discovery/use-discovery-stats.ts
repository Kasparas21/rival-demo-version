"use client";

import { useCallback, useMemo } from "react";

import {
  resolveDiscoveryClientBrandIds,
  type DiscoveryToolbarState,
} from "@/components/discovery/discovery-types";
import { useScrapeKeyedCache } from "@/lib/cache/use-scrape-keyed-cache";
import type { DiscoveryStatsResult } from "@/lib/discovery/types";

function buildStatsUrl(
  brandId: string,
  toolbar: DiscoveryToolbarState,
  allClientBrandIds: string[],
): string {
  const params = new URLSearchParams();
  params.set("brandId", brandId);
  params.set("datePreset", toolbar.datePreset);
  params.set("format", toolbar.format);
  params.set("status", toolbar.status);
  if (toolbar.statsDateFrom) params.set("statsDateFrom", toolbar.statsDateFrom);
  if (toolbar.statsDateTo) params.set("statsDateTo", toolbar.statsDateTo);

  const clientIds = resolveDiscoveryClientBrandIds(
    toolbar.selectedClientBrandIds,
    brandId,
    allClientBrandIds.map((id) => ({ id })),
  );
  for (const id of clientIds) params.append("clientBrand", id);
  for (const id of toolbar.selectedCompetitorIds) params.append("competitorId", id);

  return `/api/discovery/stats?${params.toString()}`;
}

function statsCacheKey(
  brandId: string,
  toolbar: DiscoveryToolbarState,
  allClientBrandIds: string[],
): string {
  const clientIds = [...resolveDiscoveryClientBrandIds(
    toolbar.selectedClientBrandIds,
    brandId,
    allClientBrandIds.map((id) => ({ id })),
  )].sort().join(",");
  const competitorIds = [...toolbar.selectedCompetitorIds].sort().join(",");
  return [
    "discovery-stats:v3",
    brandId,
    toolbar.datePreset,
    toolbar.statsDateFrom ?? "",
    toolbar.statsDateTo ?? "",
    toolbar.format,
    toolbar.status,
    clientIds,
    competitorIds,
  ].join("|");
}

export function useDiscoveryStats(
  brandId: string | null,
  toolbar: DiscoveryToolbarState,
  allClientBrandIds: string[],
) {
  const enabled = Boolean(brandId && brandId !== "default");

  const queryCacheKey = useMemo(() => {
    if (!enabled || !brandId) return "";
    return statsCacheKey(brandId, toolbar, allClientBrandIds);
  }, [allClientBrandIds, brandId, enabled, toolbar]);

  const fetchStats = useCallback(async (): Promise<DiscoveryStatsResult> => {
    if (!brandId) throw new Error("Missing brand");
    const res = await fetch(buildStatsUrl(brandId, toolbar, allClientBrandIds), {
      credentials: "include",
    });
    const json = (await res.json()) as DiscoveryStatsResult | { ok: false; error?: string };
    if (!res.ok || !("stats" in json)) {
      throw new Error(("error" in json && json.error) || "Failed to load stats");
    }
    return json;
  }, [allClientBrandIds, brandId, toolbar]);

  const { data, loading, error, refetch } = useScrapeKeyedCache<DiscoveryStatsResult>({
    cacheKey: queryCacheKey,
    enabled: enabled && Boolean(queryCacheKey),
    persistAcrossTabs: true,
    fetcher: fetchStats,
  });

  return {
    stats: data && "stats" in data ? data.stats : null,
    competitors: data && "stats" in data ? data.competitors : [],
    loading,
    error: error?.message ?? null,
    refetch,
  };
}
