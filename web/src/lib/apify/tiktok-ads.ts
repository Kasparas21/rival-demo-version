import { runApifyActor } from "@/lib/apify/client";
import { APIFY_HEAVY_ACTOR_MEMORY_MBYTES, readApifyActorMemoryMbytes } from "@/lib/apify/memory";
import { ADS_LIBRARY_MAX_ITEMS_PER_PLATFORM } from "@/lib/ad-library/constants";
import { DEFAULT_TIKTOK_ADS_REGION, normalizeTikTokAdsRegion } from "@/lib/ad-library/tiktok-regions";
import type { TikTokAdCard } from "@/lib/ad-library/normalize";
import { tiktokApifyItemToCard, normalizeUserAdvertiserQueryToken } from "@/lib/ad-library/normalize";
import { effectiveCompetitorBrandLabel } from "@/lib/ad-library/competitor-brand-display";
import {
  advertiserNameMatchesBrand,
  brandMatchCandidates,
  domainBrandLabel,
} from "@/lib/ad-library/advertiser-name-match";

/**
 * s-r/tiktok-ads-library: TikTok now treats `query_type=1` as advertiser name; the previous actor
 * (data_xplorer/tiktok-ads-scraper) still sends `2` and has returned zero rows for every advertiser since mid-2026.
 */
const TIKTOK_ADS_ACTOR = process.env.APIFY_TIKTOK_ADS_ACTOR?.trim() || "s-r/tiktok-ads-library";

/**
 * About 1/7 the price per ad of s-r, and far more complete: for OLAPLEX, INC. it returned the advertiser's
 * 91 live ads where s-r (like TikTok's own search page) surfaced 4 ended ones.
 */
const DAMI_TIKTOK_ACTOR = "dami_studio/tiktok-ads-scraper";
/** Its default; the start fee is charged per GB of run memory. */
const DAMI_MEMORY_MBYTES = 256;
/** Stop inside the 300s cron budget instead of being cut off. */
const DAMI_TIMEOUT_SECS = 240;
/** Countries the library covers (EU/EEA, UK, CH); anything else searches all of them. */
const DAMI_TIKTOK_COUNTRIES = new Set([
  "AT", "BE", "BG", "CH", "CY", "CZ", "DE", "DK", "EE", "ES", "FI", "FR", "GB", "GR", "HR", "HU", "IE",
  "IS", "IT", "LI", "LT", "LU", "LV", "MT", "NL", "NO", "PL", "PT", "RO", "SE", "SI", "SK",
]);

export type TikTokAdsActor = "dami" | "sr";

/** `TIKTOK_ACTOR_MODE`: dami_studio by default; `sr` switches back to s-r/tiktok-ads-library. */
export function resolveTikTokAdsActor(mode = process.env.TIKTOK_ACTOR_MODE): TikTokAdsActor {
  return mode?.trim().toLowerCase() === "sr" ? "sr" : "dami";
}

export function buildDamiTikTokInput(params: {
  target: { search: string; advBizId?: string };
  region: string;
  startDate: string;
  endDate: string;
  limit: number;
}): Record<string, unknown> {
  const country = params.region.toUpperCase();
  const known = DAMI_TIKTOK_COUNTRIES.has(country);
  const { target } = params;
  return {
    ...(target.advBizId
      ? {
          /** A library link carries the business id; dami_studio reads its filters back out. */
          adLibraryUrls: [
            `https://library.tiktok.com/ads?region=${known ? country : "all"}&adv_name=${encodeURIComponent(target.search)}&adv_biz_ids=${target.advBizId}&query_type=1`,
          ],
        }
      : { advertiserNames: [target.search] }),
    ...(known ? { countries: [country] } : {}),
    adStatus: "all",
    dateFrom: params.startDate,
    dateTo: params.endDate,
    maxItems: params.limit,
    /**
     * Off: with details on it returned 11 of OLAPLEX's 91 live ads, slower, and half its rows came back
     * without advertiser or media. Details only add landing page, CTA and audience size.
     */
    includeAdDetails: false,
  };
}
/** Regions the actor accepts; anything else (e.g. a non-EU market) searches all regions. */
const SR_TIKTOK_REGIONS = new Set([
  "all", "NL", "DE", "BE", "FR", "GB", "ES", "IT", "AT", "CH", "PL", "SE", "DK", "NO", "FI", "PT", "IE",
  "AU", "CA", "NZ", "JP", "KR", "BR", "MX", "IN", "TR", "ZA", "AR", "CL", "CO", "EG", "SA", "AE", "IL",
]);
const MAX_TIMEOUT_SECS = 600;

function formatIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function pickStartEndDates(startIn?: string, endIn?: string): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date();
  start.setFullYear(start.getFullYear() - 1);
  const defStart = formatIsoDate(start);
  const defEnd = formatIsoDate(end);
  const s =
    startIn?.trim() && ISO_DATE.test(startIn.trim()) ? startIn.trim() : defStart;
  let e =
    endIn?.trim() && ISO_DATE.test(endIn.trim()) ? endIn.trim() : defEnd;
  if (s > e) {
    e = s;
  }
  return { startDate: s, endDate: e };
}

export async function scrapeTikTokAdsLibrary(params: {
  brandName: string;
  brandDomain?: string;
  /** Saved TikTok Ads Library advertiser: library URL (with `adv_biz_ids`), numeric business id, or advertiser name. */
  savedTiktok?: string | null;
  region?: string;
  maxAds: number;
  fetchDetails?: boolean;
  startDate?: string;
  endDate?: string;
}): Promise<TikTokAdCard[]> {
  const wanted = Math.max(1, Math.min(params.maxAds, ADS_LIBRARY_MAX_ITEMS_PER_PLATFORM));
  const { startDate, endDate } = pickStartEndDates(params.startDate, params.endDate);
  const target = resolveTikTokSearchTarget(params);

  const regionIn = normalizeTikTokAdsRegion(params.region) || DEFAULT_TIKTOK_ADS_REGION;
  /** Name searches also return resellers that get filtered out, so ask for a few more. */
  const limit = target.advBizId ? wanted : Math.min(wanted * 2, ADS_LIBRARY_MAX_ITEMS_PER_PLATFORM);

  const rows =
    resolveTikTokAdsActor() === "dami"
      ? await scrapeWithDami({ target, region: regionIn, startDate, endDate, limit })
      : await scrapeWithSr({
          target,
          region: SR_TIKTOK_REGIONS.has(regionIn) ? regionIn : "all",
          startDate,
          endDate,
          limit,
        });

  const candidates = brandMatchCandidates(
    target.search,
    effectiveCompetitorBrandLabel(params.brandName, params.brandDomain),
    domainBrandLabel(params.brandDomain),
  );

  return rows
    .filter((row) => isCompetitorTikTokAd(row, target.advBizId, candidates))
    .slice(0, wanted)
    .map((row, i) =>
      tiktokApifyItemToCard(row.item, i, {
        brandName: params.brandName,
        brandDomain: params.brandDomain,
      }),
    )
    .filter((c): c is TikTokAdCard => c !== null);
}

type ScrapedTikTokRow = {
  advertiserName: string;
  advertiserId?: string;
  /** The field names `tiktokApifyItemToCard` reads (data_xplorer shape). */
  item: Record<string, unknown>;
};

/**
 * A business-id search still returns other advertisers — TikTok's own site mixes them in too (for OLAPLEX, INC.
 * s-r returned 6 TS COSMETIC MARKETING CO. ads) — so id searches are filtered like name searches.
 */
export function isCompetitorTikTokAd(
  row: ScrapedTikTokRow,
  advBizId: string | undefined,
  candidates: readonly string[],
): boolean {
  if (advBizId && row.advertiserId) return row.advertiserId === advBizId;
  return advertiserNameMatchesBrand(row.advertiserName, candidates);
}

async function scrapeWithSr(params: {
  target: { search: string; advBizId?: string };
  region: string;
  startDate: string;
  endDate: string;
  limit: number;
}): Promise<ScrapedTikTokRow[]> {
  const { target, limit } = params;
  const input: Record<string, unknown> = {
    region: params.region,
    query_type: "1",
    ad_status: "all",
    start_date: params.startDate,
    end_date: params.endDate,
    limit,
  };
  if (target.advBizId) input.adv_biz_ids = target.advBizId;
  else input.search = target.search;

  const { items } = await runApifyActor<Record<string, unknown>>(TIKTOK_ADS_ACTOR, input, {
    waitSecs: MAX_TIMEOUT_SECS,
    timeoutSecs: MAX_TIMEOUT_SECS,
    maxItems: limit,
    memoryMbytes: readApifyActorMemoryMbytes("TIKTOK_ADS_MEMORY_MBYTES", APIFY_HEAVY_ACTOR_MEMORY_MBYTES),
  });
  return items.map((row) => ({
    advertiserName: stringField(row, "advertiser_name"),
    item: srTikTokRowToLegacyItem(row),
  }));
}

async function scrapeWithDami(params: {
  target: { search: string; advBizId?: string };
  region: string;
  startDate: string;
  endDate: string;
  limit: number;
}): Promise<ScrapedTikTokRow[]> {
  const { items } = await runApifyActor<Record<string, unknown>>(DAMI_TIKTOK_ACTOR, buildDamiTikTokInput(params), {
    waitSecs: DAMI_TIMEOUT_SECS + 30,
    timeoutSecs: DAMI_TIMEOUT_SECS,
    maxItems: params.limit,
    memoryMbytes: DAMI_MEMORY_MBYTES,
  });
  /** Diagnostic rows ("no results", resolver misses) are never ads. */
  return items
    .filter((row) => row?.recordType === "ad")
    .map((row) => ({
      advertiserName: stringField(row, "advertiserName"),
      ...(stringField(row, "advertiserId") ? { advertiserId: stringField(row, "advertiserId") } : {}),
      item: damiTikTokRowToLegacyItem(row),
    }));
}

/** Saved library URL / numeric id → exact advertiser; otherwise search by name. */
function resolveTikTokSearchTarget(params: {
  brandName: string;
  brandDomain?: string;
  savedTiktok?: string | null;
}): { search: string; advBizId?: string } {
  const raw = params.savedTiktok?.trim().replace(/^@+/, "") ?? "";
  const fallbackName =
    effectiveCompetitorBrandLabel(params.brandName, params.brandDomain) || params.brandName.trim() || "brand";

  if (/^https?:\/\//i.test(raw)) {
    try {
      const u = new URL(raw);
      const advBizId = u.searchParams.get("adv_biz_ids")?.split(",")[0]?.trim();
      const advName = u.searchParams.get("adv_name")?.trim().replace(/^"+|"+$/g, "");
      if (advBizId && /^\d{6,}$/.test(advBizId)) return { search: advName || fallbackName, advBizId };
      if (advName) return { search: normalizeUserAdvertiserQueryToken(advName) || fallbackName };
    } catch {
      /* fall through to the name search */
    }
    return { search: normalizeUserAdvertiserQueryToken(fallbackName) || fallbackName };
  }
  if (/^\d{6,}$/.test(raw)) return { search: fallbackName, advBizId: raw };
  return { search: normalizeUserAdvertiserQueryToken(raw || fallbackName) || fallbackName };
}

function stringField(row: Record<string, unknown>, key: string): string {
  const v = row[key];
  return typeof v === "string" ? v : "";
}

/** dami_studio rows → the field names `tiktokApifyItemToCard` already reads, as for s-r. */
export function damiTikTokRowToLegacyItem(row: Record<string, unknown>): Record<string, unknown> {
  const ymd = (key: string) => stringField(row, key).slice(0, 10);
  const imageUrls = Array.isArray(row.imageUrls) ? row.imageUrls : [];
  const imageUrl = stringField(row, "thumbnailUrl") || (typeof imageUrls[0] === "string" ? imageUrls[0] : "");
  return {
    "AD ID": stringField(row, "adId"),
    "Advertiser Name": stringField(row, "advertiserName"),
    text: stringField(row, "caption"),
    "Ad Dates": [{ FirstShown: ymd("firstShownDate") }, { LastShown: ymd("lastShownDate") }],
    "Ad Audience": { raw: stringField(row, "targetAudienceSize") },
    "Ad Detail URL": stringField(row, "adDetailUrl"),
    ...(stringField(row, "videoUrl") ? { videoUrl: stringField(row, "videoUrl") } : {}),
    ...(imageUrl ? { imageUrl } : {}),
  };
}

/** s-r rows → the field names `tiktokApifyItemToCard` already reads (data_xplorer shape). */
function srTikTokRowToLegacyItem(row: Record<string, unknown>): Record<string, unknown> {
  const media = Array.isArray(row.videos) ? (row.videos[0] as Record<string, unknown> | undefined) : undefined;
  const image = Array.isArray(row.images) ? (row.images[0] as Record<string, unknown> | string | undefined) : undefined;
  const imageUrl =
    (typeof media?.cover_image === "string" && media.cover_image) ||
    (typeof image === "string" ? image : typeof image?.url === "string" ? image.url : undefined) ||
    (typeof image === "object" && typeof image?.image_url === "string" ? image.image_url : undefined);
  return {
    "AD ID": stringField(row, "ad_id") || stringField(row, "creative_id"),
    "Advertiser Name": stringField(row, "advertiser_name"),
    text: stringField(row, "ad_text") || stringField(row, "text"),
    "Ad Dates": [
      { FirstShown: stringField(row, "first_shown") || stringField(row, "first_seen") },
      { LastShown: stringField(row, "last_shown") || stringField(row, "last_seen") },
    ],
    "Ad Audience": { raw: stringField(row, "estimated_audience") },
    "Ad Detail URL": stringField(row, "deeplink"),
    ...(typeof media?.video_url === "string" ? { videoUrl: media.video_url } : row.video_url ? { videoUrl: row.video_url } : {}),
    ...(imageUrl ? { imageUrl } : {}),
  };
}
