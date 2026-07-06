import { runApifyActor } from "@/lib/apify/client";
import { APIFY_HEAVY_ACTOR_MEMORY_MBYTES, readApifyActorMemoryMbytes } from "@/lib/apify/memory";
import { ADS_LIBRARY_MAX_ITEMS_PER_PLATFORM } from "@/lib/ad-library/constants";
import { DEFAULT_TIKTOK_ADS_REGION, normalizeTikTokAdsRegion } from "@/lib/ad-library/tiktok-regions";
import type { TikTokAdCard } from "@/lib/ad-library/normalize";
import { tiktokApifyItemToCard, normalizeUserAdvertiserQueryToken } from "@/lib/ad-library/normalize";
import { effectiveCompetitorBrandLabel } from "@/lib/ad-library/competitor-brand-display";

const TIKTOK_ADS_ACTOR = "data_xplorer/tiktok-ads-scraper";
const MAX_TIMEOUT_SECS = 600;

function formatIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Actor `query`: **2** = advertiser name / biz id · **url** = paste library URL. */
function buildTikTokApifyQuery(params: {
  brandName: string;
  brandDomain?: string;
  savedTiktok?: string | null;
}): {
  query: string;
  queryType: string;
} {
  const raw = params.savedTiktok?.trim().replace(/^@+/, "") ?? "";
  const searchBrand = effectiveCompetitorBrandLabel(params.brandName, params.brandDomain) || params.brandName.trim();

  if (raw && /^https?:\/\//i.test(raw)) {
    return { query: raw, queryType: "url" };
  }
  if (raw && /^\d{6,}$/.test(raw)) {
    return { query: raw, queryType: "2" };
  }

  /** Always `query_type=2`; **omit** `"` wrappers — TikTok’s `adv_name=%22Brand%22` often matches zero rows vs plain `adv_name=Brand`. */
  const token = normalizeUserAdvertiserQueryToken(raw.length > 0 ? raw : searchBrand);
  if (!token.length) {
    return { query: "brand", queryType: "2" };
  }
  return { query: token, queryType: "2" };
}

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
  /** Saved TikTok Ads Library advertiser token / pasted library URL — same `query_type=2` exact‑match semantics as brand name unless URL or numeric id. */
  savedTiktok?: string | null;
  region?: string;
  maxAds: number;
  fetchDetails?: boolean;
  startDate?: string;
  endDate?: string;
}): Promise<TikTokAdCard[]> {
  const maxAds = Math.max(1, Math.min(params.maxAds, ADS_LIBRARY_MAX_ITEMS_PER_PLATFORM));
  const { startDate, endDate } = pickStartEndDates(params.startDate, params.endDate);

  const { query, queryType } = buildTikTokApifyQuery({
    brandName: params.brandName,
    brandDomain: params.brandDomain,
    savedTiktok: params.savedTiktok,
  });

  const hadUserSavedTiktok = Boolean(params.savedTiktok?.trim());
  let confirmedAdvertiserQuery: string | undefined;
  if (
    hadUserSavedTiktok &&
    queryType === "2" &&
    query.trim() &&
    !/^https?:\/\//i.test(query.trim()) &&
    !/^\d{6,}$/.test(query.trim())
  ) {
    confirmedAdvertiserQuery = normalizeUserAdvertiserQueryToken(query);
  }

  const region = normalizeTikTokAdsRegion(params.region) || DEFAULT_TIKTOK_ADS_REGION;

  /**Residential exits can trip TLS timeouts; set APIFY_TIKTOK_USE_RESIDENTIAL=false for datacenter (actor default — often more stable). */
  const tiktokResidential =
    typeof process.env.APIFY_TIKTOK_USE_RESIDENTIAL === "string" &&
    ["0", "false", "no", "off"].includes(process.env.APIFY_TIKTOK_USE_RESIDENTIAL.trim().toLowerCase())
      ? false
      : true;

  const { items } = await runApifyActor<Record<string, unknown>>(
    TIKTOK_ADS_ACTOR,
    {
      mode: "library",
      region,
      startDate,
      endDate,
      queryType,
      query,
      maxAds,
      fetchDetails: params.fetchDetails ?? true,
      proxyConfiguration: {
        useApifyProxy: true,
        apifyProxyGroups: tiktokResidential ? ["RESIDENTIAL"] : [],
      },
    },
    {
      waitSecs: MAX_TIMEOUT_SECS,
      timeoutSecs: MAX_TIMEOUT_SECS,
      maxItems: maxAds,
      memoryMbytes: readApifyActorMemoryMbytes("TIKTOK_ADS_MEMORY_MBYTES", APIFY_HEAVY_ACTOR_MEMORY_MBYTES),
    }
  );

  return items
    .map((raw, i) =>
      tiktokApifyItemToCard(raw, i, {
        brandName: params.brandName,
        brandDomain: params.brandDomain,
        ...(confirmedAdvertiserQuery ? { confirmedAdvertiserQuery } : {}),
      })
    )
    .filter((c): c is TikTokAdCard => c !== null);
}
