import { effectiveCompetitorBrandLabel } from "@/lib/ad-library/competitor-brand-display";
import { normalizeUserAdvertiserQueryToken } from "@/lib/ad-library/normalize";

export type TikTokApifyLibraryQuery = {
  queryType: string;
  query: string;
  advertiserBizId?: string;
};

/** Parse `adv_biz_ids`, `adv_name`, `query_type` from a TikTok Ads Library URL. */
export function parseTikTokAdsLibraryUrl(url: string): {
  advertiserBizId?: string;
  advName?: string;
  queryType?: string;
} {
  try {
    const u = new URL(url.trim());
    if (!/library\.tiktok\.com$/i.test(u.hostname) && !u.hostname.endsWith(".library.tiktok.com")) {
      return {};
    }
    const bizId = u.searchParams.get("adv_biz_ids")?.trim();
    const advName = u.searchParams.get("adv_name")?.trim();
    const queryType = u.searchParams.get("query_type")?.trim();
    return {
      ...(bizId && /^\d{6,}$/.test(bizId) ? { advertiserBizId: bizId } : {}),
      ...(advName ? { advName: decodeURIComponent(advName.replace(/\+/g, " ")) } : {}),
      ...(queryType ? { queryType } : {}),
    };
  } catch {
    return {};
  }
}

/**
 * Build `queryType`, `query`, and optional `advertiserBizId` for
 * `data_xplorer/tiktok-ads-scraper` library mode.
 */
export function buildTikTokApifyLibraryQuery(params: {
  brandName: string;
  brandDomain?: string;
  savedTiktok?: string | null;
}): TikTokApifyLibraryQuery {
  const raw = params.savedTiktok?.trim().replace(/^@+/, "") ?? "";
  const searchBrand =
    effectiveCompetitorBrandLabel(params.brandName, params.brandDomain) || params.brandName.trim();

  if (raw && /^https?:\/\//i.test(raw)) {
    const parsed = parseTikTokAdsLibraryUrl(raw);
    return {
      queryType: "url",
      query: raw,
      ...(parsed.advertiserBizId ? { advertiserBizId: parsed.advertiserBizId } : {}),
    };
  }

  if (raw && /^\d{6,}$/.test(raw)) {
    const nameToken = normalizeUserAdvertiserQueryToken(searchBrand);
    return {
      queryType: "2",
      query: nameToken.length > 0 ? nameToken : "brand",
      advertiserBizId: raw,
    };
  }

  /** Always `query_type=2`; omit `"` wrappers — quoted `adv_name` often matches zero rows. */
  const token = normalizeUserAdvertiserQueryToken(raw.length > 0 ? raw : searchBrand);
  if (!token.length) {
    return { query: "brand", queryType: "2" };
  }
  return { query: token, queryType: "2" };
}
