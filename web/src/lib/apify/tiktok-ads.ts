import { runApifyActor } from "@/lib/apify/client";
import { ADS_LIBRARY_MAX_ITEMS_PER_PLATFORM } from "@/lib/ad-library/constants";
import { DEFAULT_TIKTOK_ADS_REGION, normalizeTikTokAdsRegion } from "@/lib/ad-library/tiktok-regions";
import type { TikTokAdCard } from "@/lib/ad-library/normalize";
import { tiktokApifyItemToCard } from "@/lib/ad-library/normalize";

const DEFAULT_TIKTOK_ACTOR = "data_xplorer/tiktok-ads-library-pay-per-event";
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
  region?: string;
  queryType?: string;
  maxAds: number;
  fetchDetails?: boolean;
  startDate?: string;
  endDate?: string;
}): Promise<TikTokAdCard[]> {
  const actorId = process.env.APIFY_TIKTOK_ADS_ACTOR?.trim() || DEFAULT_TIKTOK_ACTOR;
  const maxAds = Math.max(1, Math.min(params.maxAds, ADS_LIBRARY_MAX_ITEMS_PER_PLATFORM));
  const { startDate, endDate } = pickStartEndDates(params.startDate, params.endDate);

  const query = params.brandName.trim().length
    ? `"${params.brandName.trim().replace(/"/g, "\\\"")}"`
    : "brand";

  const region = normalizeTikTokAdsRegion(params.region) || DEFAULT_TIKTOK_ADS_REGION;

  const { items } = await runApifyActor<Record<string, unknown>>(
    actorId,
    {
      region,
      startDate,
      endDate,
      queryType: params.queryType ?? "2",
      query,
      maxAds,
      fetchDetails: params.fetchDetails ?? true,
      proxyConfiguration: {
        useApifyProxy: true,
        apifyProxyGroups: ["RESIDENTIAL"],
      },
    },
    {
      waitSecs: MAX_TIMEOUT_SECS,
      timeoutSecs: MAX_TIMEOUT_SECS,
      maxItems: maxAds,
    }
  );

  return items
    .map((raw, i) => tiktokApifyItemToCard(raw, i))
    .filter((c): c is TikTokAdCard => c !== null);
}
