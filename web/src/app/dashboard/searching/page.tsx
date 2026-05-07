"use client";
import React, { useEffect, useLayoutEffect, useState, useCallback, useMemo, useRef, Suspense } from "react";
import { Loader2, RefreshCw, AlertCircle, ArrowRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { CHANNELS, type ChannelId } from "@/components/channel-picker-modal";
import { ManualIdentifiersForm, type PlatformIdentifier } from "@/components/manual-identifiers-form";
import { looksLikeUrl, googleFaviconUrlForDomain } from "@/lib/discovery";
import type { TermHint } from "@/lib/competitor-query";
import { BrandLogoSkeleton } from "@/components/brand-logo-skeleton";
import { BrandLogoThumb } from "@/components/brand-logo-thumb";
import { RivalLogoImg } from "@/components/rival-logo";
import {
  findMatchingCompetitorIndex,
  loadSidebarCompetitors,
  MAX_WATCHED_COMPETITORS,
  normalizeCompetitorSlug,
  upsertSidebarCompetitor,
} from "@/lib/sidebar-competitors";
import { buildCompetitorDashboardPath } from "@/lib/competitor-dashboard-url";
import { saveCompetitorToAccount, saveSearchToAccount } from "@/lib/account/client";
import {
  normalizedBrandForAdsLibraryPayload,
  stableAdsLibraryPayloadKey,
  writeAdsLibrarySessionCache,
} from "@/lib/ad-library/deduped-fetch";
import { channelsQueryToAdsPlatforms } from "@/lib/ad-library/channels-to-platforms";
import {
  coerceAdsLibraryResponse,
  mergeAdsLibraryState,
  type AdsLibraryPartialJson,
  type AdsLibraryPlatform,
  type AdsLibraryResponse,
} from "@/lib/ad-library/api-types";
import { GOOGLE_ADS_LIBRARY_DEFAULT_RESULTS_LIMIT } from "@/lib/ad-library/constants";
import {
  collectAdsLibraryWarmupUrls,
  preloadAdsLibraryWarmupUrls,
} from "@/lib/ad-library/preload-ad-library-media";
import {
  normalizeGoogleAdsRegion,
} from "@/lib/ad-library/google-ads-regions";
import { normalizeTikTokAdsRegion } from "@/lib/ad-library/tiktok-regions";
import { normalizePinterestAdsCountry } from "@/lib/ad-library/pinterest-regions";
import {
  readAdLibraryRegionPrefsFromSession,
  writeAdLibraryRegionPrefsToSession,
  type AdLibraryRegionPrefs,
} from "@/lib/ad-library/ad-library-region-prefs";
import { inferAdLibraryRegionDefaults } from "@/lib/ad-library/infer-ad-library-regions-from-domain";
import { readScrapeRequestFieldsFromStorage } from "@/lib/ad-library/scrape-request-fields";
import {
  searchingFlowStorageKey,
  readSearchingFlowSnapshot,
  writeSearchingFlowSnapshot,
  clearSearchingFlowSnapshot,
  type SearchingFlowSnapshot,
} from "@/lib/competitor-search-flow-storage";
import { readGoogleAdDetailsPublicFlag } from "@/lib/ad-library/public-env-flags";

function snapshotAdLibraryRegionPrefs(
  raw: SearchingFlowSnapshot["adLibraryRegionPrefs"]
): Partial<AdLibraryRegionPrefs> {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  const out: Partial<AdLibraryRegionPrefs> = {};
  if (typeof o.metaCountry === "string") out.metaCountry = o.metaCountry;
  if (typeof o.googleRegion === "string") out.googleRegion = o.googleRegion;
  if (typeof o.tiktokRegion === "string") out.tiktokRegion = o.tiktokRegion;
  if (typeof o.pinterestCountry === "string") out.pinterestCountry = o.pinterestCountry;
  if (typeof o.linkedinCountryCode === "string") out.linkedinCountryCode = o.linkedinCountryCode;
  if (typeof o.snapchatCountry === "string") out.snapchatCountry = o.snapchatCountry;
  return out;
}

/** Map channel row to ads API platform. */
function channelIdToAdsLibraryPlatform(id: ChannelId): AdsLibraryPlatform | null {
  if (
    id === "meta" ||
    id === "google" ||
    id === "linkedin" ||
    id === "tiktok" ||
    id === "pinterest"
  ) {
    return id;
  }
  return null;
}

const CHANNEL_TO_STATUS: Record<ChannelId, "found" | "no ads found"> = {
  meta: "found",
  google: "found",
  tiktok: "no ads found",
  linkedin: "no ads found",
  pinterest: "found",
  snapchat: "no ads found",
};

/** Selected channels that have a filled identifier (same rule as the scanning platform cards). */
function channelsWithFilledIdentifiers(
  selectedChannels: ChannelId[],
  merged: Partial<PlatformIdentifier>
): ChannelId[] {
  return selectedChannels.filter((ch) => {
    if (ch === "meta") {
      const v = merged.meta ?? merged.metaPageUrl;
      return Boolean(v && String(v).trim().length > 0);
    }
    const val = merged[ch as keyof PlatformIdentifier];
    return typeof val === "string" && val.trim().length > 0;
  });
}

type DiscoveredBrand = { name: string; domain: string; logoUrl?: string };

type DiscoveryInterpretation = {
  summary: string;
  primaryBrandName: string;
  primaryDomain: string | null;
  termBreakdown: { brands: number; urls: number; keywords: number };
};

function SearchingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const q = searchParams.get("q") || "competitor";
  const termsParam = searchParams.get("terms") ?? "";
  const channelsParam = searchParams.get("channels") ?? "";

  const termHints = useMemo((): TermHint[] | null => {
    const raw = termsParam.trim();
    if (!raw) return null;
    const tryParse = (s: string): TermHint[] | null => {
      try {
        const v = JSON.parse(s) as unknown;
        return Array.isArray(v) ? (v as TermHint[]) : null;
      } catch {
        return null;
      }
    };
    return tryParse(raw) ?? tryParse(decodeURIComponent(raw));
  }, [termsParam]);
  /** Stable reference — new [] each render was breaking useCallback + useEffect and spamming /api/discover */
  const selectedChannels = useMemo((): ChannelId[] => {
    if (!channelsParam.trim()) {
      return CHANNELS.map((c) => c.id);
    }
    return channelsParam.split(",").filter((c): c is ChannelId =>
      CHANNELS.some((ch) => ch.id === c)
    );
  }, [channelsParam]);

  type Phase = "discovering" | "manual-needed" | "scanning" | "found";
  const [phase, setPhase] = useState<Phase>("discovering");
  const [discoveredIds, setDiscoveredIds] = useState<Partial<PlatformIdentifier>>({});
  const [discoveredBrand, setDiscoveredBrand] = useState<DiscoveredBrand | null>(null);
  const [manualIds, setManualIds] = useState<PlatformIdentifier>({});
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);
  const [discoveryWarning, setDiscoveryWarning] = useState<string | null>(null);
  const [discoveryStep, setDiscoveryStep] = useState<string>("Searching for your competitor...");
  const [discoveryInterpretation, setDiscoveryInterpretation] = useState<DiscoveryInterpretation | null>(null);
  const [fieldConfidence, setFieldConfidence] = useState<
    Partial<Record<ChannelId, "high" | "medium" | "low">>
  >({});
  const [fieldPreviewUrls, setFieldPreviewUrls] = useState<Partial<Record<ChannelId, string>>>({});
  const [scanProgress, setScanProgress] = useState(0);
  /** Live ads fetch: completed platform requests vs total (for progress label). */
  const [scanFraction, setScanFraction] = useState({ done: 0, total: 0 });
  const [platformStatuses, setPlatformStatuses] = useState<
    Partial<Record<AdsLibraryPlatform, "queued" | "running" | "cached" | "done" | "error">>
  >({});
  const mergedAdsScanRef = useRef<AdsLibraryResponse | null>(null);
  /** When restoring a flow snapshot that already saved region prefs, do not overwrite with TLD inference. */
  const hadSnapshotRegionPrefsRef = useRef(false);
  const inferredDomainForRegionsRef = useRef<string | null>(null);

  const flowKey = useMemo(
    () => searchingFlowStorageKey(q, termsParam, channelsParam),
    [q, termsParam, channelsParam]
  );
  const [flowRehydrated, setFlowRehydrated] = useState(false);
  const [adLibraryRegions, setAdLibraryRegions] = useState<AdLibraryRegionPrefs>(() =>
    readAdLibraryRegionPrefsFromSession()
  );

  useLayoutEffect(() => {
    inferredDomainForRegionsRef.current = null;
    const saved = readSearchingFlowSnapshot(flowKey);
    hadSnapshotRegionPrefsRef.current =
      !!saved?.adLibraryRegionPrefs && Object.keys(saved.adLibraryRegionPrefs).length > 0;
    if (saved) {
      if (saved.phase === "scanning") {
        setPhase("manual-needed");
      } else {
        setPhase(saved.phase);
      }
      setDiscoveredIds(saved.discoveredIds ?? {});
      setDiscoveredBrand(saved.discoveredBrand);
      setManualIds(saved.manualIds ?? ({} as PlatformIdentifier));
      setDiscoveryError(saved.discoveryError);
      setDiscoveryWarning(saved.discoveryWarning);
      setDiscoveryStep(saved.discoveryStep);
      setDiscoveryInterpretation(saved.discoveryInterpretation);
      setFieldConfidence(saved.fieldConfidence ?? {});
      setFieldPreviewUrls(saved.fieldPreviewUrls ?? {});
      setAdLibraryRegions({
        ...readAdLibraryRegionPrefsFromSession(),
        ...snapshotAdLibraryRegionPrefs(saved.adLibraryRegionPrefs),
      });
    } else {
      setAdLibraryRegions(readAdLibraryRegionPrefsFromSession());
    }
    setFlowRehydrated(true);
  }, [flowKey]);

  /** Fresh flows: default Meta/Google/TikTok/Pinterest/LinkedIn/Snapchat markets from the competitor site TLD. */
  useEffect(() => {
    if (!flowRehydrated) return;
    if (hadSnapshotRegionPrefsRef.current) return;
    const d = discoveredBrand?.domain?.trim();
    if (!d) return;
    if (inferredDomainForRegionsRef.current === d) return;
    inferredDomainForRegionsRef.current = d;
    setAdLibraryRegions(inferAdLibraryRegionDefaults(d));
  }, [flowRehydrated, discoveredBrand?.domain]);

  // Only show platforms we're actually scanning (identifiers from discovery + manual edits)
  const platformsToScan = useMemo(
    () => channelsWithFilledIdentifiers(selectedChannels, { ...discoveredIds, ...manualIds }),
    [selectedChannels, discoveredIds, manualIds]
  );
  const platformsData = CHANNELS.filter((ch) => platformsToScan.includes(ch.id)).map((ch) => ({
    ...ch,
    status: CHANNEL_TO_STATUS[ch.id],
  }));

  const displayName = q.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] || q;

  useEffect(() => {
    if (!flowRehydrated) return;
    if (phase === "discovering" && !discoveryError) return;
    const snapshot: SearchingFlowSnapshot = {
      v: 1,
      phase,
      discoveredIds,
      discoveredBrand,
      manualIds,
      discoveryError,
      discoveryWarning,
      discoveryStep,
      discoveryInterpretation,
      fieldConfidence,
      fieldPreviewUrls,
      adLibraryRegionPrefs: adLibraryRegions,
    };
    writeSearchingFlowSnapshot(flowKey, snapshot);
  }, [
    flowRehydrated,
    flowKey,
    phase,
    discoveredIds,
    discoveredBrand,
    manualIds,
    discoveryError,
    discoveryWarning,
    discoveryStep,
    discoveryInterpretation,
    fieldConfidence,
    fieldPreviewUrls,
    adLibraryRegions,
  ]);

  useEffect(() => {
    if (phase !== "discovering") return;
    const slug = normalizeCompetitorSlug(displayName);
    const label = q.trim() || displayName;
    const list = loadSidebarCompetitors();
    const idx = findMatchingCompetitorIndex(list, slug, label);
    if (idx < 0 && list.length >= MAX_WATCHED_COMPETITORS) return;
    upsertSidebarCompetitor({ slug, name: label, pending: true });
    void saveCompetitorToAccount({
      slug,
      name: label,
      pending: true,
    });
  }, [phase, displayName, q]);

  useEffect(() => {
    if (phase === "discovering") return;
    const slug = normalizeCompetitorSlug(discoveredBrand?.domain ?? displayName);
    const brand =
      discoveredBrand?.domain && discoveredBrand.name
        ? {
            name: discoveredBrand.name,
            domain: discoveredBrand.domain,
            logoUrl: discoveredBrand.logoUrl,
          }
        : undefined;
    const label = discoveredBrand?.name ?? displayName;
    const added = upsertSidebarCompetitor({
      slug,
      name: label,
      logoUrl: discoveredBrand?.logoUrl,
      brand,
      pending: false,
    });
    if (!added.ok) return;
    void saveCompetitorToAccount({
      slug,
      name: label,
      logoUrl: discoveredBrand?.logoUrl,
      brand,
      pending: false,
    });
  }, [phase, discoveredBrand, displayName]);

  useEffect(() => {
    if (!discoveryError) return;
    const slug = normalizeCompetitorSlug(displayName);
    const label = q.trim() || displayName;
    const added = upsertSidebarCompetitor({
      slug,
      name: label,
      pending: false,
    });
    if (!added.ok) return;
    void saveCompetitorToAccount({
      slug,
      name: label,
      pending: false,
    });
  }, [discoveryError, displayName, q]);

  useEffect(() => {
    void saveSearchToAccount({
      query: q.trim() || displayName,
      terms: termHints ?? [],
      channels: selectedChannels,
    });
  }, [displayName, q, selectedChannels, termHints]);

  const runDiscovery = useCallback(async () => {
    const capSlug = normalizeCompetitorSlug(displayName);
    const capLabel = q.trim() || displayName;
    const capList = loadSidebarCompetitors();
    const capIdx = findMatchingCompetitorIndex(capList, capSlug, capLabel);
    if (capIdx < 0 && capList.length >= MAX_WATCHED_COMPETITORS) {
      setDiscoveryError(
        `You can watch up to ${MAX_WATCHED_COMPETITORS} competitors. Remove one from the sidebar first.`
      );
      return;
    }

    setDiscoveryError(null);
    setDiscoveryWarning(null);
    setDiscoveryStep(
      looksLikeUrl(q) ? "Checking their website for social links..." : "Finding their official site..."
    );
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 55_000);
    try {
      setDiscoveryStep("Scanning for social profiles and official links...");
      const res = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: q,
          channels: selectedChannels,
          ...(termHints && termHints.length > 0 ? { terms: termHints } : {}),
        }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Discovery failed");
      }
      setDiscoveredIds(data.discoveredIds ?? {});
      if (data.brand) {
        setDiscoveredBrand(data.brand);
      }
      setDiscoveryInterpretation(
        data.interpretation && typeof data.interpretation.summary === "string"
          ? data.interpretation
          : null
      );
      setFieldConfidence(data.fieldConfidence ?? {});
      setFieldPreviewUrls(data.fieldPreviewUrls ?? {});
      if (typeof data.warning === "string" && data.warning.trim()) {
        setDiscoveryWarning(data.warning.trim());
      }
      setPhase("manual-needed");
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setDiscoveryError("Request timed out. Try again or use a shorter query.");
      } else {
        setDiscoveryError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      }
    } finally {
      window.clearTimeout(timeoutId);
    }
  }, [q, selectedChannels, termHints, displayName]);

  useEffect(() => {
    if (!flowRehydrated) return;
    if (phase !== "discovering") return;
    runDiscovery();
  }, [flowRehydrated, phase, runDiscovery]);

  const runScanAndNavigate = useCallback(
    async (mergedIds: PlatformIdentifier) => {
      setPhase("scanning");
      setScanProgress(0);
      const adsPlatforms = channelsQueryToAdsPlatforms(
        channelsWithFilledIdentifiers(selectedChannels, mergedIds)
      );
      const initialStatuses: Partial<
        Record<AdsLibraryPlatform, "queued" | "running" | "cached" | "done" | "error">
      > = {};
      for (const p of adsPlatforms) initialStatuses[p] = "queued";
      setPlatformStatuses(initialStatuses);

      const navigateToCompetitor = () => {
        clearSearchingFlowSnapshot(flowKey);
        const canonicalHost = normalizeCompetitorSlug(discoveredBrand?.domain ?? displayName);
        const href = buildCompetitorDashboardPath(canonicalHost);
        router.prefetch(href);
        router.push(href, { scroll: false });
      };

      if (adsPlatforms.length === 0) {
        setScanFraction({ done: 0, total: 0 });
        setScanProgress(100);
        navigateToCompetitor();
        return;
      }

      setScanFraction({ done: 0, total: adsPlatforms.length });
      mergedAdsScanRef.current = null;

      writeAdLibraryRegionPrefsToSession(adLibraryRegions);
      const scrape = readScrapeRequestFieldsFromStorage();
      const tiktokRegion = normalizeTikTokAdsRegion(adLibraryRegions.tiktokRegion);
      const googleRegion = normalizeGoogleAdsRegion(adLibraryRegions.googleRegion);
      const googleResultsLimit = GOOGLE_ADS_LIBRARY_DEFAULT_RESULTS_LIMIT;
      const pinterestCountry = normalizePinterestAdsCountry(adLibraryRegions.pinterestCountry);

      const payload = {
        brand: normalizedBrandForAdsLibraryPayload({
          name: discoveredBrand?.name ?? displayName,
          domain: discoveredBrand?.domain ?? displayName,
          logoUrl: discoveredBrand?.logoUrl,
        }),
        ids: mergedIds,
        metaStatus: "ACTIVE" as const,
        googleGetAdDetails: readGoogleAdDetailsPublicFlag(),
        metaMaxAds: scrape.metaMaxAds,
        metaCountry: scrape.metaCountry.trim().toUpperCase() || "US",
        metaStartDate: scrape.metaStartDate.trim(),
        metaEndDate: scrape.metaEndDate.trim(),
        metaSortBy: scrape.metaSortBy.trim() || "impressions_desc",
        linkedinMaxAds: scrape.linkedinMaxAds,
        linkedinDateRange: scrape.linkedinDateRange.trim(),
        linkedinCountryCode: scrape.linkedinCountryCode.trim(),
        tiktokMaxAds: scrape.tiktokMaxAds,
        tiktokStartDate: scrape.tiktokStartDate.trim(),
        tiktokEndDate: scrape.tiktokEndDate.trim(),
        pinterestMaxResults: scrape.pinterestMaxResults,
        pinterestStartDate: scrape.pinterestStartDate.trim(),
        pinterestEndDate: scrape.pinterestEndDate.trim(),
        pinterestGender: scrape.pinterestGender.trim(),
        pinterestAge: scrape.pinterestAge.trim(),
        snapchatMaxItems: scrape.snapchatMaxItems,
        snapchatCountry: scrape.snapchatCountry.trim().toUpperCase(),
        snapchatStartDate: scrape.snapchatStartDate.trim(),
        snapchatEndDate: scrape.snapchatEndDate.trim(),
        platforms: adsPlatforms,
        ...(adsPlatforms.includes("tiktok") ? { tiktokRegion } : {}),
        ...(adsPlatforms.includes("google") ? { googleRegion, googleResultsLimit } : {}),
        ...(adsPlatforms.includes("pinterest") ? { pinterestCountry } : {}),
      };
      const payloadKey = stableAdsLibraryPayloadKey(payload);

      const markRunningTimer = window.setTimeout(() => {
        setPlatformStatuses((prev) => {
          const next = { ...prev };
          for (const p of adsPlatforms) {
            if (next[p] === "queued") next[p] = "running";
          }
          return next;
        });
      }, 600);

      const total = adsPlatforms.length;
      let completed = 0;
      let allHttpOk = true;

      const bumpProgress = () => {
        completed += 1;
        const pct = Math.min(100, Math.round((completed / total) * 100));
        setScanProgress(pct);
        setScanFraction({ done: completed, total });
      };

      try {
        await Promise.all(
          adsPlatforms.map(async (p) => {
            try {
              const res = await fetch("/api/ads/library", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...payload, platforms: [p] }),
              });
              const json = (await res.json()) as AdsLibraryResponse | AdsLibraryPartialJson;
              mergedAdsScanRef.current = mergeAdsLibraryState(mergedAdsScanRef.current, json);
              if (!res.ok) allHttpOk = false;
              setPlatformStatuses((prev) => ({
                ...prev,
                [p]: res.ok ? "done" : "error",
              }));
            } catch {
              allHttpOk = false;
              setPlatformStatuses((prev) => ({ ...prev, [p]: "error" }));
            } finally {
              bumpProgress();
            }
          })
        );

        const normalized = coerceAdsLibraryResponse(mergedAdsScanRef.current);
        writeAdsLibrarySessionCache(payloadKey, { response: normalized, httpOk: allHttpOk });

        try {
          const warmup = collectAdsLibraryWarmupUrls(normalized);
          await Promise.race([
            preloadAdsLibraryWarmupUrls(warmup),
            new Promise<void>((resolve) => {
              window.setTimeout(resolve, 10_000);
            }),
          ]);
        } catch {
          /* Warmup must never block dashboard navigation */
        }

        navigateToCompetitor();
      } catch {
        setScanProgress(100);
        setScanFraction({ done: total, total });
        setPlatformStatuses((prev) => {
          const next = { ...prev };
          for (const pl of adsPlatforms) {
            next[pl] = "error";
          }
          return next;
        });
        navigateToCompetitor();
      } finally {
        window.clearTimeout(markRunningTimer);
      }
    },
    [adLibraryRegions, discoveredBrand, displayName, flowKey, router, selectedChannels]
  );

  const handleManualSubmit = (identifiers: PlatformIdentifier) => {
    writeAdLibraryRegionPrefsToSession(adLibraryRegions);
    setManualIds(identifiers);
    const mergedIds = { ...discoveredIds, ...identifiers };
    const slug = normalizeCompetitorSlug(discoveredBrand?.domain ?? displayName);
    const added = upsertSidebarCompetitor({
      slug,
      name: discoveredBrand?.name ?? displayName,
      brand: discoveredBrand
        ? { name: discoveredBrand.name, domain: discoveredBrand.domain, logoUrl: discoveredBrand.logoUrl }
        : undefined,
      libraryContext: {
        ids: mergedIds as Record<string, string>,
        channels: selectedChannels,
        confirmed: true,
      },
      pending: false,
    });
    if (!added.ok) {
      setDiscoveryError(
        `You can watch up to ${MAX_WATCHED_COMPETITORS} competitors. Remove one from the sidebar first.`
      );
      return;
    }
    void runScanAndNavigate(mergedIds);
  };

  /** Build competitor URL (same logic as auto-redirect). */
  const buildCompetitorHref = useCallback(() => {
    const canonicalHost = normalizeCompetitorSlug(discoveredBrand?.domain ?? displayName);
    return buildCompetitorDashboardPath(canonicalHost);
  }, [displayName, discoveredBrand]);

  const isDiscovering = phase === "discovering";
  const isManualNeeded = phase === "manual-needed";
  const isScanning = phase === "scanning";
  const isFound = phase === "found";

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center px-6 py-10 sm:px-12 sm:py-16 pb-20 sm:pb-24 w-full">
      <div className="w-full max-w-5xl flex flex-col items-center">
        {/* Logo */}
        <h1 className="mb-4 flex justify-center filter drop-shadow-sm transition-all">
          <RivalLogoImg className="h-12 w-auto max-w-[min(320px,88vw)] object-contain sm:h-16" />
        </h1>

        {/* Subtext */}
        <h2
          className={`text-[17px] sm:text-[20px] font-semibold text-[#52525b] text-center tracking-tight transition-all ${
            isManualNeeded ? "mb-2 sm:mb-3" : "mb-10 sm:mb-16"
          }`}
        >
          {isDiscovering && "Looking up your competitor…"}
          {isManualNeeded && "Add any missing links below"}
          {isScanning && (platformsToScan.length > 0
            ? `Checking ${platformsToScan.length} platform${platformsToScan.length === 1 ? "" : "s"} for ads…`
            : "Taking you to results")}
          {isFound && (platformsToScan.length > 0 ? "All done — your competitor’s ads are ready" : "Taking you to results")}
        </h2>
        {isManualNeeded ? (
          <p className="text-[13px] sm:text-[14px] text-[#71717a] text-center max-w-lg mx-auto mb-8 sm:mb-10 leading-relaxed">
            We pre-filled what we could. Edit a field or use Preview to verify before continuing.
          </p>
        ) : null}

        {/* Target badge with logo */}
        <div className={`w-full sm:max-w-2xl flex justify-center px-2 ${isManualNeeded ? "mb-6 sm:mb-8" : "mb-14 sm:mb-20"}`}>
          <div className="w-full bg-white/80 border border-gray-200/80 rounded-[20px] py-4 sm:py-5 px-6 sm:px-8 flex items-center justify-center gap-4 shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
            <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-gray-200 sm:h-12 sm:w-12">
              {isDiscovering ? (
                <BrandLogoSkeleton className="h-full w-full" />
              ) : discoveredBrand?.domain || discoveredBrand?.logoUrl ? (
                <BrandLogoThumb
                  src={discoveredBrand?.logoUrl ?? googleFaviconUrlForDomain(discoveredBrand!.domain)}
                  alt=""
                  className="bg-gray-50"
                  onError={(e) => {
                    const d = discoveredBrand?.domain;
                    if (d) {
                      const fb = googleFaviconUrlForDomain(d);
                      if (e.currentTarget.src !== fb) e.currentTarget.src = fb;
                    }
                  }}
                />
              ) : (
                <BrandLogoSkeleton className="h-full w-full" />
              )}
            </div>
            {isDiscovering ? (
              <div
                className="h-7 sm:h-8 max-w-[min(280px,70vw)] flex-1 rounded-lg bg-gradient-to-r from-slate-200/90 via-slate-100 to-slate-200/90 animate-pulse"
                aria-hidden
              />
            ) : (
              <span className="text-[18px] sm:text-[22px] font-bold text-[#343434] truncate max-w-[200px] sm:max-w-none">
                {discoveredBrand?.name ?? displayName}
              </span>
            )}
          </div>
        </div>

        {/* Phase: Discovering */}
        {isDiscovering && (
          <div className="flex flex-col items-center gap-6 w-full">
            {discoveryError ? (
              <>
                <div
                  role="alert"
                  className="flex max-w-md flex-col items-center gap-3 rounded-2xl border border-red-100 bg-red-50/70 px-5 py-4 text-center"
                >
                  <div className="flex items-center gap-2 text-[14px] font-medium leading-snug text-[#9f1239]">
                  <AlertCircle className="w-5 h-5 shrink-0 text-[#e11d48]" aria-hidden />
                  {discoveryError}
                  </div>
                </div>
                <button
                  onClick={() => runDiscovery()}
                  className="flex items-center gap-2 h-11 px-5 rounded-xl bg-[#343434] text-white font-semibold text-[14px] hover:bg-[#2a2a2a] transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try again
                </button>
              </>
            ) : (
              <>
                <Loader2 className="w-10 h-10 animate-spin text-[#343434]" />
                <p className="text-[15px] text-[#808080] font-medium">{discoveryStep}</p>
              </>
            )}
          </div>
        )}

        {/* Phase: Manual identifiers form */}
        {isManualNeeded && (
          <div className="w-full">
            {discoveryWarning && (
              <div className="max-w-2xl mx-auto mb-6 px-2 sm:px-0">
                <div className="rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-[14px] text-amber-950 leading-relaxed shadow-sm">
                  <span className="font-semibold">Heads up: </span>
                  {discoveryWarning}
                </div>
              </div>
            )}
            <ManualIdentifiersForm
              key={`${discoveredBrand?.domain ?? ""}__${discoveredBrand?.name ?? displayName}`}
              selectedChannels={selectedChannels}
              discoveredIds={discoveredIds}
              onSubmit={handleManualSubmit}
              competitorLabel={discoveredBrand?.name ?? displayName}
              competitorDomain={discoveredBrand?.domain}
              interpretationSummary={discoveryInterpretation?.summary}
              fieldConfidence={fieldConfidence}
              fieldPreviewUrls={fieldPreviewUrls}
              brandLogoUrl={discoveredBrand?.logoUrl}
              adLibraryRegions={adLibraryRegions}
              onAdLibraryRegionsChange={setAdLibraryRegions}
            />
          </div>
        )}

        {/* Phase: Scanning / Found - Progress + platform grid (only channels we have identifiers for) */}
        {(isScanning || isFound) && (
          <div className="w-full max-w-5xl mx-auto px-2 sm:px-6 flex flex-col gap-6">
            {isScanning ? (
              <div className="w-full rounded-2xl border border-[#bfdbfe] bg-[#eff6ff] px-4 py-4 shadow-sm">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <p className="text-[14px] font-semibold text-[#374151] min-w-0">
                    Fetching ads from selected platforms…
                  </p>
                  <p className="text-[12px] text-[#6b7280] shrink-0 tabular-nums">
                    {scanFraction.total > 0 ? `${scanFraction.done}/${scanFraction.total}` : "In progress"}
                  </p>
                </div>
                <div className="h-3 w-full rounded-full bg-[#cbd5e1] overflow-hidden ring-1 ring-inset ring-black/5">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r from-[#2563eb] to-[#3b82f6] transition-[width] duration-300 ease-out min-w-[10px] ${
                      scanProgress > 0 && scanProgress < 100 ? "motion-safe:animate-pulse" : ""
                    }`}
                    style={{
                      width: `${Math.min(100, Math.max(12, scanProgress))}%`,
                    }}
                  />
                </div>
              </div>
            ) : null}
            <div
              className={`w-full gap-6 sm:gap-8 ${
                platformsData.length === 1
                  ? "grid grid-cols-1 max-w-md mx-auto"
                  : platformsData.length === 2
                    ? "grid grid-cols-1 sm:grid-cols-2 max-w-xl mx-auto"
                    : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mx-auto"
              }`}
            >
            {platformsData.length === 0 ? (
              <p className="text-[15px] text-[#808080] font-medium py-8 text-center col-span-full">
                Taking you to results
              </p>
            ) : platformsData.map((platform, idx) => {
              const isActiveScanning = isScanning;
              const adsApiPlatform = channelIdToAdsLibraryPlatform(platform.id);
              const runtimeStatus = adsApiPlatform ? platformStatuses[adsApiPlatform] : undefined;
              const isPlatformFound =
                runtimeStatus === "done" ||
                (platform.status === "found" && !isActiveScanning);
              const noAdsFound =
                runtimeStatus === "error" || (platform.status === "no ads found" && !isActiveScanning);

              return (
                <div
                  key={idx}
                  className="flex items-center gap-5 sm:gap-6 bg-white/60 border border-white/60 rounded-[24px] p-5 sm:p-6 shadow-[0_4px_24px_rgba(31,38,135,0.04)] backdrop-blur-md transition-all hover:bg-white/80 hover:shadow-[0_8px_32px_rgba(31,38,135,0.07)] hover:border-[#DDF1FD]/60 min-w-0"
                >
                  <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-[18px] flex items-center justify-center ring-1 shadow-sm shrink-0 border border-white transition-all duration-500 p-2.5 overflow-hidden
                    ${isActiveScanning ? "bg-white ring-black/5" : ""}
                    ${isPlatformFound ? "bg-white ring-[#95C14B]/50" : ""}
                    ${noAdsFound ? "bg-white ring-black/5" : ""}
                  `}>
                    {platform.Logo ? (
                      <platform.Logo className="w-8 h-8 sm:w-9 sm:h-9" />
                    ) : (
                      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded bg-gray-200" />
                    )}
                  </div>
                  <div className="flex flex-col min-w-0 flex-1 justify-center py-0.5">
                    <span className="font-bold text-gray-900 text-[16px] sm:text-[17px] leading-snug break-normal">
                      {platform.name}
                    </span>
                    <span className={`text-[14px] sm:text-[15px] font-medium mt-1 leading-tight whitespace-normal transition-colors
                      ${isActiveScanning && !isPlatformFound ? "text-gray-500 opacity-80 animate-pulse" : ""}
                      ${isPlatformFound ? "text-[#95C14B]" : ""}
                      ${noAdsFound ? "text-gray-600" : ""}
                    `}>
                      {isActiveScanning
                        ? runtimeStatus === "queued"
                          ? "Queued"
                          : runtimeStatus === "running"
                            ? "Checking..."
                            : runtimeStatus === "done"
                              ? "Connected"
                              : runtimeStatus === "error"
                                ? "Failed"
                                : "Checking..."
                        : platform.status === "no ads found"
                          ? "No ads found"
                          : "Ads found"}
                    </span>
                  </div>
                </div>
              );
            })}
            </div>
          </div>
        )}

        {isFound && (
          <div className="mt-10 flex flex-col items-center gap-4 w-full px-2">
            <button
              type="button"
              onClick={() => router.push(buildCompetitorHref(), { scroll: false })}
              className="inline-flex items-center justify-center gap-2 min-h-[52px] px-8 rounded-2xl bg-[#343434] text-white font-semibold text-[15px] hover:bg-[#2a2a2a] transition-colors shadow-md"
            >
              View ads library
              <ArrowRight className="w-5 h-5 shrink-0" aria-hidden />
            </button>
            <p className="text-[13px] text-[#9ca3af] text-center max-w-sm">
              Redirecting automatically in a few seconds…
            </p>
          </div>
        )}

      </div>
    </div>
  );
}

export default function SearchingViewWrapper() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-24">
          <Loader2 className="h-8 w-8 animate-spin text-[#343434]" aria-hidden />
          <span className="sr-only">Loading search</span>
        </div>
      }
    >
      <SearchingContent />
    </Suspense>
  );
}
