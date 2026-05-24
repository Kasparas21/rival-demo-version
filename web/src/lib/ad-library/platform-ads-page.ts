import type { AdsLibraryPlatform } from "@/lib/ad-library/ads-library-platform";
import type { AdsLibraryResponse } from "@/lib/ad-library/api-types";
import { PLATFORM_ADS_MODAL_BATCH_SIZE } from "@/lib/ad-library/constants";
import { googleRowLastShownYmd } from "@/lib/ad-library/count-active-ads";
import { pickBestAdsCacheRowMapByPlatform, type AdsCachePickRow } from "@/lib/ad-library/ads-cache-pick";
import { resolveAdsCacheDomainForUser } from "@/lib/ad-library/competitor-cache-domain";
import { normalizeCompetitorSlug } from "@/lib/sidebar-competitors";
import { adsLibraryResponseFromAdsCacheRows, expandAdsCacheDomainCandidates } from "@/lib/strategy-overview/hydrate-scraped-from-ads-cache";
import type {
  GoogleAdRow,
  LinkedInAdCard,
  MetaAdCard,
  PinterestAdCard,
  SnapchatAdCard,
  TikTokAdCard,
} from "@/lib/ad-library/normalize";
import {
  sortGoogleRowsActiveFirst,
  sortLinkedInAdsActiveFirst,
  sortMetaAdsActiveFirst,
  sortPinterestAdsActiveFirst,
  sortSnapchatAdsActiveFirst,
  sortTikTokAdsActiveFirst,
} from "@/lib/ad-library/sort-ads-active-first";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export type PlatformAdsDatePreset = "7d" | "14d" | "30d" | "90d" | "365d" | "all" | "custom";
export type PlatformAdsSort = "newest" | "oldest" | "longest";

export type PlatformAdsPageQuery = {
  domain: string;
  platform: AdsLibraryPlatform;
  offset: number;
  limit: number;
  sort: PlatformAdsSort;
  datePreset: PlatformAdsDatePreset;
  customStartMs: number | null;
  customEndMs: number | null;
  groupDuplicates: boolean;
};

export type PlatformAdsPageResult = {
  ok: true;
  platform: AdsLibraryPlatform;
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
  ads: unknown[];
  dateRange: { earliest: string; latest: string } | null;
  metaScrapeAtMs: number | null;
};

const DAY_MS = 86_400_000;

function startOfLocalDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function endOfLocalDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

function metaTimestampToMs(ts: number): number {
  return ts > 1e12 ? ts : ts * 1000;
}

function ymdToMs(ymd: string | null | undefined): number | null {
  const t = ymd?.trim();
  if (!t) return null;
  const parsed = Date.parse(`${t.slice(0, 10)}T12:00:00`);
  return Number.isFinite(parsed) ? parsed : null;
}

type AdSpan = { startMs: number; endMs: number; lifespanMs: number; newestMs: number };

function spanForMeta(ad: MetaAdCard, nowMs: number): AdSpan {
  const startMs = ad.startedAt != null && Number.isFinite(ad.startedAt) ? metaTimestampToMs(ad.startedAt) : 0;
  const endRaw =
    ad.endedAt != null && Number.isFinite(ad.endedAt) && ad.endedAt > 0 ? metaTimestampToMs(ad.endedAt) : nowMs;
  const endMs = Math.max(startMs, endRaw);
  return { startMs, endMs, lifespanMs: Math.max(0, endMs - startMs), newestMs: endMs };
}

function spanForGoogle(ad: GoogleAdRow, nowMs: number): AdSpan {
  const startMs = ymdToMs(ad.firstShown) ?? ymdToMs(googleRowLastShownYmd(ad)) ?? 0;
  const endMs = ymdToMs(ad.lastShown) ?? ymdToMs(googleRowLastShownYmd(ad)) ?? nowMs;
  return { startMs, endMs: Math.max(startMs, endMs), lifespanMs: Math.max(0, endMs - startMs), newestMs: endMs };
}

function spanForLinkedIn(ad: LinkedInAdCard, nowMs: number): AdSpan {
  const startMs = ymdToMs(ad.publicationStart) ?? 0;
  const endMs = ymdToMs(ad.publicationEnd) ?? nowMs;
  return { startMs, endMs: Math.max(startMs, endMs), lifespanMs: Math.max(0, endMs - startMs), newestMs: endMs };
}

function spanForTikTok(ad: TikTokAdCard, nowMs: number): AdSpan {
  const startMs = ad.flightStartMs ?? 0;
  const endMs = ad.flightEndMs ?? nowMs;
  return { startMs, endMs: Math.max(startMs, endMs), lifespanMs: Math.max(0, endMs - startMs), newestMs: endMs };
}

function spanForGeneric(ad: { id: string }, nowMs: number): AdSpan {
  void ad;
  return { startMs: 0, endMs: nowMs, lifespanMs: 0, newestMs: nowMs };
}

function getSpan(platform: AdsLibraryPlatform, ad: unknown, nowMs: number): AdSpan {
  switch (platform) {
    case "meta":
      return spanForMeta(ad as MetaAdCard, nowMs);
    case "google":
      return spanForGoogle(ad as GoogleAdRow, nowMs);
    case "linkedin":
      return spanForLinkedIn(ad as LinkedInAdCard, nowMs);
    case "tiktok":
      return spanForTikTok(ad as TikTokAdCard, nowMs);
    default:
      return spanForGeneric(ad as { id: string }, nowMs);
  }
}

function computeDateRange(ads: unknown[], platform: AdsLibraryPlatform, nowMs: number): { earliest: string; latest: string } | null {
  if (ads.length === 0) return null;
  let min = Number.POSITIVE_INFINITY;
  let max = 0;
  for (const ad of ads) {
    const { startMs, endMs } = getSpan(platform, ad, nowMs);
    if (startMs > 0) min = Math.min(min, startMs);
    max = Math.max(max, endMs);
  }
  if (!Number.isFinite(min) || max <= 0) return null;
  return { earliest: new Date(min).toISOString(), latest: new Date(max).toISOString() };
}

function resolveDateWindow(
  preset: PlatformAdsDatePreset,
  customStart: number | null,
  customEnd: number | null,
  dateRange: { earliest: string; latest: string } | null,
  nowMs: number,
): { start: number; end: number } | null {
  if (!dateRange) return null;
  const latest = Date.parse(dateRange.latest);
  const earliest = Date.parse(dateRange.earliest);
  if (!Number.isFinite(latest) || !Number.isFinite(earliest)) return null;

  if (preset === "custom" && customStart != null && customEnd != null) {
    return {
      start: startOfLocalDay(Math.min(customStart, customEnd)),
      end: endOfLocalDay(Math.max(customStart, customEnd)),
    };
  }
  if (preset === "all") {
    return { start: startOfLocalDay(earliest), end: endOfLocalDay(latest) };
  }

  const presetDays: Record<Exclude<PlatformAdsDatePreset, "all" | "custom">, number> = {
    "7d": 7,
    "14d": 14,
    "30d": 30,
    "90d": 90,
    "365d": 365,
  };
  const days = presetDays[preset as Exclude<PlatformAdsDatePreset, "all" | "custom">] ?? 90;
  return { start: startOfLocalDay(latest - days * DAY_MS), end: endOfLocalDay(latest) };
}

function adOverlapsWindow(platform: AdsLibraryPlatform, ad: unknown, window: { start: number; end: number }, nowMs: number): boolean {
  const { startMs, endMs } = getSpan(platform, ad, nowMs);
  const adStart = startMs > 0 ? startMs : endMs;
  const adEnd = endMs > 0 ? endMs : nowMs;
  return adEnd >= window.start && adStart <= window.end;
}

function sortPlatformAds<T>(platform: AdsLibraryPlatform, ads: T[], sort: PlatformAdsSort, nowMs: number): T[] {
  const withSpan = ads.map((ad) => ({ ad, span: getSpan(platform, ad, nowMs) }));
  switch (sort) {
    case "oldest":
      return withSpan.sort((a, b) => a.span.startMs - b.span.startMs).map((x) => x.ad);
    case "longest":
      return withSpan.sort((a, b) => b.span.lifespanMs - a.span.lifespanMs).map((x) => x.ad);
    case "newest":
    default:
      return withSpan.sort((a, b) => b.span.newestMs - a.span.newestMs).map((x) => x.ad);
  }
}

function metaDuplicateKey(ad: MetaAdCard): string | null {
  const video = ad.videoUrl?.trim();
  if (video) return `v:${video}`;
  const img = ad.img?.trim();
  if (img) return `i:${img}`;
  return null;
}

function groupMetaDuplicateAds(ads: MetaAdCard[], nowMs: number): MetaAdCard[] {
  const singles: MetaAdCard[] = [];
  const groups = new Map<string, MetaAdCard[]>();

  for (const ad of ads) {
    const key = metaDuplicateKey(ad);
    if (!key) {
      singles.push(ad);
      continue;
    }
    const bucket = groups.get(key) ?? [];
    bucket.push(ad);
    groups.set(key, bucket);
  }

  const grouped: MetaAdCard[] = [...singles];
  for (const group of groups.values()) {
    if (group.length === 1) {
      grouped.push(group[0]!);
      continue;
    }
    const best = group.reduce((a, b) =>
      getSpan("meta", a, nowMs).lifespanMs >= getSpan("meta", b, nowMs).lifespanMs ? a : b,
    );
    grouped.push(best);
  }
  return grouped;
}

function extractPlatformAds(library: AdsLibraryResponse, platform: AdsLibraryPlatform, scrapeAtMs: number | null, nowMs: number): unknown[] {
  switch (platform) {
    case "meta": {
      const seen = new Set<string>();
      const unique = (library.meta.ads ?? []).filter((ad) => {
        if (seen.has(ad.id)) return false;
        seen.add(ad.id);
        return true;
      });
      return sortMetaAdsActiveFirst(unique, scrapeAtMs ?? undefined, nowMs);
    }
    case "google":
      return sortGoogleRowsActiveFirst(library.google.rows ?? [], nowMs);
    case "linkedin":
      return sortLinkedInAdsActiveFirst(library.linkedin.ads ?? [], nowMs);
    case "tiktok":
      return sortTikTokAdsActiveFirst(library.tiktok.ads ?? [], nowMs);
    case "pinterest":
      return sortPinterestAdsActiveFirst(library.pinterest.ads ?? [], nowMs);
    case "snapchat":
      return sortSnapchatAdsActiveFirst(library.snapchat.ads ?? []);
    default:
      return [];
  }
}

function metaScrapeAtMsFromCacheRows(rows: AdsCachePickRow[], platform: AdsLibraryPlatform): number | null {
  const row = rows.find((r) => r.platform === platform);
  if (!row?.scraped_at) return null;
  const ms = Date.parse(row.scraped_at);
  return Number.isFinite(ms) ? ms : null;
}

async function fetchCacheRowsForDomain(
  supabase: SupabaseClient<Database>,
  userId: string,
  domainHint: string,
): Promise<AdsCachePickRow[]> {
  const trimmed = domainHint.trim();
  if (!trimmed) return [];
  const cleaned = normalizeCompetitorSlug(trimmed).toLowerCase();
  const { readDomains } = await resolveAdsCacheDomainForUser(supabase, userId, trimmed);
  if (readDomains.length === 0) return [];

  const fetchCache = async (domains: string[]) => {
    const { data } = await supabase
      .from("ads_cache")
      .select("platform, ads_data, scraped_at, expires_at, competitor_domain")
      .eq("user_id", userId)
      .in("competitor_domain", domains);
    return data ?? [];
  };

  let cacheRows = await fetchCache(readDomains);
  if (cacheRows.length === 0) {
    cacheRows = await fetchCache(expandAdsCacheDomainCandidates(readDomains));
  }
  if (cacheRows.length === 0 && cleaned) {
    const firstLabel = cleaned.includes(".") ? (cleaned.split(".")[0] ?? "") : cleaned;
    if (firstLabel.length >= 3) {
      const { data } = await supabase
        .from("ads_cache")
        .select("platform, ads_data, scraped_at, expires_at, competitor_domain")
        .eq("user_id", userId)
        .or(`competitor_domain.eq.${firstLabel},competitor_domain.ilike.${firstLabel}.%`);
      cacheRows = data ?? [];
    }
  }
  return cacheRows as AdsCachePickRow[];
}

export async function loadPlatformAdsPage(
  supabase: SupabaseClient<Database>,
  userId: string,
  query: PlatformAdsPageQuery,
): Promise<PlatformAdsPageResult | { ok: false; error: string }> {
  const domain = query.domain.trim();
  if (!domain) return { ok: false, error: "domain required" };

  const limit = Math.min(Math.max(query.limit || PLATFORM_ADS_MODAL_BATCH_SIZE, 1), 48);
  const offset = Math.max(query.offset || 0, 0);
  const nowMs = Date.now();

  const cacheRows = await fetchCacheRowsForDomain(supabase, userId, domain);
  if (cacheRows.length === 0) return { ok: false, error: "not_found" };

  const { cacheDomain } = await resolveAdsCacheDomainForUser(supabase, userId, domain);
  const latestByPlatform = pickBestAdsCacheRowMapByPlatform(cacheRows, cacheDomain, new Date().toISOString());
  if (latestByPlatform.size === 0) return { ok: false, error: "not_found" };

  const library = adsLibraryResponseFromAdsCacheRows([...latestByPlatform.values()]);
  const metaScrapeAtMs =
    query.platform === "meta" ? metaScrapeAtMsFromCacheRows([...latestByPlatform.values()], query.platform) : null;
  let ads = extractPlatformAds(library, query.platform, metaScrapeAtMs, nowMs);
  const dateRange = computeDateRange(ads, query.platform, nowMs);

  const window = resolveDateWindow(query.datePreset, query.customStartMs, query.customEndMs, dateRange, nowMs);
  if (window) {
    ads = ads.filter((ad) => adOverlapsWindow(query.platform, ad, window, nowMs));
  }

  if (query.platform === "meta" && query.groupDuplicates) {
    ads = groupMetaDuplicateAds(ads as MetaAdCard[], nowMs);
  }

  ads = sortPlatformAds(query.platform, ads, query.sort, nowMs);

  const total = ads.length;
  const page = ads.slice(offset, offset + limit);
  const hasMore = offset + page.length < total;

  return {
    ok: true,
    platform: query.platform,
    total,
    offset,
    limit,
    hasMore,
    ads: page,
    dateRange,
    metaScrapeAtMs,
  };
}
