"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { DEFAULT_TIKTOK_ADS_REGION } from "@/lib/ad-library/tiktok-regions";
import type { ScrapeRequestFields } from "@/lib/ad-library/scrape-request-fields";
import { readGoogleAdDetailsPublicFlag } from "@/lib/ad-library/public-env-flags";

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

  useEffect(() => {
    sessionRef.current += 1;
    loadAbortRef.current?.abort();
  }, [payloadKey, enabled]);

  /**
   * Loads ads via POST /api/ads/library. `skipCache: true` forces fresh Apify runs (uses credits).
   * `skipCache: false` uses Supabase `ads_cache` when logged in. Session/local stash applies an instant
   * paint first, then a background fetch always runs to hydrate from Supabase (no loading flash).
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
        const { response: json, httpOk } = await fetchAdsLibraryDeduplicated(body, {
          skipCache: opts?.skipCache ?? false,
          clientSkipReadCache: isBackground,
          signal: ac.signal,
        });
        if (loadAbortRef.current !== ac) return;

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
    [payload, payloadKey]
  );

  useEffect(() => {
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
      void load({ skipCache: false, background: true });
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
      void load({ skipCache: false, background: true });
      return;
    }
    void load({ skipCache: false });
  }, [enabled, payloadKey, brand.domain, load]);

  const configured = data?.configured !== false;

  /** Re-run Apify scrapes for all selected platforms (uses credits). */
  const refresh = useCallback(() => load({ skipCache: true }), [load]);

  /** Re-fetch only Google / YouTube — does not call Meta or LinkedIn (saves credits). */
  const refreshGoogleAds = useCallback(
    () => load({ skipCache: true, platforms: ["google"] }),
    [load]
  );

  /** Re-fetch only Meta (`metaStatus`: active ads). */
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

  const refreshSnapchatAds = useCallback(
    () => load({ skipCache: true, platforms: ["snapchat"] }),
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
  };
}
