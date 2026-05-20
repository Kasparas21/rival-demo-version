import {
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

function partitionActiveFirst<T>(items: readonly T[], isActive: (item: T) => boolean): T[] {
  const active: T[] = [];
  const inactive: T[] = [];
  for (const item of items) {
    if (isActive(item)) active.push(item);
    else inactive.push(item);
  }
  return [...active, ...inactive];
}

export function sortMetaAdsActiveFirst(ads: readonly MetaAdCard[], nowMs = Date.now()): MetaAdCard[] {
  return partitionActiveFirst(ads, (ad) => isMetaAdActive(ad, nowMs));
}

export function sortGoogleRowsActiveFirst(rows: readonly GoogleAdRow[], nowMs = Date.now()): GoogleAdRow[] {
  return partitionActiveFirst(rows, (row) => isGoogleAdRowActive(row, nowMs));
}

export function sortLinkedInAdsActiveFirst(ads: readonly LinkedInAdCard[], nowMs = Date.now()): LinkedInAdCard[] {
  return partitionActiveFirst(ads, (ad) => isLinkedInAdActive(ad, nowMs));
}

export function sortTikTokAdsActiveFirst(ads: readonly TikTokAdCard[], nowMs = Date.now()): TikTokAdCard[] {
  return partitionActiveFirst(ads, (ad) => isTikTokAdActive(ad, nowMs));
}

export function sortPinterestAdsActiveFirst(ads: readonly PinterestAdCard[], nowMs = Date.now()): PinterestAdCard[] {
  return partitionActiveFirst(ads, (ad) => isPinterestAdActive(ad, nowMs));
}

export function sortSnapchatAdsActiveFirst(ads: readonly SnapchatAdCard[]): SnapchatAdCard[] {
  return partitionActiveFirst(ads, (ad) => isSnapchatAdActive(ad));
}
