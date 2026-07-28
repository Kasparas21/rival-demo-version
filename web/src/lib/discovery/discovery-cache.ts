import type { DiscoveryToolbarState } from "@/components/discovery/discovery-types";
import { resolveDiscoveryClientBrandIds } from "@/components/discovery/discovery-types";
import type { DiscoveryAdDto, DiscoveryFeedResult } from "@/lib/discovery/types";

export const DISCOVERY_PAGE_SIZE = 24;

export type DiscoveryFeedPageCache = Pick<
  DiscoveryFeedResult,
  "ads" | "total" | "has_more" | "competitors" | "platform_counts" | "market_stats" | "shuffle_seed"
> & {
  offset: number;
};

export function discoveryDayKey(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function serializeDiscoveryQuery(
  toolbar: DiscoveryToolbarState,
  search: string,
  shuffleSeed: string,
): string {
  const platforms = [...toolbar.selectedPlatforms].sort().join(",");
  const clientBrands = [...toolbar.selectedClientBrandIds].sort().join(",");
  return [
    toolbar.sort,
    toolbar.datePreset,
    toolbar.format,
    toolbar.status,
    toolbar.ultimateOnly ? "1" : "0",
    toolbar.competitorId ?? "",
    clientBrands,
    platforms,
    search.trim().toLowerCase(),
    shuffleSeed,
  ].join("|");
}

export function discoveryFeedCacheKey(
  brandId: string,
  toolbar: DiscoveryToolbarState,
  search: string,
  shuffleSeed: string,
  day = discoveryDayKey(),
): string {
  const query = serializeDiscoveryQuery(toolbar, search, shuffleSeed);
  return `${brandId}:discovery:v5:${day}:${query}`;
}

export function discoveryShuffleCacheKey(brandId: string, day = discoveryDayKey()): string {
  return `${brandId}:discovery-shuffle:v2:${day}`;
}

export function validateDiscoveryFeedCache(cached: DiscoveryFeedPageCache): boolean {
  if (!Array.isArray(cached.ads) || typeof cached.total !== "number") return false;
  if (!cached.market_stats || typeof cached.market_stats.total_ads !== "number") return false;
  return cached.ads.every((ad) => Boolean(ad && typeof ad.id === "string"));
}

export function sanitizeDiscoveryAds(ads: DiscoveryAdDto[]): DiscoveryAdDto[] {
  return ads.filter((ad): ad is DiscoveryAdDto => Boolean(ad && typeof ad.id === "string"));
}

export function buildDiscoveryFeedUrl(
  brandId: string,
  toolbar: DiscoveryToolbarState,
  offset: number,
  shuffleSeed: string,
  search: string,
  limit = DISCOVERY_PAGE_SIZE,
  allClientBrandIds: string[] = [],
): string {
  const params = new URLSearchParams({
    brandId,
    offset: String(offset),
    limit: String(limit),
    sort: toolbar.sort,
    shuffleSeed,
    format: toolbar.format,
    status: toolbar.status,
    datePreset: toolbar.datePreset,
    q: search,
  });
  if (toolbar.ultimateOnly) params.set("ultimateOnly", "1");
  if (toolbar.competitorId) params.set("competitorId", toolbar.competitorId);
  const clientBrandIds = resolveDiscoveryClientBrandIds(
    toolbar.selectedClientBrandIds,
    brandId,
    allClientBrandIds.map((id) => ({ id })),
  );
  const isDefaultSelection =
    clientBrandIds.length === 1 && clientBrandIds[0] === brandId;
  if (!isDefaultSelection) {
    for (const id of clientBrandIds) params.append("clientBrand", id);
  }
  for (const p of toolbar.selectedPlatforms) params.append("platform", p);
  return `/api/discovery/feed?${params.toString()}`;
}
