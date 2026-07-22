"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  coerceAdsLibraryResponse,
  mergeAdsLibraryState,
  type AdsLibraryPlatform,
  type AdsLibraryResponse,
} from "@/lib/ad-library/api-types";
import {
  buildClientAdsLibraryPayload,
  normalizeAdsLibraryEventDomain,
} from "@/lib/ad-library/build-client-ads-library-payload";
import {
  fetchAdsLibraryDeduplicated,
  fetchResultHasLibraryCreatives,
  readAdsLibraryCacheLastKnownGood,
  readAdsLibraryCacheLastKnownGoodForBrandDomain,
  stableAdsLibraryPayloadKey,
  writeAdsLibrarySessionCache,
  type FetchAdsLibraryResult,
} from "@/lib/ad-library/deduped-fetch";
import { ALL_ADS_API_PLATFORMS } from "@/lib/ad-library/channels-to-platforms";
import {
  adsLibraryResponseMissingExpectedPlatforms,
  countLibraryAdsForPlatform,
} from "@/lib/ad-library/library-response-utils";
import {
  DEFAULT_GOOGLE_ADS_REGION,
  normalizeGoogleAdsRegion,
} from "@/lib/ad-library/google-ads-regions";
import { normalizePinterestAdsCountry } from "@/lib/ad-library/pinterest-regions";
import { DEFAULT_TIKTOK_ADS_REGION } from "@/lib/ad-library/tiktok-regions";
import type { ScrapeRequestFields } from "@/lib/ad-library/scrape-request-fields";
import { buildManualRefreshLibraryBodyForPlatform } from "@/lib/ad-library/manual-refresh-date-window";
import { clearFreshDiscoveryScan, isFreshDiscoveryScan } from "@/lib/ad-library/discovery-scan-guard";
import {
  clearWorkspaceBrandScrapeHandoff,
  readWorkspaceBrandScrapeHandoff,
} from "@/lib/ad-library/workspace-brand-scrape-handoff";
import {
  ADS_LIBRARY_UPDATED_EVENT,
  markPendingStrategyRefresh,
  type AdsLibraryUpdatedDetail,
} from "@/lib/strategy-overview/ads-library-strategy-bridge";
import { repairAdsLibraryResponseMedia } from "@/lib/ad-library/repair-library-ad-media";
import { readAdsCacheHydrateClientMeta } from "@/lib/ad-library/ads-cache-hydrate-meta";
import {
  fetchHydratedAdsLibraryConditional,
} from "@/lib/ad-library/conditional-hydrate-fetch";

type Brand = { name: string; domain: string; logoUrl?: string };

function totalAdsInResponse(response: AdsLibraryResponse | null): number {
  if (!response) return 0;
  return ALL_ADS_API_PLATFORMS.reduce(
    (sum, pl) => sum + countLibraryAdsForPlatform(pl, response),
    0
  );
}

function platformErrorFromResponse(
  response: AdsLibraryResponse,
  platform: AdsLibraryPlatform,
): string | null {
  switch (platform) {
    case "meta":
      return response.meta?.error ?? null;
    case "google":
      return response.google?.error ?? null;
    case "linkedin":
      return response.linkedin?.error ?? null;
    case "tiktok":
      return response.tiktok?.error ?? null;
    case "pinterest":
      return response.pinterest?.error ?? null;
    case "microsoft":
      return response.microsoft?.error ?? null;
    case "snapchat":
      return response.snapchat?.error ?? null;
    default:
      return null;
  }
}

function readLocalAdsLibraryCacheForDomain(
  payloadKey: string,
  brandDomain: string,
): FetchAdsLibraryResult | null {
  return (
    readAdsLibraryCacheLastKnownGood(payloadKey) ??
    readAdsLibraryCacheLastKnownGoodForBrandDomain(brandDomain)
  );
}

function cachedLibraryResponseIsComplete(
  cached: FetchAdsLibraryResult,
  expectedPlatforms: readonly AdsLibraryPlatform[],
  hydrateMeta: ReturnType<typeof readAdsCacheHydrateClientMeta>,
): boolean {
  if (!fetchResultHasLibraryCreatives(cached)) return false;
  const response = coerceAdsLibraryResponse(cached.response as AdsLibraryResponse);
  return !adsLibraryResponseMissingExpectedPlatforms(response, expectedPlatforms, hydrateMeta);
}

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
  /** True while a Pro manual refresh awaits Apify (~1–2 min) — background reloads must not abort it. */
  const manualRefreshInFlightRef = useRef(false);
  const persistRecoveryKeyRef = useRef<string | null>(null);
  /** Mirrors latest `data` so merges after `await fetch` use the correct prior state (functional `setData` + session write were racing React 18 batching). */
  const dataRef = useRef<AdsLibraryResponse | null>(null);

  useLayoutEffect(() => {
    dataRef.current = data;
  }, [data]);

  const payload = useMemo(
    () =>
      buildClientAdsLibraryPayload({
        brand,
        ids,
        adsPlatforms,
        scrapeFields,
        tiktokRegion,
        googleRegion,
        pinterestCountry,
      }),
    [
      brand.name,
      brand.domain,
      brand.logoUrl,
      ids,
      adsPlatforms,
      tiktokRegion,
      googleRegion,
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
    async (opts?: {
      skipCache?: boolean;
      platforms?: AdsLibraryPlatform[];
      background?: boolean;
      /** When true, do not broadcast `ADS_LIBRARY_UPDATED_EVENT` (prevents reload loops). */
      suppressUpdatedEvent?: boolean;
      /** After a cache reload (e.g. post-rescrape poll), notify listeners so modals refetch. */
      notifyLibraryUpdated?: boolean;
      /** Pro manual refresh — sets `intent: manual` and platform-specific Apify params. */
      manualRefresh?: boolean;
    }) => {
      const platforms = opts?.platforms;
      const isManualRefresh = opts?.manualRefresh === true;
      const isBackground = opts?.background === true;
      const partial =
        platforms != null &&
        platforms.length > 0 &&
        platforms.length < ALL_ADS_API_PLATFORMS.length;

      /**
       * A manual refresh keeps an Apify run awaiting for ~1–2 min. Cache revalidations and
       * update-event reloads fired during that window used to abort it, and the UI then
       * reported "Refresh failed" for a scrape that completed fine server-side.
       */
      if (manualRefreshInFlightRef.current && !isManualRefresh) {
        return { ok: false, aborted: true as const };
      }

      loadAbortRef.current?.abort();
      const ac = new AbortController();
      loadAbortRef.current = ac;
      if (isManualRefresh) manualRefreshInFlightRef.current = true;

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
        if (isManualRefresh && platforms?.length === 1) {
          Object.assign(body, buildManualRefreshLibraryBodyForPlatform(platforms[0]!));
          if (platforms[0] === "google") {
            body.filterGoogleActiveToday = true;
          }
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
        if (loadAbortRef.current !== ac) return { ok: false, aborted: true as const };

        let mergeBase = dataRef.current;
        if (mergeBase === null) {
          const cached =
            readAdsLibraryCacheLastKnownGood(payloadKey) ??
            readAdsLibraryCacheLastKnownGoodForBrandDomain(brand.domain);
          if (cached) {
            mergeBase = coerceAdsLibraryResponse(cached.response as AdsLibraryResponse);
          }
        }

        const domain = brand.domain.trim();
        const shellAfterFetch = coerceAdsLibraryResponse(mergeAdsLibraryState(mergeBase, json));
        let totalAfterFetch = ALL_ADS_API_PLATFORMS.reduce(
          (sum, pl) => sum + countLibraryAdsForPlatform(pl, shellAfterFetch),
          0
        );

        let hydrateMarkedFresh = false;

        if (cacheOnly && !forceFresh && totalAfterFetch === 0 && domain.length > 0) {
          try {
            const hydrateResult = await fetchHydratedAdsLibraryConditional(domain, {
              signal: ac.signal,
              clientMeta: readAdsCacheHydrateClientMeta(domain),
            });
            if (hydrateResult.kind === "fresh") {
              const cached = readLocalAdsLibraryCacheForDomain(payloadKey, brand.domain);
              const hydrateMeta = readAdsCacheHydrateClientMeta(domain);
              if (
                cached &&
                cachedLibraryResponseIsComplete(cached, adsPlatforms, hydrateMeta)
              ) {
                hydrateMarkedFresh = true;
              } else {
                const forced = await fetchHydratedAdsLibraryConditional(domain, {
                  signal: ac.signal,
                });
                if (forced.kind === "full") {
                  json = forced.response;
                  httpOk = true;
                  totalAfterFetch = ALL_ADS_API_PLATFORMS.reduce(
                    (sum, pl) =>
                      sum + countLibraryAdsForPlatform(pl, coerceAdsLibraryResponse(json as AdsLibraryResponse)),
                    0
                  );
                } else {
                  hydrateMarkedFresh = true;
                }
              }
            } else if (hydrateResult.kind === "full") {
              json = hydrateResult.response;
              httpOk = true;
              totalAfterFetch = ALL_ADS_API_PLATFORMS.reduce(
                (sum, pl) =>
                  sum + countLibraryAdsForPlatform(pl, coerceAdsLibraryResponse(json as AdsLibraryResponse)),
                0
              );
            }
          } catch (e) {
            if (e instanceof DOMException && e.name === "AbortError") {
              return { ok: false, aborted: true as const };
            }
          }
        }

        const shouldTryPersistRecovery =
          !opts?.skipCache &&
          !partial &&
          !isBackground &&
          httpOk &&
          domain.length > 0 &&
          persistRecoveryKeyRef.current !== payloadKey;

        if (shouldTryPersistRecovery) {
          const shell = coerceAdsLibraryResponse(
            mergeAdsLibraryState(mergeBase, json)
          );
          const totalAds = ALL_ADS_API_PLATFORMS.reduce(
            (sum, pl) => sum + countLibraryAdsForPlatform(pl, shell),
            0
          );
          if (totalAds === 0) {
            persistRecoveryKeyRef.current = payloadKey;
            void fetch("/api/competitor/ads-library/ensure-persisted", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ domain }),
            })
              .catch(() => {
                /* recovery best-effort */
              })
              .finally(() => {
                if (loadAbortRef.current !== ac) return;
                void load({ skipCache: false, background: true, suppressUpdatedEvent: true });
              });
          }
        }

        const merged = repairAdsLibraryResponseMedia(mergeAdsLibraryState(mergeBase, json));
        const priorTotal = totalAdsInResponse(dataRef.current);
        const mergedTotal = totalAdsInResponse(coerceAdsLibraryResponse(merged));
        if (hydrateMarkedFresh && priorTotal > 0 && mergedTotal === priorTotal) {
          return { ok: true };
        }
        if (isBackground && priorTotal > 0 && mergedTotal === 0) {
          return { ok: true };
        }
        dataRef.current = coerceAdsLibraryResponse(merged);
        setData(dataRef.current);
        const totalAds = totalAdsInResponse(dataRef.current);
        if (totalAds > 0 || forceFresh) {
          writeAdsLibrarySessionCache(payloadKey, {
            response: dataRef.current ?? coerceAdsLibraryResponse(merged),
            httpOk,
          });
        }
        if (totalAds > 0) clearFreshDiscoveryScan(brand.domain.trim());
        if (!httpOk && "error" in json && json.error) {
          setFetchError(json.error);
        } else if (!httpOk) {
          setFetchError("Request failed");
        } else if (httpOk && typeof window !== "undefined") {
          const d = brand.domain.trim();
          if (d) markPendingStrategyRefresh(d);
          if (!opts?.suppressUpdatedEvent && (opts?.skipCache === true || opts?.notifyLibraryUpdated === true)) {
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
        }
        const response = coerceAdsLibraryResponse(merged);
        const platformError =
          partial && platforms?.length === 1
            ? platformErrorFromResponse(response, platforms[0]!)
            : null;
        if (!httpOk) {
          const err =
            typeof json === "object" && json && "error" in json && typeof json.error === "string"
              ? json.error
              : "Request failed";
          return { ok: false, error: err };
        }
        if (platformError) {
          return { ok: false, error: platformError };
        }
        return { ok: true };
      } catch (e) {
        const aborted =
          (e instanceof DOMException && e.name === "AbortError") ||
          (e instanceof Error && e.name === "AbortError");
        if (aborted) return { ok: false, aborted: true as const };
        if (loadAbortRef.current !== ac) return { ok: false, aborted: true as const };
        const message = e instanceof Error ? e.message : "Failed to load ads";
        setFetchError(message);
        if (!partial && !isBackground) setData(null);
        return { ok: false, error: message };
      } finally {
        if (isManualRefresh) manualRefreshInFlightRef.current = false;
        if (loadAbortRef.current !== ac) return { ok: false, aborted: true as const };
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
    [payload, payloadKey, brand.domain, adsPlatforms]
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
    const stopRefreshing = () => {
      setLoading(false);
      setGoogleRefreshing(false);
      setMetaRefreshing(false);
      setTiktokRefreshing(false);
      setPinterestRefreshing(false);
      setLinkedinRefreshing(false);
      setMicrosoftRefreshing(false);
      setSnapchatRefreshing(false);
    };

    const paintResponse = (raw: AdsLibraryResponse, httpOk: boolean) => {
      const repaired = repairAdsLibraryResponseMedia(coerceAdsLibraryResponse(raw));
      dataRef.current = repaired;
      setData(repaired);
      setFetchError(null);
      try {
        writeAdsLibrarySessionCache(payloadKey, {
          response: coerceAdsLibraryResponse(repaired),
          httpOk,
        });
      } catch {
        /* quota */
      }
      if (totalAdsInResponse(repaired) > 0) {
        clearFreshDiscoveryScan(brand.domain.trim());
      }
      stopRefreshing();
    };

    const handoff = readWorkspaceBrandScrapeHandoff(brand.domain);
    if (handoff && fetchResultHasLibraryCreatives(handoff)) {
      if (snapshot !== sessionRef.current) return;
      paintResponse(handoff.response as AdsLibraryResponse, handoff.httpOk);
      clearWorkspaceBrandScrapeHandoff(brand.domain);
      return;
    }

    const hydrateMeta = readAdsCacheHydrateClientMeta(brand.domain);
    const exact = readAdsLibraryCacheLastKnownGood(payloadKey);
    if (exact && cachedLibraryResponseIsComplete(exact, adsPlatforms, hydrateMeta)) {
      if (snapshot !== sessionRef.current) return;
      paintResponse(exact.response as AdsLibraryResponse, exact.httpOk);
      return;
    }

    const legacy = readAdsLibraryCacheLastKnownGoodForBrandDomain(brand.domain);
    if (
      legacy &&
      cachedLibraryResponseIsComplete(legacy, adsPlatforms, hydrateMeta) &&
      legacy !== exact
    ) {
      if (snapshot !== sessionRef.current) return;
      paintResponse(legacy.response as AdsLibraryResponse, legacy.httpOk);
      return;
    }

    const partialCached = exact ?? legacy;
    if (partialCached && fetchResultHasLibraryCreatives(partialCached)) {
      if (snapshot !== sessionRef.current) return;
      dataRef.current = coerceAdsLibraryResponse(partialCached.response as AdsLibraryResponse);
      setData(dataRef.current);
      setFetchError(null);
      setLoading(true);
    } else {
      setData(null);
      setLoading(true);
      setFetchError(null);
    }

    const ac = new AbortController();
    loadAbortRef.current = ac;

    void (async () => {
      const hydrateClientMeta =
        partialCached && fetchResultHasLibraryCreatives(partialCached)
          ? undefined
          : readAdsCacheHydrateClientMeta(brand.domain);
      const fromDb = await fetchHydratedAdsLibraryConditional(brand.domain, {
        signal: ac.signal,
        clientMeta: hydrateClientMeta ?? undefined,
      });
      if (loadAbortRef.current !== ac || snapshot !== sessionRef.current) return;
      if (fromDb === "fresh") {
        const cached = readLocalAdsLibraryCacheForDomain(payloadKey, brand.domain);
        const latestHydrateMeta = readAdsCacheHydrateClientMeta(brand.domain);
        if (cached && cachedLibraryResponseIsComplete(cached, adsPlatforms, latestHydrateMeta)) {
          paintResponse(cached.response as AdsLibraryResponse, cached.httpOk);
          return;
        }
        void load({ skipCache: false });
        return;
      }
      if (fromDb && totalAdsInResponse(fromDb) > 0) {
        const merged = repairAdsLibraryResponseMedia(
          mergeAdsLibraryState(dataRef.current, fromDb),
        );
        paintResponse(merged, true);
        return;
      }
      void load({ skipCache: false });
    })();
  }, [enabled, payloadKey, brand.domain, load, adsPlatforms]);

  /** Rescrape / discovery writes session cache + dispatches this event — reload without a full navigation. */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onUpdated = (ev: Event) => {
      const detail = (ev as CustomEvent<AdsLibraryUpdatedDetail>).detail;
      const incoming = normalizeAdsLibraryEventDomain(detail?.domain ?? "");
      const current = normalizeAdsLibraryEventDomain(brand.domain);
      if (!incoming || !current || incoming !== current) return;

      const handoff = readWorkspaceBrandScrapeHandoff(brand.domain);
      const exact = readAdsLibraryCacheLastKnownGood(payloadKey);
      const legacy = handoff ?? exact ?? readAdsLibraryCacheLastKnownGoodForBrandDomain(brand.domain);
      if (legacy && fetchResultHasLibraryCreatives(legacy)) {
        setData(repairAdsLibraryResponseMedia(mergeAdsLibraryState(null, legacy.response)));
        setFetchError(null);
        setLoading(false);
        if (handoff) {
          clearWorkspaceBrandScrapeHandoff(brand.domain);
          clearFreshDiscoveryScan(brand.domain);
        }
        if (!exact) {
          try {
            writeAdsLibrarySessionCache(payloadKey, legacy);
          } catch {
            /* migrate best-effort */
          }
        }
      }
      void load({ skipCache: false, background: true, suppressUpdatedEvent: true });
    };
    window.addEventListener(ADS_LIBRARY_UPDATED_EVENT, onUpdated);
    return () => window.removeEventListener(ADS_LIBRARY_UPDATED_EVENT, onUpdated);
  }, [brand.domain, load, payloadKey]);

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
    (platform: AdsLibraryPlatform) =>
      load({ platforms: [platform], skipCache: false, background: true, notifyLibraryUpdated: true }),
    [load],
  );

  const manualRefreshPlatform = useCallback(
    (platform: AdsLibraryPlatform) => {
      clearFreshDiscoveryScan(brand.domain);
      return load({ skipCache: true, platforms: [platform], manualRefresh: true });
    },
    [load, brand.domain],
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
    manualRefreshPlatform,
  };
}
