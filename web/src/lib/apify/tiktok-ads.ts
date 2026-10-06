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
  const region = SR_TIKTOK_REGIONS.has(regionIn) ? regionIn : "all";
  /** Name searches also return resellers that get filtered out, so ask for a few more. */
  const limit = target.advBizId ? wanted : Math.min(wanted * 2, ADS_LIBRARY_MAX_ITEMS_PER_PLATFORM);

  const input: Record<string, unknown> = {
    region,
    query_type: "1",
    ad_status: "all",
    start_date: startDate,
    end_date: endDate,
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

  const candidates = brandMatchCandidates(
    target.search,
    effectiveCompetitorBrandLabel(params.brandName, params.brandDomain),
    domainBrandLabel(params.brandDomain),
  );
  const rows = target.advBizId
    ? items
    : items.filter((row) => advertiserNameMatchesBrand(stringField(row, "advertiser_name"), candidates));

  return rows
    .slice(0, wanted)
    .map((row, i) =>
      tiktokApifyItemToCard(srTikTokRowToLegacyItem(row), i, {
        brandName: params.brandName,
        brandDomain: params.brandDomain,
      }),
    )
    .filter((c): c is TikTokAdCard => c !== null);
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
