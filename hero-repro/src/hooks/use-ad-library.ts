"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  coerceAdsLibraryResponse,
  mergeAdsLibraryState,
  type AdsLibraryPlatform,
  type AdsLibraryResponse,
} from "@/lib/ad-library/api-types";
import {
  fetchAdsLibraryDeduplicated,
  normalizedBrandForAdsLibraryPayload,
  readAdsLibraryCacheLastKnownGood,
  readAdsLibraryCacheLastKnownGoodForBrandDomain,
  stableAdsLibraryPayloadKey,
  writeAdsLibrarySessionCache,
} from "@/lib/ad-library/deduped-fetch";
import { GOOGLE_ADS_LIBRARY_DEFAULT_RESULTS_LIMIT } from "@/lib/ad-library/constants";
import { ALL_ADS_API_PLATFORMS } from "@/lib/ad-library/channels-to-platforms";
import {
  DEFAULT_GOOGLE_ADS_REGION,
  normalizeGoogleAdsRegion,
  normalizeGoogleAdsResultsLimit,
} from "@/lib/ad-library/google-ads-regions";
import { normalizePinterestAdsCountry } from "@/lib/ad-library/pinterest-regions";
import type { ScrapeRequestFields } from "@/lib/ad-library/scrape-request-fields";

type Brand = { name: string; domain: string; logoUrl?: string };

type Ids = Partial<{
  meta: string;
  metaPageUrl: string;
  google: string;
  linkedin: string;
  microsoft: string;
  /** Profile URL — server derives handle for Pinterest Apify. */
  pinterest: string;
  /** Optional override (handle or URL, normalized server-side). */
  pinterestAdvertiserName: string;
}>;

/**
 * Richer Google Transparency fields (creative images, etc.) via Apify `skipDetails: false`.
 * Default **on** so image previews load. Set `NEXT_PUBLIC_GOOGLE_AD_DETAILS=false` to skip (faster, fewer credits).
 */
function readGoogleDetailsFlag(): boolean {
  return process.env.NEXT_PUBLIC_GOOGLE_AD_DETAILS !== "false";
}

export function useAdLibrary(
  brand: Brand,
  ids: Ids | null,
  adsFilter: "active" | "all",
  /** Only these platforms call `/api/ads/library` (from `?channels=` on competitor page). */
  adsPlatforms: AdsLibraryPlatform[],
  enabled = true,
  /** TikTok Ads Library regional filter (Apify actor); default `all`. */
  tiktokRegion = "all",
  /** Google Transparency `region` (default `anywhere` = all countries). */
  googleRegion = DEFAULT_GOOGLE_ADS_REGION,
  /** Google `resultsLimit` (default 50; max 500). */
  googleResultsLimit = GOOGLE_ADS_LIBRARY_DEFAULT_RESULTS_LIMIT,
  /** Per-platform Apify options (max ads, dates, country, etc.). */
  scrapeFields: ScrapeRequestFields,
  /** Pinterest transparency actor country (EU-27, BR, TR; default server `DE`). */
  pinterestCountry?: string
) {
  const [data, setData] = useState<AdsLibraryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [googleRefreshing, setGoogleRefreshing] = useState(false);
  const [metaRefreshing, setMetaRefreshing] = useState(false);
  const [tiktokRefreshing, setTiktokRefreshing] = useState(false);
  const [pinterestRefreshing, setPinterestRefreshing] = useState(false);
  const [linkedinRefreshing, setLinkedinRefreshing] = useState(false);
  const [microsoftRefreshing, setMicrosoftRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const platformsSorted = useMemo(
    () => [...adsPlatforms].sort() as AdsLibraryPlatform[],
    [adsPlatforms]
  );

  const googleRegionNorm = normalizeGoogleAdsRegion(googleRegion);
  const googleResultsLimitNorm = normalizeGoogleAdsResultsLimit(googleResultsLimit);

  const payload = useMemo(
    () => ({
      brand: normalizedBrandForAdsLibraryPayload({
        name: brand.name,
        domain: brand.domain,
        logoUrl: brand.logoUrl,
      }),
      ids: ids ?? {},
      metaStatus: adsFilter === "all" ? ("ALL" as const) : ("ACTIVE" as const),
      googleGetAdDetails: readGoogleDetailsFlag(),
      platforms: platformsSorted,
      ...(platformsSorted.includes("tiktok") ? { tiktokRegion } : {}),
      ...(platformsSorted.includes("google")
        ? { googleRegion: googleRegionNorm, googleResultsLimit: googleResultsLimitNorm }
        : {}),
      /** Always send ISO2 when Pinterest is requested so `/api/ads/library` never falls back to DE from a missing body field. */
      ...(platformsSorted.includes("pinterest")
        ? { pinterestCountry: normalizePinterestAdsCountry(pinterestCountry) }
        : {}),
      metaMaxAds: scrapeFields.metaMaxAds,
      metaCountry: scrapeFields.metaCountry.trim().toUpperCase() || "US",
      metaStartDate: scrapeFields.metaStartDate.trim(),
      metaEndDate: scrapeFields.metaEndDate.trim(),
      metaSortBy: scrapeFields.metaSortBy.trim() || "impressions_desc",
      linkedinMaxAds: scrapeFields.linkedinMaxAds,
      linkedinDateRange: scrapeFields.linkedinDateRange.trim(),
      linkedinCountryCode: scrapeFields.linkedinCountryCode.trim(),
      tiktokMaxAds: scrapeFields.tiktokMaxAds,
      tiktokStartDate: scrapeFields.tiktokStartDate.trim(),
      tiktokEndDate: scrapeFields.tiktokEndDate.trim(),
      microsoftMaxSearchResults: scrapeFields.microsoftMaxSearchResults,
      microsoftCountryCode: scrapeFields.microsoftCountryCode.trim().replace(/\D/g, "") || "66",
      microsoftStartDate: scrapeFields.microsoftStartDate.trim(),
      microsoftEndDate: scrapeFields.microsoftEndDate.trim(),
      pinterestMaxResults: scrapeFields.pinterestMaxResults,
      pinterestStartDate: scrapeFields.pinterestStartDate.trim(),
      pinterestEndDate: scrapeFields.pinterestEndDate.trim(),
      pinterestGender: scrapeFields.pinterestGender.trim(),
      pinterestAge: scrapeFields.pinterestAge.trim(),
    }),
    [
      brand.name,
      brand.domain,
      brand.logoUrl,
      ids,
      adsFilter,
      platformsSorted,
      tiktokRegion,
      googleRegionNorm,
      googleResultsLimitNorm,
      pinterestCountry,
      scrapeFields,
    ]
  );
  const payloadKey = useMemo(() => stableAdsLibraryPayloadKey(payload), [payload]);

  /**
   * Loads ads from Apify via POST /api/ads/library. Pass `skipCache: true` for rescrape
   * (default). Initial page load uses `hydrateFromStorage` only — no network unless the user
   * rescrapes or completes the post-confirm one-shot fetch from the competitor page.
   */
  const load = useCallback(
    async (opts?: { skipCache?: boolean; platforms?: AdsLibraryPlatform[] }) => {
      const platforms = opts?.platforms;
      const partial =
        platforms != null &&
        platforms.length > 0 &&
        platforms.length < ALL_ADS_API_PLATFORMS.length;
      const skipCache = opts?.skipCache ?? false;

      if (partial) {
        const onlyGoogle =
          platforms.length === 1 && platforms[0] === "google";
        const onlyMeta = platforms.length === 1 && platforms[0] === "meta";
        const onlyTikTok = platforms.length === 1 && platforms[0] === "tiktok";
        const onlyPinterest = platforms.length === 1 && platforms[0] === "pinterest";
        const onlyLinkedin = platforms.length === 1 && platforms[0] === "linkedin";
        const onlyMicrosoft = platforms.length === 1 && platforms[0] === "microsoft";
        if (onlyGoogle) setGoogleRefreshing(true);
        else if (onlyMeta) setMetaRefreshing(true);
        else if (onlyTikTok) setTiktokRefreshing(true);
        else if (onlyPinterest) setPinterestRefreshing(true);
        else if (onlyLinkedin) setLinkedinRefreshing(true);
        else if (onlyMicrosoft) setMicrosoftRefreshing(true);
      } else {
        setLoading(true);
      }
      setFetchError(null);
      try {
        const body: Record<string, unknown> = { ...payload };
        if (platforms?.length) {
          body.platforms = [...platforms].sort();
        }
        const { response: json, httpOk } = await fetchAdsLibraryDeduplicated(body, {
          skipCache: opts?.skipCache ?? false,
        });
        let mergedState: AdsLibraryResponse | null = null;
        setData((prev) => {
          const merged = mergeAdsLibraryState(prev, json);
          mergedState = merged;
          return merged;
        });
        if (mergedState) {
          writeAdsLibrarySessionCache(payloadKey, {
            response: coerceAdsLibraryResponse(mergedState),
            httpOk,
          });
        }
        if (!httpOk && "error" in json && json.error) {
          setFetchError(json.error);
        } else if (!httpOk) {
          setFetchError("Request failed");
        }
      } catch (e) {
        setFetchError(e instanceof Error ? e.message : "Failed to load ads");
        if (!partial) setData(null);
      } finally {
        setLoading(false);
        setGoogleRefreshing(false);
        setMetaRefreshing(false);
        setTiktokRefreshing(false);
        setPinterestRefreshing(false);
        setLinkedinRefreshing(false);
        setMicrosoftRefreshing(false);
      }
    },
    [payload, payloadKey]
  );

  const hydrateFromStorage = useCallback(() => {
    const exact = readAdsLibraryCacheLastKnownGood(payloadKey);
    if (exact) {
      setData(mergeAdsLibraryState(null, exact.response));
      setFetchError(null);
      setLoading(false);
      setGoogleRefreshing(false);
      setMetaRefreshing(false);
      setTiktokRefreshing(false);
      setPinterestRefreshing(false);
      setLinkedinRefreshing(false);
      setMicrosoftRefreshing(false);
      return;
    }
    /** Payload keys changed when new fields were added (e.g. Google region); recover older saves. */
    const legacy = readAdsLibraryCacheLastKnownGoodForBrandDomain(brand.domain);
    if (legacy) {
      setData(mergeAdsLibraryState(null, legacy.response));
      setFetchError(null);
      try {
        writeAdsLibrarySessionCache(payloadKey, legacy);
      } catch {
        /* migrate best-effort */
      }
    } else {
      setData(null);
    }
    setLoading(false);
    setGoogleRefreshing(false);
    setMetaRefreshing(false);
    setTiktokRefreshing(false);
    setPinterestRefreshing(false);
    setLinkedinRefreshing(false);
    setMicrosoftRefreshing(false);
  }, [payloadKey, brand.domain]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      setGoogleRefreshing(false);
      setMetaRefreshing(false);
      setTiktokRefreshing(false);
      setPinterestRefreshing(false);
      setLinkedinRefreshing(false);
      setMicrosoftRefreshing(false);
      return;
    }
    hydrateFromStorage();
  }, [enabled, hydrateFromStorage]);

  const configured = data?.configured !== false;

  /** Re-run Apify scrapes for all selected platforms (uses credits). */
  const refresh = useCallback(() => load({ skipCache: true }), [load]);

  /** Re-fetch only Google / YouTube — does not call Meta or LinkedIn (saves credits). */
  const refreshGoogleAds = useCallback(
    () => load({ skipCache: true, platforms: ["google"] }),
    [load]
  );

  /** Re-fetch only Meta — respects `adsFilter` → `metaStatus` (ACTIVE vs ALL). */
  const refreshMetaAds = useCallback(
    () => load({ skipCache: true, platforms: ["meta"] }),
    [load]
  );

  const refreshTikTokAds = useCallback(
    () => load({ skipCache: true, platforms: ["tiktok"] }),
    [load]
  );

  const refreshPinterestAds = useCallback(
    () => load({ skipCache: true, platforms: ["pinterest"] }),
    [load]
  );

  const refreshLinkedInAds = useCallback(
    () => load({ skipCache: true, platforms: ["linkedin"] }),
    [load]
  );

  const refreshMicrosoftAds = useCallback(
    () => load({ skipCache: true, platforms: ["microsoft"] }),
    [load]
  );

  return {
    data,
    loading,
    googleRefreshing,
    metaRefreshing,
    tiktokRefreshing,
    pinterestRefreshing,
    linkedinRefreshing,
    microsoftRefreshing,
    fetchError,
    configured,
    refresh,
    refreshGoogleAds,
    refreshMetaAds,
    refreshTikTokAds,
    refreshPinterestAds,
    refreshLinkedInAds,
    refreshMicrosoftAds,
  };
}
