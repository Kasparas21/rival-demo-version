import type { AdsLibraryResponse } from "./api-types";
import {
  mergeGoogleAdRows,
  mergeLinkedInAdCards,
  mergeMetaAdCards,
  mergeMicrosoftAdCards,
  mergePinterestAdCards,
  mergeSnapchatAdCards,
  mergeTikTokAdCards,
} from "./merge-library-platform-ads";
import type {
  GoogleAdRow,
  LinkedInAdCard,
  MetaAdCard,
  MicrosoftAdCard,
  PinterestAdCard,
  SnapchatAdCard,
  TikTokAdCard,
} from "./normalize";
import type { AdsLibraryPlatform } from "./ads-library-platform";
import type { Json } from "@/lib/supabase/types";

function prevMeta(raw: unknown): AdsLibraryResponse["meta"] {
  if (!raw || typeof raw !== "object") return { ads: [], error: null };
  const o = raw as Record<string, unknown>;
  return {
    ads: Array.isArray(o.ads) ? (o.ads as MetaAdCard[]) : [],
    error: o.error === null || typeof o.error === "string" ? (o.error as string | null) : null,
  };
}

function prevGoogle(raw: unknown): AdsLibraryResponse["google"] {
  if (!raw || typeof raw !== "object") return { rows: [], error: null };
  const o = raw as Record<string, unknown>;
  return {
    rows: Array.isArray(o.rows) ? (o.rows as GoogleAdRow[]) : [],
    error: o.error === null || typeof o.error === "string" ? (o.error as string | null) : null,
  };
}

function prevAdsSlot(raw: unknown): { ads: unknown[]; error: string | null } {
  if (!raw || typeof raw !== "object") return { ads: [], error: null };
  const o = raw as Record<string, unknown>;
  return {
    ads: Array.isArray(o.ads) ? o.ads : [],
    error: o.error === null || typeof o.error === "string" ? (o.error as string | null) : null,
  };
}

function mergeMeta(prevRaw: unknown, incoming: AdsLibraryResponse["meta"]): AdsLibraryResponse["meta"] {
  if (incoming.error != null) return incoming;
  const previous = prevMeta(prevRaw);
  const prevAds = previous.error != null ? [] : [...(previous.ads ?? [])];
  const incAds = incoming.ads ?? [];
  if (incAds.length === 0) return { error: null, ads: prevAds };
  return { error: null, ads: mergeMetaAdCards(prevAds, incAds) };
}

function mergeGoogle(prevRaw: unknown, incoming: AdsLibraryResponse["google"]): AdsLibraryResponse["google"] {
  if (incoming.error != null) return incoming;
  const previous = prevGoogle(prevRaw);
  const prevRows = previous.error != null ? [] : [...(previous.rows ?? [])];
  const incRows = incoming.rows ?? [];
  if (incRows.length === 0) return { error: null, rows: prevRows };
  return { error: null, rows: mergeGoogleAdRows(prevRows, incRows) };
}

function mergeAdsPlatform(
  prevRaw: unknown,
  incoming: { ads: unknown[]; error: string | null },
  mergeFn: (e: unknown[], i: unknown[]) => unknown[]
): { ads: unknown[]; error: string | null } {
  if (incoming.error != null) return incoming;
  const previous = prevAdsSlot(prevRaw);
  const prevAds = previous.error != null ? [] : [...previous.ads];
  const incAds = incoming.ads ?? [];
  if (incAds.length === 0) return { error: null, ads: prevAds };
  return { error: null, ads: mergeFn(prevAds, incAds) };
}

/**
 * Merge a freshly scraped platform snapshot into prior `ads_cache.ads_data` for the same user/domain/platform.
 */
export function mergeAdsCachePayloadForPlatform(
  platform: AdsLibraryPlatform,
  previousAdsData: unknown,
  incomingFromScrape: AdsLibraryResponse
): Json {
  switch (platform) {
    case "meta":
      return mergeMeta(previousAdsData, incomingFromScrape.meta) as unknown as Json;
    case "google":
      return mergeGoogle(previousAdsData, incomingFromScrape.google) as unknown as Json;
    case "linkedin":
      return mergeAdsPlatform(previousAdsData, incomingFromScrape.linkedin, (e, i) =>
        mergeLinkedInAdCards(e as LinkedInAdCard[], i as LinkedInAdCard[])
      ) as unknown as Json;
    case "tiktok":
      return mergeAdsPlatform(previousAdsData, incomingFromScrape.tiktok, (e, i) =>
        mergeTikTokAdCards(e as TikTokAdCard[], i as TikTokAdCard[])
      ) as unknown as Json;
    case "microsoft":
      return mergeAdsPlatform(previousAdsData, incomingFromScrape.microsoft, (e, i) =>
        mergeMicrosoftAdCards(e as MicrosoftAdCard[], i as MicrosoftAdCard[])
      ) as unknown as Json;
    case "pinterest":
      return mergeAdsPlatform(previousAdsData, incomingFromScrape.pinterest, (e, i) =>
        mergePinterestAdCards(e as PinterestAdCard[], i as PinterestAdCard[])
      ) as unknown as Json;
    case "snapchat":
      return mergeAdsPlatform(previousAdsData, incomingFromScrape.snapchat, (e, i) =>
        mergeSnapchatAdCards(e as SnapchatAdCard[], i as SnapchatAdCard[])
      ) as unknown as Json;
    default:
      return previousAdsData as Json;
  }
}
