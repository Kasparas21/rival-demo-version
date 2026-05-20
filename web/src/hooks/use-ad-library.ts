"use client";

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
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
import { countLibraryAdsForPlatform } from "@/lib/ad-library/library-response-utils";
import {
  DEFAULT_GOOGLE_ADS_REGION,
  normalizeGoogleAdsRegion,
  normalizeGoogleAdsResultsLimit,
} from "@/lib/ad-library/google-ads-regions";
import { normalizePinterestAdsCountry } from "@/lib/ad-library/pinterest-regions";
import { DEFAULT_TIKTOK_ADS_REGION } from "@/lib/ad-library/tiktok-regions";
import type { ScrapeRequestFields } from "@/lib/ad-library/scrape-request-fields";
import { readGoogleAdDetailsPublicFlag } from "@/lib/ad-library/public-env-flags";
import { clearFreshDiscoveryScan } from "@/lib/ad-library/discovery-scan-guard";
import {
  ADS_LIBRARY_UPDATED_EVENT,
  markPendingStrategyRefresh,
  type AdsLibraryUpdatedDetail,
} from "@/lib/strategy-overview/ads-library-strategy-bridge";

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
  /** Snapchat EU gallery keyword (saved competitor row). */
  snapchat: string;
  /** TikTok advertiser / exact-match token or library URL — server uses same `query_type=2` quoting as brand unless URL or numeric id. */
  tiktok: string;
}>;

export function useAdLibrary(
  brand: Brand,
  ids: Ids | null,
  /** Only these platforms call `/api/ads/library` (from `?channels=` on competitor page). */
  adsPlatforms: AdsLibraryPlatform[],
  enabled = true,
  /** TikTok Ads Library regional filter (Apify actor). */
  tiktokRegion = DEFAULT_TIKTOK_ADS_REGION,
  /** Google Transparency `region` (default `anywhere` = all countries). */
  googleRegion = DEFAULT_GOOGLE_ADS_REGION,
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
  const [snapchatRefreshing, setSnapchatRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const sessionRef = useRef(0);
  const loadAbortRef = useRef<AbortController | null>(null);
  const persistRecoveryKeyRef = useRef<string | null>(null);
  /** Mirrors latest `data` so merges after `await fetch` use the correct prior state (functional `setData` + session write were racing React 18 batching). */
  const dataRef = useRef<AdsLibraryResponse | null>(null);

  useLayoutEffect(() => {
    dataRef.current = data;
  }, [data]);

  /**
   * Must match `/dashboard/searching` + `channelsQueryToAdsPlatforms`: canonical API order inside
   * `ALL_ADS_API_PLATFORMS`. Alphabetical `.sort()` breaks `stableAdsLibraryPayloadKey()` vs scan cache.
   */
  const platformsSorted = useMemo(
    () => ALL_ADS_API_PLATFORMS.filter((p) => adsPlatforms.includes(p)),
    [adsPlatforms]
  );

  const googleRegionNorm = normalizeGoogleAdsRegion(googleRegion);
  const googleResultsLimitNorm = normalizeGoogleAdsResultsLimit(GOOGLE_ADS_LIBRARY_DEFAULT_RESULTS_LIMIT);

  const payload = useMemo(
    () => ({
      brand: normalizedBrandForAdsLibraryPayload({
        name: brand.name,
        domain: brand.domain,
        logoUrl: brand.logoUrl,
      }),
      ids: ids ?? {},
      metaStatus: "ACTIVE" as const,
      googleGetAdDetails: readGoogleAdDetailsPublicFlag(),
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
      ...(platformsSorted.includes("snapchat")
        ? {
            snapchatMaxItems: scrapeFields.snapchatMaxItems,
            snapchatCountry: scrapeFields.snapchatCountry.trim().toUpperCase(),
            snapchatStartDate: scrapeFields.snapchatStartDate.trim(),
            snapchatEndDate: scrapeFields.snapchatEndDate.trim(),
          }
        : {}),
    }),
    [
      brand.name,
      brand.domain,
      brand.logoUrl,
      ids,
      platformsSorted,
      tiktokRegion,
      googleRegionNorm,
      googleResultsLimitNorm,
      pinterestCountry,
      scrapeFields,
    ]
  );
  const payloadKey = useMemo(() => stableAdsLibraryPayloadKey(payload), [payload]);

  useLayoutEffect(() => {
    sessionRef.current += 1;
    persistRecoveryKeyRef.current = null;
    loadAbortRef.current?.abort();
  }, [payloadKey, enabled]);

  /**
   * Loads ads via POST /api/ads/library. `skipCache: true` forces fresh Apify runs (uses credits).
   * `skipCache: false` uses Supabase `ads_cache` when logged in. Cached ads paint instantly on revisit;
   * network fetch runs only when no local cache exists (not on every competitor switch).
   */
  const load = useCallback(
    async (opts?: { skipCache?: boolean; platforms?: AdsLibraryPlatform[]; background?: boolean }) => {
      const platforms = opts?.platforms;
      const isBackground = opts?.background === true;
      const partial =
        platforms != null &&
        platforms.length > 0 &&
        platforms.length < ALL_ADS_API_PLATFORMS.length;

      loadAbortRef.current?.abort();
      const ac = new AbortController();
      loadAbortRef.current = ac;

      if (!isBackground) {
        if (partial) {
          const onlyGoogle =
            platforms.length === 1 && platforms[0] === "google";
          const onlyMeta = platforms.length === 1 && platforms[0] === "meta";
          const onlyTikTok = platforms.length === 1 && platforms[0] === "tiktok";
          const onlyPinterest = platforms.length === 1 && platforms[0] === "pinterest";
          const onlyLinkedin = platforms.length === 1 && platforms[0] === "linkedin";
          const onlyMicrosoft = platforms.length === 1 && platforms[0] === "microsoft";
          const onlySnapchat = platforms.length === 1 && platforms[0] === "snapchat";
          if (onlyGoogle) setGoogleRefreshing(true);
          else if (onlyMeta) setMetaRefreshing(true);
          else if (onlyTikTok) setTiktokRefreshing(true);
          else if (onlyPinterest) setPinterestRefreshing(true);
          else if (onlyLinkedin) setLinkedinRefreshing(true);
          else if (onlyMicrosoft) setMicrosoftRefreshing(true);
          else if (onlySnapchat) setSnapchatRefreshing(true);
        } else {
          setLoading(true);
        }
      }
      setFetchError(null);
      try {
        const body: Record<string, unknown> = { ...payload };
        if (platforms?.length) {
          body.platforms = [...platforms].sort();
        }
        const forceFresh = opts?.skipCache === true;
        /** Opening a competitor page must never trigger Apify — only `skipCache: true` (manual refresh / discovery). */
        const cacheOnly = !forceFresh;
        let { response: json, httpOk } = await fetchAdsLibraryDeduplicated(body, {
          skipCache: forceFresh,
          cacheOnly,
          clientSkipReadCache: isBackground,
          signal: ac.signal,
        });
        if (loadAbortRef.current !== ac) return;

        const domain = brand.domain.trim();
        const shouldTryPersistRecovery =
          !opts?.skipCache &&
          !partial &&
          !isBackground &&
          httpOk &&
          domain.length > 0 &&
          persistRecoveryKeyRef.current !== payloadKey;

        if (shouldTryPersistRecovery) {
          const shell = coerceAdsLibraryResponse(
            mergeAdsLibraryState(dataRef.current, json)
          );
          const totalAds = ALL_ADS_API_PLATFORMS.reduce(
            (sum, pl) => sum + countLibraryAdsForPlatform(pl, shell),
            0
          );
          if (totalAds === 0) {
            persistRecoveryKeyRef.current = payloadKey;
            try {
              await fetch("/api/competitor/ads-library/ensure-persisted", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ domain }),
              });
              const retry = await fetchAdsLibraryDeduplicated(body, {
                skipCache: false,
                clientSkipReadCache: true,
                signal: ac.signal,
              });
              if (loadAbortRef.current === ac) {
                json = retry.response;
                httpOk = retry.httpOk;
              }
            } catch {
              /* recovery best-effort */
            }
          }
        }

        const merged = mergeAdsLibraryState(dataRef.current, json);
        setData(merged);
        writeAdsLibrarySessionCache(payloadKey, {
          response: coerceAdsLibraryResponse(merged),
          httpOk,
        });
        if (!httpOk && "error" in json && json.error) {
          setFetchError(json.error);
        } else if (!httpOk) {
          setFetchError("Request failed");
        } else if (httpOk && typeof window !== "undefined") {
          const d = brand.domain.trim();
          markPendingStrategyRefresh(d);
          try {
            window.dispatchEvent(
              new CustomEvent<AdsLibraryUpdatedDetail>(ADS_LIBRARY_UPDATED_EVENT, {
                detail: { domain: d },
              })
            );
          } catch {
            /* ignore */
          }
        }
      } catch (e) {
        const aborted =
          (e instanceof DOMException && e.name === "AbortError") ||
          (e instanceof Error && e.name === "AbortError");
        if (aborted) return;
        if (loadAbortRef.current !== ac) return;
        setFetchError(e instanceof Error ? e.message : "Failed to load ads");
        if (!partial && !isBackground) setData(null);
      } finally {
        if (loadAbortRef.current !== ac) return;
        if (!isBackground) {
          setLoading(false);
          setGoogleRefreshing(false);
          setMetaRefreshing(false);
          setTiktokRefreshing(false);
          setPinterestRefreshing(false);
          setLinkedinRefreshing(false);
          setMicrosoftRefreshing(false);
          setSnapchatRefreshing(false);
        }
      }
    },
    [payload, payloadKey, brand.domain]
  );

  useLayoutEffect(() => {
    if (!enabled) {
      setLoading(false);
      setGoogleRefreshing(false);
      setMetaRefreshing(false);
      setTiktokRefreshing(false);
      setPinterestRefreshing(false);
      setLinkedinRefreshing(false);
      setMicrosoftRefreshing(false);
      setSnapchatRefreshing(false);
      return;
    }
    const snapshot = sessionRef.current;
    const exact = readAdsLibraryCacheLastKnownGood(payloadKey);
    if (exact) {
      if (snapshot !== sessionRef.current) return;
      setData(mergeAdsLibraryState(null, exact.response));
      setFetchError(null);
      setLoading(false);
      setGoogleRefreshing(false);
      setMetaRefreshing(false);
      setTiktokRefreshing(false);
      setPinterestRefreshing(false);
      setLinkedinRefreshing(false);
      setMicrosoftRefreshing(false);
      setSnapchatRefreshing(false);
      return;
    }
    const legacy = readAdsLibraryCacheLastKnownGoodForBrandDomain(brand.domain);
    if (legacy) {
      if (snapshot !== sessionRef.current) return;
      setData(mergeAdsLibraryState(null, legacy.response));
      setFetchError(null);
      try {
        writeAdsLibrarySessionCache(payloadKey, legacy);
      } catch {
        /* migrate best-effort */
      }
      setLoading(false);
      setGoogleRefreshing(false);
      setMetaRefreshing(false);
      setTiktokRefreshing(false);
      setPinterestRefreshing(false);
      setLinkedinRefreshing(false);
      setMicrosoftRefreshing(false);
      setSnapchatRefreshing(false);
      return;
    }
    setData(null);
    setLoading(true);
    void load({ skipCache: false });
  }, [enabled, payloadKey, brand.domain, load]);

  const configured = data?.configured !== false;

  /** Re-run Apify scrapes for all selected platforms (uses credits). */
  const refresh = useCallback(() => {
    clearFreshDiscoveryScan(brand.domain);
    return load({ skipCache: true });
  }, [load, brand.domain]);

  /** Re-fetch only Google / YouTube — does not call Meta or LinkedIn (saves credits). */
  const refreshGoogleAds = useCallback(() => {
    clearFreshDiscoveryScan(brand.domain);
    return load({ skipCache: true, platforms: ["google"] });
  }, [load, brand.domain]);

  /** Re-fetch only Meta (`metaStatus`: active ads). */
  const refreshMetaAds = useCallback(() => {
    clearFreshDiscoveryScan(brand.domain);
    return load({ skipCache: true, platforms: ["meta"] });
  }, [load, brand.domain]);

  const refreshTikTokAds = useCallback(() => {
    clearFreshDiscoveryScan(brand.domain);
    return load({ skipCache: true, platforms: ["tiktok"] });
  }, [load, brand.domain]);

  const refreshPinterestAds = useCallback(() => {
    clearFreshDiscoveryScan(brand.domain);
    return load({ skipCache: true, platforms: ["pinterest"] });
  }, [load, brand.domain]);

  const refreshLinkedInAds = useCallback(() => {
    clearFreshDiscoveryScan(brand.domain);
    return load({ skipCache: true, platforms: ["linkedin"] });
  }, [load, brand.domain]);

  const refreshMicrosoftAds = useCallback(() => {
    clearFreshDiscoveryScan(brand.domain);
    return load({ skipCache: true, platforms: ["microsoft"] });
  }, [load, brand.domain]);

  const refreshSnapchatAds = useCallback(() => {
    clearFreshDiscoveryScan(brand.domain);
    return load({ skipCache: true, platforms: ["snapchat"] });
  }, [load, brand.domain]);

  const reloadPlatformFromCache = useCallback(
    (platform: AdsLibraryPlatform) => load({ platforms: [platform], skipCache: false, background: true }),
    [load],
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
    snapchatRefreshing,
    fetchError,
    configured,
    refresh,
    refreshGoogleAds,
    refreshMetaAds,
    refreshTikTokAds,
    refreshPinterestAds,
    refreshLinkedInAds,
    refreshMicrosoftAds,
    refreshSnapchatAds,
    reloadPlatformFromCache,
  };
}
