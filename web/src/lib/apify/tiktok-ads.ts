import { runApifyActor } from "@/lib/apify/client";
import { APIFY_HEAVY_ACTOR_MEMORY_MBYTES, readApifyActorMemoryMbytes } from "@/lib/apify/memory";
import { ADS_LIBRARY_MAX_ITEMS_PER_PLATFORM } from "@/lib/ad-library/constants";
import { DEFAULT_TIKTOK_ADS_REGION, normalizeTikTokAdsRegion } from "@/lib/ad-library/tiktok-regions";
import type { TikTokAdCard } from "@/lib/ad-library/normalize";
import { tiktokApifyItemToCard, normalizeUserAdvertiserQueryToken } from "@/lib/ad-library/normalize";
import { buildTikTokApifyLibraryQuery } from "@/lib/apify/tiktok-apify-input";
import {
  buildLexisTikTokActorInput,
  isLexisTikTokActor,
  LEXIS_TIKTOK_ACTOR,
} from "@/lib/apify/tiktok-lexis-input";

const DEFAULT_TIKTOK_ACTOR = LEXIS_TIKTOK_ACTOR;
const MAX_TIMEOUT_SECS = 600;

function formatIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function pickStartEndDates(
  startIn?: string,
  endIn?: string,
): { startDate: string; endDate: string } | { omitDateFilter: true } {
  const startTrim = startIn?.trim() ?? "";
  const endTrim = endIn?.trim() ?? "";
  const hasStart = startTrim.length > 0 && ISO_DATE.test(startTrim);
  const hasEnd = endTrim.length > 0 && ISO_DATE.test(endTrim);
  if (!hasStart && !hasEnd) {
    return { omitDateFilter: true };
  }
  const end = new Date();
  const start = new Date();
  start.setFullYear(start.getFullYear() - 1);
  const defStart = formatIsoDate(start);
  const defEnd = formatIsoDate(end);
  const s = hasStart ? startTrim : defStart;
  let e = hasEnd ? endTrim : defEnd;
  if (s > e) {
    e = s;
  }
  return { startDate: s, endDate: e };
}

export async function scrapeTikTokAdsLibrary(params: {
  brandName: string;
  brandDomain?: string;
  savedTiktok?: string | null;
  region?: string;
  maxAds: number;
  fetchDetails?: boolean;
  startDate?: string;
  endDate?: string;
}): Promise<TikTokAdCard[]> {
  const actorId = process.env.APIFY_TIKTOK_ADS_ACTOR?.trim() || DEFAULT_TIKTOK_ACTOR;
  const maxAds = Math.max(1, Math.min(params.maxAds, ADS_LIBRARY_MAX_ITEMS_PER_PLATFORM));
  const dateRange = pickStartEndDates(params.startDate, params.endDate);
  const actorDateInput =
    "omitDateFilter" in dateRange
      ? {}
      : { startDate: dateRange.startDate, endDate: dateRange.endDate };

  const region = normalizeTikTokAdsRegion(params.region) || DEFAULT_TIKTOK_ADS_REGION;

  const tiktokResidential =
    typeof process.env.APIFY_TIKTOK_USE_RESIDENTIAL === "string" &&
    ["0", "false", "no", "off"].includes(process.env.APIFY_TIKTOK_USE_RESIDENTIAL.trim().toLowerCase())
      ? false
      : true;

  let confirmedAdvertiserQuery: string | undefined;
  let actorInput: Record<string, unknown>;

  if (isLexisTikTokActor(actorId)) {
    /** Lexis: omit date filters — TikTok library advertiser search returns 0 rows with our rolling ISO windows. */
    const lexis = buildLexisTikTokActorInput({
      brandName: params.brandName,
      brandDomain: params.brandDomain,
      savedTiktok: params.savedTiktok,
      region,
      maxAds,
    });
    confirmedAdvertiserQuery = lexis.confirmedAdvertiserQuery;
    actorInput = lexis.input as unknown as Record<string, unknown>;
  } else {
    const { query, queryType, advertiserBizId } = buildTikTokApifyLibraryQuery({
      brandName: params.brandName,
      brandDomain: params.brandDomain,
      savedTiktok: params.savedTiktok,
    });

    const hadUserSavedTiktok = Boolean(params.savedTiktok?.trim());
    if (
      hadUserSavedTiktok &&
      queryType === "2" &&
      query.trim() &&
      !/^https?:\/\//i.test(query.trim()) &&
      !/^\d{6,}$/.test(query.trim())
    ) {
      confirmedAdvertiserQuery = normalizeUserAdvertiserQueryToken(query);
    }

    actorInput = {
      mode: "library",
      region,
      ...actorDateInput,
      queryType,
      query,
      ...(advertiserBizId ? { advertiserBizId } : {}),
      maxAds,
      fetchDetails: params.fetchDetails ?? true,
      proxyConfiguration: {
        useApifyProxy: true,
        apifyProxyGroups: tiktokResidential ? ["RESIDENTIAL"] : [],
      },
    };
  }

  const { items } = await runApifyActor<Record<string, unknown>>(actorId, actorInput, {
    waitSecs: MAX_TIMEOUT_SECS,
    timeoutSecs: MAX_TIMEOUT_SECS,
    maxItems: maxAds,
    memoryMbytes: readApifyActorMemoryMbytes("TIKTOK_ADS_MEMORY_MBYTES", APIFY_HEAVY_ACTOR_MEMORY_MBYTES),
  });

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
