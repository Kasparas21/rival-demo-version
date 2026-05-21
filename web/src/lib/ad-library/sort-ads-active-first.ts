import {
  googleRowLastShownYmd,
  isGoogleAdRowActive,
  isLinkedInAdActive,
  isMetaAdActive,
  isPinterestAdActive,
  isSnapchatAdActive,
  isTikTokAdActive,
} from "@/lib/ad-library/count-active-ads";
import type {
  GoogleAdRow,
  LinkedInAdCard,
  MetaAdCard,
  PinterestAdCard,
  SnapchatAdCard,
  TikTokAdCard,
} from "@/lib/ad-library/normalize";

function partitionActiveFirst<T>(
  items: readonly T[],
  isActive: (item: T) => boolean,
  compare?: (a: T, b: T) => number,
): T[] {
  const active: T[] = [];
  const inactive: T[] = [];
  for (const item of items) {
    if (isActive(item)) active.push(item);
    else inactive.push(item);
  }
  if (compare) {
    active.sort(compare);
    inactive.sort(compare);
  }
  return [...active, ...inactive];
}

function metaTimestampToMs(ts: number): number {
  return ts > 1e12 ? ts : ts * 1000;
}

function compareMetaByRecency(a: MetaAdCard, b: MetaAdCard): number {
  const aOpen = a.endedAt == null || !Number.isFinite(a.endedAt) || a.endedAt <= 0;
  const bOpen = b.endedAt == null || !Number.isFinite(b.endedAt) || b.endedAt <= 0;
  if (aOpen !== bOpen) return aOpen ? -1 : 1;
  const aEnd = aOpen ? Number.POSITIVE_INFINITY : metaTimestampToMs(a.endedAt!);
  const bEnd = bOpen ? Number.POSITIVE_INFINITY : metaTimestampToMs(b.endedAt!);
  if (bEnd !== aEnd) return bEnd - aEnd;
  const aStart = metaTimestampToMs(a.startedAt ?? 0);
  const bStart = metaTimestampToMs(b.startedAt ?? 0);
  return bStart - aStart;
}

function compareGoogleByRecency(a: GoogleAdRow, b: GoogleAdRow): number {
  const aYmd = googleRowLastShownYmd(a) ?? "";
  const bYmd = googleRowLastShownYmd(b) ?? "";
  return bYmd.localeCompare(aYmd);
}

function compareLinkedInByRecency(a: LinkedInAdCard, b: LinkedInAdCard): number {
  const aEnd = a.publicationEnd?.trim() ?? "9999-99-99";
  const bEnd = b.publicationEnd?.trim() ?? "9999-99-99";
  return bEnd.localeCompare(aEnd);
}

function compareTikTokByRecency(a: TikTokAdCard, b: TikTokAdCard): number {
  const aEnd = a.flightEndMs ?? Number.POSITIVE_INFINITY;
  const bEnd = b.flightEndMs ?? Number.POSITIVE_INFINITY;
  return bEnd - aEnd;
}

export function sortMetaAdsActiveFirst(
  ads: readonly MetaAdCard[],
  scrapeAtMs?: number,
  nowMs = Date.now()
): MetaAdCard[] {
  return partitionActiveFirst(ads, (ad) => isMetaAdActive(ad, scrapeAtMs, nowMs), compareMetaByRecency);
}

export function sortGoogleRowsActiveFirst(rows: readonly GoogleAdRow[], nowMs = Date.now()): GoogleAdRow[] {
  return partitionActiveFirst(rows, (row) => isGoogleAdRowActive(row, nowMs), compareGoogleByRecency);
}

export function sortLinkedInAdsActiveFirst(ads: readonly LinkedInAdCard[], nowMs = Date.now()): LinkedInAdCard[] {
  return partitionActiveFirst(ads, (ad) => isLinkedInAdActive(ad, nowMs), compareLinkedInByRecency);
}

export function sortTikTokAdsActiveFirst(ads: readonly TikTokAdCard[], nowMs = Date.now()): TikTokAdCard[] {
  return partitionActiveFirst(ads, (ad) => isTikTokAdActive(ad, nowMs), compareTikTokByRecency);
}

export function sortPinterestAdsActiveFirst(ads: readonly PinterestAdCard[], nowMs = Date.now()): PinterestAdCard[] {
  return partitionActiveFirst(ads, (ad) => isPinterestAdActive(ad, nowMs));
}

export function sortSnapchatAdsActiveFirst(ads: readonly SnapchatAdCard[]): SnapchatAdCard[] {
  return partitionActiveFirst(ads, (ad) => isSnapchatAdActive(ad));
}
