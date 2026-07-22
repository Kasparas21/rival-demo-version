import type { SupabaseClient } from "@supabase/supabase-js";

import type { AdsLibraryPlatform, AdsLibraryResponse } from "@/lib/ad-library/api-types";
import { hydrateMetaAdCardForLibrary } from "@/lib/ad-library/count-active-ads";
import { countLibraryAdsForPlatform } from "@/lib/ad-library/library-response-utils";
import type {
  GoogleAdRow,
  LinkedInAdCard,
  MetaAdCard,
  PinterestAdCard,
  SnapchatAdCard,
  TikTokAdCard,
} from "@/lib/ad-library/normalize";
import { stableAdKeyForGoogleRow, stableAdKeyForLibraryItem } from "@/lib/ad-library/stable-ad-keys";
import type { Database } from "@/lib/supabase/types";

const DB_PLATFORMS: Record<AdsLibraryPlatform, string[]> = {
  meta: ["meta"],
  google: ["google", "youtube"],
  linkedin: ["linkedin"],
  tiktok: ["tiktok"],
  microsoft: ["microsoft"],
  pinterest: ["pinterest"],
  snapchat: ["snapchat"],
};

type ScrapedRow = {
  platform: string;
  stable_ad_key: string;
  raw_payload: unknown;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

function mergeMetaFromRows(out: AdsLibraryResponse, rows: ScrapedRow[]): AdsLibraryResponse {
  const existingKeys = new Set((out.meta.ads ?? []).map((ad) => stableAdKeyForLibraryItem("meta", ad)));
  const merged = [...(out.meta.ads ?? [])];
  for (const row of rows) {
    if (!isRecord(row.raw_payload)) continue;
    const card = hydrateMetaAdCardForLibrary(row.raw_payload as MetaAdCard);
    const key = row.stable_ad_key.trim() || stableAdKeyForLibraryItem("meta", card);
    if (existingKeys.has(key)) continue;
    existingKeys.add(key);
    merged.push(card);
  }
  return { ...out, meta: { ...out.meta, ads: merged, error: merged.length > 0 ? null : out.meta.error } };
}

function mergeGoogleFromRows(out: AdsLibraryResponse, rows: ScrapedRow[]): AdsLibraryResponse {
  const existingKeys = new Set((out.google.rows ?? []).map((r) => stableAdKeyForGoogleRow(r)));
  const merged = [...(out.google.rows ?? [])];
  for (const row of rows) {
    if (!isRecord(row.raw_payload)) continue;
    const googleRow = row.raw_payload as GoogleAdRow;
    const key = row.stable_ad_key.trim() || stableAdKeyForGoogleRow(googleRow);
    if (existingKeys.has(key)) continue;
    existingKeys.add(key);
    merged.push(googleRow);
  }
  return {
    ...out,
    google: { ...out.google, rows: merged, error: merged.length > 0 ? null : out.google.error },
  };
}

function mergeSimpleAdsPlatform<T extends { id?: string }>(
  out: AdsLibraryResponse,
  platform: Exclude<AdsLibraryPlatform, "meta" | "google" | "microsoft">,
  rows: ScrapedRow[],
): AdsLibraryResponse {
  const bucket = out[platform] as { ads: T[]; error: string | null };
  const existingKeys = new Set((bucket.ads ?? []).map((ad) => stableAdKeyForLibraryItem(platform, ad)));
  const merged = [...(bucket.ads ?? [])];
  for (const row of rows) {
    if (!isRecord(row.raw_payload)) continue;
    const ad = row.raw_payload as T;
    const key = row.stable_ad_key.trim() || stableAdKeyForLibraryItem(platform, ad);
    if (existingKeys.has(key)) continue;
    existingKeys.add(key);
    merged.push(ad);
  }
  return {
    ...out,
    [platform]: {
      ...bucket,
      ads: merged,
      error: merged.length > 0 ? null : bucket.error,
    },
  } as AdsLibraryResponse;
}

/**
 * When `ads_cache` lags or is missing platforms, merge creatives from row-level `scraped_ads`
 * so the Ad Library matches what admin / strategy tabs already see.
 */
export async function supplementAdsLibraryFromScrapedAds(
  supabase: SupabaseClient<Database>,
  params: {
    userId: string;
    competitorId: string;
    response: AdsLibraryResponse;
    activeOnly?: boolean;
  },
): Promise<AdsLibraryResponse> {
  const { userId, competitorId, activeOnly = true } = params;
  let query = supabase
    .from("scraped_ads")
    .select("platform, stable_ad_key, raw_payload")
    .eq("user_id", userId)
    .eq("competitor_id", competitorId);

  if (activeOnly) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query.limit(5000);
  if (error) {
    console.warn("[supplement-library-from-scraped-ads]", error.message);
    return params.response;
  }
  if (!data?.length) return params.response;

  const rowsByDbPlatform = new Map<string, ScrapedRow[]>();
  for (const row of data) {
    const platform = String(row.platform ?? "").trim();
    if (!platform) continue;
    const list = rowsByDbPlatform.get(platform) ?? [];
    list.push(row as ScrapedRow);
    rowsByDbPlatform.set(platform, list);
  }

  let out = params.response;

  for (const libraryPlatform of Object.keys(DB_PLATFORMS) as AdsLibraryPlatform[]) {
    const dbPlatforms = DB_PLATFORMS[libraryPlatform];
    const scrapedRows = dbPlatforms.flatMap((db) => rowsByDbPlatform.get(db) ?? []);
    if (scrapedRows.length === 0) continue;

    const cacheCount = countLibraryAdsForPlatform(libraryPlatform, out);
    if (cacheCount >= scrapedRows.length) continue;

    if (libraryPlatform === "meta") {
      out = mergeMetaFromRows(out, scrapedRows);
    } else if (libraryPlatform === "google") {
      out = mergeGoogleFromRows(out, scrapedRows);
    } else if (libraryPlatform === "linkedin") {
      out = mergeSimpleAdsPlatform<LinkedInAdCard>(out, "linkedin", scrapedRows);
    } else if (libraryPlatform === "tiktok") {
      out = mergeSimpleAdsPlatform<TikTokAdCard>(out, "tiktok", scrapedRows);
    } else if (libraryPlatform === "pinterest") {
      out = mergeSimpleAdsPlatform<PinterestAdCard>(out, "pinterest", scrapedRows);
    } else if (libraryPlatform === "snapchat") {
      out = mergeSimpleAdsPlatform<SnapchatAdCard>(out, "snapchat", scrapedRows);
    }
  }

  return out;
}
