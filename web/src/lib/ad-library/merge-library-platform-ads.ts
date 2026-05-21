/**
 * Incremental merge for ads-library platform payloads: union by stable key, prefer incoming
 * for mutable creative fields, preserve earliest Meta startedAt / TikTok firstShown where
 * applicable, bump recency for pruning. Output is ordered by merge `lastSeenMs` (newest scrape
 * first), stable ad key as tie-break, and capped to {@link ADS_LIBRARY_MERGED_CAP_PER_PLATFORM}.
 */
import type { AdsLibraryPlatform } from "./ads-library-platform";
import { ADS_LIBRARY_MERGED_CAP_PER_PLATFORM } from "./constants";
import type {
  GoogleAdRow,
  LinkedInAdCard,
  MetaAdCard,
  MicrosoftAdCard,
  PinterestAdCard,
  SnapchatAdCard,
  TikTokAdCard,
} from "./normalize";
import {
  stableAdKeyForGoogleRow,
  stableAdKeyForLinkedIn,
  stableAdKeyForMeta,
  stableAdKeyForMicrosoft,
  stableAdKeyForPinterest,
  stableAdKeyForSnapchat,
  stableAdKeyForTikTok,
} from "./stable-ad-keys";
import { repairMetaAdCardMedia } from "./repair-library-ad-media";

function minOptionalUnix(a?: number, b?: number): number | undefined {
  if (a == null && b == null) return undefined;
  if (a == null) return b;
  if (b == null) return a;
  return Math.min(a, b);
}

function maxOptionalUnix(a?: number, b?: number): number | undefined {
  if (a == null && b == null) return undefined;
  if (a == null) return b;
  if (b == null) return a;
  return Math.max(a, b);
}

/** Unix-ish seconds or ms → ms for sorting. */
function metaTimeToMs(u: number | undefined): number {
  if (u == null || !Number.isFinite(u)) return 0;
  return u > 1e12 ? u : u * 1000;
}

function minOptionalDateString(a?: string | null, b?: string | null): string | null {
  const ta = a?.trim() || null;
  const tb = b?.trim() || null;
  if (!ta) return tb;
  if (!tb) return ta;
  const da = new Date(ta).getTime();
  const db = new Date(tb).getTime();
  if (Number.isNaN(da)) return tb;
  if (Number.isNaN(db)) return ta;
  return da <= db ? ta : tb;
}

function maxOptionalDateString(a?: string | null, b?: string | null): string | null {
  const ta = a?.trim() || null;
  const tb = b?.trim() || null;
  if (!ta) return tb;
  if (!tb) return ta;
  const da = new Date(ta).getTime();
  const db = new Date(tb).getTime();
  if (Number.isNaN(da)) return tb;
  if (Number.isNaN(db)) return ta;
  return da >= db ? ta : tb;
}

function mergeOptionalEnrichmentText(a?: string | null, b?: string | null): string | null {
  const ta = a?.trim() || "";
  const tb = b?.trim() || "";
  if (!ta) return tb || null;
  if (!tb) return ta || null;
  if (tb.length >= ta.length) return tb;
  return ta;
}

function metaLastSeenMs(card: MetaAdCard): number {
  const t = maxOptionalUnix(card.endedAt, card.startedAt);
  return metaTimeToMs(t ?? undefined) || 0;
}

function mergeMetaEndedAt(a?: number, b?: number): number | undefined {
  const aOpen = a == null || !Number.isFinite(a) || a <= 0;
  const bOpen = b == null || !Number.isFinite(b) || b <= 0;
  if (aOpen || bOpen) return undefined;
  return Math.max(a, b);
}

function mergeMetaCards(a: MetaAdCard, b: MetaAdCard): MetaAdCard {
  const isActive = a.isActive === true || b.isActive === true;
  const endedAt = isActive ? undefined : mergeMetaEndedAt(a.endedAt, b.endedAt);
  return repairMetaAdCardMedia({
    ...a,
    ...b,
    img: b.img?.trim() || a.img?.trim() || "",
    videoUrl: b.videoUrl?.trim() || a.videoUrl?.trim() || undefined,
    snapshot: b.snapshot ?? a.snapshot,
    startedAt: minOptionalUnix(a.startedAt, b.startedAt),
    endedAt,
    ...(isActive ? { isActive: true as const } : {}),
  });
}

function mergeGoogleRows(a: GoogleAdRow, b: GoogleAdRow): GoogleAdRow {
  if (a.type === "youtube" && b.type === "youtube") {
    return {
      ...a,
      ...b,
      youtubeVideoId: b.youtubeVideoId ?? a.youtubeVideoId,
      videoUrl: b.videoUrl ?? a.videoUrl,
      thumbnail: b.thumbnail?.trim() ? b.thumbnail : a.thumbnail,
      firstShown: minOptionalDateString(a.firstShown, b.firstShown),
      lastShown: maxOptionalDateString(a.lastShown, b.lastShown),
      libraryRegionSummary: mergeOptionalEnrichmentText(a.libraryRegionSummary, b.libraryRegionSummary),
      libraryTargetingSummary: mergeOptionalEnrichmentText(
        a.libraryTargetingSummary,
        b.libraryTargetingSummary
      ),
      creativeUrl: (b.creativeUrl?.trim() || a.creativeUrl?.trim() || "").trim()
        ? b.creativeUrl?.trim() || a.creativeUrl?.trim()
        : undefined,
      headline:
        typeof b.headline !== "undefined" ? b.headline : typeof a.headline !== "undefined" ? a.headline : undefined,
      description:
        typeof b.description !== "undefined"
          ? b.description
          : typeof a.description !== "undefined"
            ? a.description
            : undefined,
      regionStats:
        (b.regionStats?.length ?? 0) > 0 ? b.regionStats : a.regionStats,
    };
  }
  if (a.type === "google" && b.type === "google") {
    return {
      ...a,
      ...b,
      img: b.img ?? a.img,
      previewUrl: b.previewUrl ?? a.previewUrl,
      creativeCopy: b.creativeCopy ?? a.creativeCopy,
      firstShown: minOptionalDateString(a.firstShown, b.firstShown),
      lastShown: maxOptionalDateString(a.lastShown, b.lastShown),
      libraryRegionSummary: mergeOptionalEnrichmentText(a.libraryRegionSummary, b.libraryRegionSummary),
      libraryTargetingSummary: mergeOptionalEnrichmentText(
        a.libraryTargetingSummary,
        b.libraryTargetingSummary
      ),
      creativeUrl: (b.creativeUrl?.trim() || a.creativeUrl?.trim() || "").trim()
        ? b.creativeUrl?.trim() || a.creativeUrl?.trim()
        : undefined,
      headline:
        typeof b.headline !== "undefined" ? b.headline : typeof a.headline !== "undefined" ? a.headline : undefined,
      description:
        typeof b.description !== "undefined"
          ? b.description
          : typeof a.description !== "undefined"
            ? a.description
            : undefined,
      regionStats:
        (b.regionStats?.length ?? 0) > 0 ? b.regionStats : a.regionStats,
    };
  }
  return b;
}

function mergePlain<T extends Record<string, unknown>>(a: T, b: T): T {
  return { ...a, ...b };
}

function googleRowLastSeenMs(row: GoogleAdRow, nowMs: number): number {
  if (row.type === "google" || row.type === "youtube") {
    const iso = row.lastShown?.trim() || (row.type === "google" ? row.lastShownLabel?.trim() : null);
    if (iso) {
      const d = new Date(iso);
      if (!Number.isNaN(d.getTime())) return d.getTime();
    }
  }
  return nowMs;
}

function tiktokLastSeenMs(card: TikTokAdCard, nowMs: number): number {
  const raw = card.lastShown || card.firstShown;
  if (!raw?.trim()) return nowMs;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? nowMs : d.getTime();
}

type Entry<T> = { item: T; lastSeenMs: number };

function pruneByLastSeen<T>(
  entries: Entry<T>[],
  maxItems: number,
  stableKey: (item: T) => string
): T[] {
  const sorted = [...entries].sort((x, y) => {
    if (y.lastSeenMs !== x.lastSeenMs) return y.lastSeenMs - x.lastSeenMs;
    return stableKey(x.item).localeCompare(stableKey(y.item));
  });
  return sorted.slice(0, maxItems).map((e) => e.item);
}

export type MergePlatformAdsOptions = {
  maxItems?: number;
  nowMs?: number;
};

export function mergeMetaAdCards(
  existing: MetaAdCard[],
  incoming: MetaAdCard[],
  options?: MergePlatformAdsOptions
): MetaAdCard[] {
  const maxItems = options?.maxItems ?? ADS_LIBRARY_MERGED_CAP_PER_PLATFORM;
  const nowMs = options?.nowMs ?? Date.now();
  const map = new Map<string, Entry<MetaAdCard>>();

  for (const item of existing) {
    const k = stableAdKeyForMeta(item);
    map.set(k, { item, lastSeenMs: metaLastSeenMs(item) });
  }
  for (const item of incoming) {
    const k = stableAdKeyForMeta(item);
    const incSeen = Math.max(metaLastSeenMs(item), nowMs);
    const prev = map.get(k);
    if (!prev) {
      map.set(k, { item, lastSeenMs: incSeen });
    } else {
      map.set(k, {
        item: mergeMetaCards(prev.item, item),
        lastSeenMs: Math.max(prev.lastSeenMs, incSeen),
      });
    }
  }

  const entries = Array.from(map.values());
  return pruneByLastSeen(entries, maxItems, stableAdKeyForMeta);
}

export function mergeGoogleAdRows(
  existing: GoogleAdRow[],
  incoming: GoogleAdRow[],
  options?: MergePlatformAdsOptions
): GoogleAdRow[] {
  const maxItems = options?.maxItems ?? ADS_LIBRARY_MERGED_CAP_PER_PLATFORM;
  const nowMs = options?.nowMs ?? Date.now();
  const map = new Map<string, Entry<GoogleAdRow>>();

  for (const item of existing) {
    const k = stableAdKeyForGoogleRow(item);
    map.set(k, { item, lastSeenMs: googleRowLastSeenMs(item, nowMs) });
  }
  for (const item of incoming) {
    const k = stableAdKeyForGoogleRow(item);
    const incSeen = Math.max(googleRowLastSeenMs(item, nowMs), nowMs);
    const prev = map.get(k);
    if (!prev) {
      map.set(k, { item, lastSeenMs: incSeen });
    } else {
      map.set(k, {
        item: mergeGoogleRows(prev.item, item),
        lastSeenMs: Math.max(prev.lastSeenMs, incSeen),
      });
    }
  }

  return pruneByLastSeen(Array.from(map.values()), maxItems, stableAdKeyForGoogleRow);
}

function mergeLinkedInCards(a: LinkedInAdCard, b: LinkedInAdCard): LinkedInAdCard {
  return mergePlain(a as Record<string, unknown>, b as Record<string, unknown>) as LinkedInAdCard;
}

function mergeTikTokCards(a: TikTokAdCard, b: TikTokAdCard): TikTokAdCard {
  const m = mergePlain(a as Record<string, unknown>, b as Record<string, unknown>) as TikTokAdCard;
  let firstShown = b.firstShown ?? a.firstShown;
  if (a.firstShown && b.firstShown) {
    const da = new Date(a.firstShown).getTime();
    const db = new Date(b.firstShown).getTime();
    if (!Number.isNaN(da) && !Number.isNaN(db)) {
      firstShown = da <= db ? a.firstShown : b.firstShown;
    }
  }
  return {
    ...m,
    img: b.img?.trim() || a.img?.trim() || "",
    videoUrl: b.videoUrl?.trim() || a.videoUrl?.trim() || undefined,
    firstShown,
  };
}

function mergeMicrosoftCards(a: MicrosoftAdCard, b: MicrosoftAdCard): MicrosoftAdCard {
  return mergePlain(a as Record<string, unknown>, b as Record<string, unknown>) as MicrosoftAdCard;
}

function mergePinterestCards(a: PinterestAdCard, b: PinterestAdCard): PinterestAdCard {
  return mergePlain(a as Record<string, unknown>, b as Record<string, unknown>) as PinterestAdCard;
}

function mergeSnapchatCards(a: SnapchatAdCard, b: SnapchatAdCard): SnapchatAdCard {
  return mergePlain(a as Record<string, unknown>, b as Record<string, unknown>) as SnapchatAdCard;
}

export function mergeLinkedInAdCards(
  existing: LinkedInAdCard[],
  incoming: LinkedInAdCard[],
  options?: MergePlatformAdsOptions
): LinkedInAdCard[] {
  const maxItems = options?.maxItems ?? ADS_LIBRARY_MERGED_CAP_PER_PLATFORM;
  const nowMs = options?.nowMs ?? Date.now();
  const map = new Map<string, Entry<LinkedInAdCard>>();
  for (const item of existing) {
    const k = stableAdKeyForLinkedIn(item);
    map.set(k, { item, lastSeenMs: nowMs });
  }
  for (const item of incoming) {
    const k = stableAdKeyForLinkedIn(item);
    const prev = map.get(k);
    if (!prev) map.set(k, { item, lastSeenMs: nowMs });
    else map.set(k, { item: mergeLinkedInCards(prev.item, item), lastSeenMs: Math.max(prev.lastSeenMs, nowMs) });
  }
  return pruneByLastSeen(Array.from(map.values()), maxItems, stableAdKeyForLinkedIn);
}

export function mergeTikTokAdCards(
  existing: TikTokAdCard[],
  incoming: TikTokAdCard[],
  options?: MergePlatformAdsOptions
): TikTokAdCard[] {
  const maxItems = options?.maxItems ?? ADS_LIBRARY_MERGED_CAP_PER_PLATFORM;
  const nowMs = options?.nowMs ?? Date.now();
  const map = new Map<string, Entry<TikTokAdCard>>();
  for (const item of existing) {
    const k = stableAdKeyForTikTok(item);
    map.set(k, { item, lastSeenMs: tiktokLastSeenMs(item, nowMs) });
  }
  for (const item of incoming) {
    const k = stableAdKeyForTikTok(item);
    const incSeen = Math.max(tiktokLastSeenMs(item, nowMs), nowMs);
    const prev = map.get(k);
    if (!prev) map.set(k, { item, lastSeenMs: incSeen });
    else map.set(k, { item: mergeTikTokCards(prev.item, item), lastSeenMs: Math.max(prev.lastSeenMs, incSeen) });
  }
  return pruneByLastSeen(Array.from(map.values()), maxItems, stableAdKeyForTikTok);
}

export function mergeMicrosoftAdCards(
  existing: MicrosoftAdCard[],
  incoming: MicrosoftAdCard[],
  options?: MergePlatformAdsOptions
): MicrosoftAdCard[] {
  const maxItems = options?.maxItems ?? ADS_LIBRARY_MERGED_CAP_PER_PLATFORM;
  const nowMs = options?.nowMs ?? Date.now();
  const map = new Map<string, Entry<MicrosoftAdCard>>();
  for (const item of existing) {
    const k = stableAdKeyForMicrosoft(item);
    map.set(k, { item, lastSeenMs: nowMs });
  }
  for (const item of incoming) {
    const k = stableAdKeyForMicrosoft(item);
    const prev = map.get(k);
    if (!prev) map.set(k, { item, lastSeenMs: nowMs });
    else map.set(k, { item: mergeMicrosoftCards(prev.item, item), lastSeenMs: Math.max(prev.lastSeenMs, nowMs) });
  }
  return pruneByLastSeen(Array.from(map.values()), maxItems, stableAdKeyForMicrosoft);
}

export function mergePinterestAdCards(
  existing: PinterestAdCard[],
  incoming: PinterestAdCard[],
  options?: MergePlatformAdsOptions
): PinterestAdCard[] {
  const maxItems = options?.maxItems ?? ADS_LIBRARY_MERGED_CAP_PER_PLATFORM;
  const nowMs = options?.nowMs ?? Date.now();
  const map = new Map<string, Entry<PinterestAdCard>>();
  for (const item of existing) {
    const k = stableAdKeyForPinterest(item);
    map.set(k, { item, lastSeenMs: nowMs });
  }
  for (const item of incoming) {
    const k = stableAdKeyForPinterest(item);
    const prev = map.get(k);
    if (!prev) map.set(k, { item, lastSeenMs: nowMs });
    else map.set(k, { item: mergePinterestCards(prev.item, item), lastSeenMs: Math.max(prev.lastSeenMs, nowMs) });
  }
  return pruneByLastSeen(Array.from(map.values()), maxItems, stableAdKeyForPinterest);
}

export function mergeSnapchatAdCards(
  existing: SnapchatAdCard[],
  incoming: SnapchatAdCard[],
  options?: MergePlatformAdsOptions
): SnapchatAdCard[] {
  const maxItems = options?.maxItems ?? ADS_LIBRARY_MERGED_CAP_PER_PLATFORM;
  const nowMs = options?.nowMs ?? Date.now();
  const map = new Map<string, Entry<SnapchatAdCard>>();
  for (const item of existing) {
    const k = stableAdKeyForSnapchat(item);
    map.set(k, { item, lastSeenMs: nowMs });
  }
  for (const item of incoming) {
    const k = stableAdKeyForSnapchat(item);
    const prev = map.get(k);
    if (!prev) map.set(k, { item, lastSeenMs: nowMs });
    else map.set(k, { item: mergeSnapchatCards(prev.item, item), lastSeenMs: Math.max(prev.lastSeenMs, nowMs) });
  }
  return pruneByLastSeen(Array.from(map.values()), maxItems, stableAdKeyForSnapchat);
}

export function mergeAdsArraysForPlatform(
  platform: AdsLibraryPlatform,
  existing: unknown[],
  incoming: unknown[],
  options?: MergePlatformAdsOptions
): unknown[] {
  switch (platform) {
    case "meta":
      return mergeMetaAdCards(existing as MetaAdCard[], incoming as MetaAdCard[], options);
    case "google":
      return mergeGoogleAdRows(existing as GoogleAdRow[], incoming as GoogleAdRow[], options);
    case "linkedin":
      return mergeLinkedInAdCards(existing as LinkedInAdCard[], incoming as LinkedInAdCard[], options);
    case "tiktok":
      return mergeTikTokAdCards(existing as TikTokAdCard[], incoming as TikTokAdCard[], options);
    case "microsoft":
      return mergeMicrosoftAdCards(existing as MicrosoftAdCard[], incoming as MicrosoftAdCard[], options);
    case "pinterest":
      return mergePinterestAdCards(existing as PinterestAdCard[], incoming as PinterestAdCard[], options);
    case "snapchat":
      return mergeSnapchatAdCards(existing as SnapchatAdCard[], incoming as SnapchatAdCard[], options);
    default:
      return incoming;
  }
}
