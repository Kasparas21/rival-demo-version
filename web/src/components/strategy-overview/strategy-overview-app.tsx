"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, RefreshCw } from "lucide-react";

import { RivalLoadingBlock, RivalLogoVideo } from "@/components/ui/rival-loading";

import {
  ADS_LIBRARY_UPDATED_EVENT,
  pendingStrategyRefreshStorageKey,
} from "@/lib/strategy-overview/ads-library-strategy-bridge";
import type { CompetitorStrategyOverviewPayload, FunnelCellId } from "@/lib/strategy-overview/payload-types";
import { useStrategyOverviewUi } from "@/lib/strategy-overview/strategy-overview-store";
import { StrategyMapFlow } from "@/components/strategy-overview/strategy-map-flow";
import { StrategyOverviewSidebar } from "@/components/strategy-overview/strategy-sidebar";
import { FunnelCellSheet } from "@/components/strategy-overview/funnel-cell-sheet";
import { NodeDetailSheet } from "@/components/strategy-overview/node-detail-sheet";
import { CacheRevalidatingDot, DataFreshnessBadge } from "@/components/competitor/data-freshness-badge";
import { FeatureSectionHeader } from "@/components/dashboard/feature-section-header";
import { useScrapeKeyedCache } from "@/lib/cache/use-scrape-keyed-cache";

type Brand = { name: string; domain: string };

type StrategyCompiledResponse = {
  ok: boolean;
  error?: string;
  payload?: CompetitorStrategyOverviewPayload;
  cached?: boolean;
  recomputing?: boolean;
  staleWhileRecomputing?: boolean;
};

type Props = {
  brand: Brand;
  onOpenAdsLibrary?: () => void;
  competitorId?: string;
  /** Account / sidebar scrape timestamp — bumps client cache key when new scrape lands. */
  lastScrapedAt?: string | null;
  onFreshnessRescrape?: () => void;
};

export function StrategyOverviewApp({
  brand,
  onOpenAdsLibrary,
  competitorId,
  lastScrapedAt = null,
  onFreshnessRescrape,
}: Props) {
  const domain = brand.domain.trim();
  const domainNorm = useMemo(() => domain.trim().toLowerCase(), [domain]);
  const scrapeStamp = lastScrapedAt ?? "none";
  const strategyCacheKey = `${domainNorm}:strategy-compiled:${scrapeStamp}`;

  const setSelectedPlatform = useStrategyOverviewUi((s) => s.setSelectedPlatform);

  const [recomputeBusy, setRecomputeBusy] = useState(false);
  const [sheetPlatform, setSheetPlatform] = useState<string | null>(null);
  const [openCellId, setOpenCellId] = useState<FunnelCellId | null>(null);
  const [edgeTip, setEdgeTip] = useState<{ reasoning: string; confidence: number } | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);
  const [backgroundRecompute, setBackgroundRecompute] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const loadGenerationRef = useRef(0);

  const clearPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const { data: compiled, loading, isValidating, error: loadError, refetch } = useScrapeKeyedCache<StrategyCompiledResponse>({
    cacheKey: strategyCacheKey,
    enabled: Boolean(domainNorm),
    validateCached: (c) => c.ok === true && Boolean(c.payload),
    fetcher: async ({ force } = {}) => {
      const q = new URLSearchParams({ competitorDomain: domain });
      if (force) q.set("force", "1");
      const res = await fetch(`/api/strategy-overview/compiled?${q}`);
      const json = (await res.json()) as StrategyCompiledResponse;
      if (!json.ok || !json.payload) {
        throw new Error(json.error ?? "Failed to load strategy overview");
      }
      return json;
    },
  });

  const payload = compiled?.payload ?? null;
  const cached = compiled?.cached === true;
  const displayError = loadError?.message ?? pollError;

  useEffect(() => {
    let debounce: ReturnType<typeof setTimeout> | null = null;
    const handler: EventListener = (ev) => {
      const detail = (ev as CustomEvent<{ domain?: string }>).detail;
      const d = detail?.domain?.trim().toLowerCase() ?? "";
      if (!d || d !== domainNorm) return;
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => {
        debounce = null;
        void refetch();
      }, 350);
    };
    window.addEventListener(ADS_LIBRARY_UPDATED_EVENT, handler);
    return () => {
      if (debounce) clearTimeout(debounce);
      window.removeEventListener(ADS_LIBRARY_UPDATED_EVENT, handler);
    };
  }, [domainNorm, refetch]);

  useEffect(() => {
    const k = pendingStrategyRefreshStorageKey(domainNorm);
    const pending = typeof window !== "undefined" ? window.sessionStorage.getItem(k) : null;
    if (pending) {
      try {
        window.sessionStorage.removeItem(k);
      } catch {
        /* ignore */
      }
      const ts = Number(pending);
      if (Number.isFinite(ts) && Date.now() - ts < 120_000) {
        void refetch();
      }
    }
    return () => {
      clearPoll();
    };
  }, [clearPoll, domainNorm, refetch]);

  useEffect(() => {
    if (!compiled?.ok || !compiled.payload) {
      clearPoll();
      setBackgroundRecompute(false);
      return;
    }
    const shouldPoll = compiled.recomputing === true || compiled.staleWhileRecomputing === true;
    if (!shouldPoll) {
      clearPoll();
      setBackgroundRecompute(false);
      return;
    }

    const myGeneration = ++loadGenerationRef.current;
    setBackgroundRecompute(true);
    clearPoll();
    const triesRef = { n: 0 };
    pollRef.current = setInterval(() => {
      void (async () => {
        triesRef.n += 1;
        const maxPolls = 120;
        let done = triesRef.n >= maxPolls;
        let statusFailed = false;
        let failedMessage: string | null = null;
        try {
          const st = await fetch(
            `/api/strategy-overview/recompute-status?competitorDomain=${encodeURIComponent(domain)}`
          );
          if (myGeneration !== loadGenerationRef.current) return;
          const sj = (await st.json()) as {
            ok?: boolean;
            status?: string;
            error?: string | null;
          };
          if (myGeneration !== loadGenerationRef.current) return;
          statusFailed = sj.ok === true && sj.status === "failed";
          failedMessage = sj.error?.trim() ?? null;
          done = triesRef.n >= maxPolls || (sj.ok === true && (sj.status === "idle" || sj.status === "failed"));
        } catch {
          done = triesRef.n >= maxPolls;
        }
        if (!done) return;
        if (myGeneration !== loadGenerationRef.current) return;

        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
        setBackgroundRecompute(false);
        if (statusFailed) {
          setPollError(failedMessage || "Strategy recomputation failed");
        } else {
          setPollError(null);
        }
        try {
          void refetch();
        } catch {
          /* refetch handles errors */
        }
      })();
    }, 5000);

    return () => {
      clearPoll();
    };
  }, [clearPoll, compiled?.recomputing, compiled?.staleWhileRecomputing, domain, refetch]);

  const emptyStrategy = useMemo(
    () =>
      !!payload && (payload.pipelineStatus === "no_ads_found" || payload.map.activeAdCount === 0),
    [payload]
  );

  const mapKey = useMemo(() => {
    if (!payload) return "empty";
    const fc = payload.map.funnelCells;
    const fcKey = fc?.length ? fc.map((c) => c.id).join("|") : "legacy-cells";
    return `${payload.map.activeAdCount}-${fcKey}-${payload.map.platformNodes.map((n) => n.adCount).join(",")}`;
  }, [payload]);

  const cellSummary = useMemo(() => {
    if (!openCellId || !payload?.map.funnelCells?.length) return null;
    return payload.map.funnelCells.find((c) => c.id === openCellId) ?? null;
  }, [openCellId, payload]);

  const funnelClassificationBanner =
    !displayError &&
    payload &&
    payload.map.activeAdCount > 0 &&
    Array.isArray(payload.map.funnelCells) &&
    payload.map.funnelCells.length === 0 ? (
      <div className="mb-4 rounded-xl border border-sky-200/90 bg-sky-50/90 px-4 py-3 text-[13px] text-sky-950">
        <p className="font-semibold text-sky-950">Funnel classification is still processing for this competitor.</p>
        <p className="mt-1 text-sky-950/95">Showing platform-level view in the meantime.</p>
      </div>
    ) : null;

  const suppressBanner = payload?.map.suppressEdgesReason
    ? payload.map.suppressEdgesReason === "low_sample"
      ? "More ads are needed to detect funnel flow with confidence. Run a fresh scrape to gather additional creatives."
      : `This competitor only advertises on ${payload.map.platformCount} channel(s). Cross-platform funnel lines are hidden.`
    : null;

  const enrichmentBanner =
    !displayError &&
    payload &&
    payload.map.activeAdCount > 0 &&
    (payload.insufficientEnrichedAds === true || payload.lowEnrichmentConfidence === true) ? (
      <div className="mb-4 rounded-xl border border-amber-200/90 bg-amber-50/90 px-4 py-3 text-[13px] text-amber-950">
        <p className="font-semibold text-amber-950">Some strategy signals are still filling in</p>
        <p className="mt-1 text-amber-950/95">
          {payload.insufficientEnrichedAds
            ? "Fewer than five ads finished funnel and angle analysis. Sidebar and map numbers still come from benchmarks and your scraped creatives."
            : "Less than half of saved ads are fully enriched yet — run more scrapes or trigger a rebuild after enrichment catches up."}{" "}
          Open the Ads Library tab to load creatives, or use{" "}
          <span className="font-medium">Refresh strategy</span> / <span className="font-medium">Rebuild from saved ads</span>.
        </p>
      </div>
    ) : null;

  const mapHeadline =
    payload && payload.map.activeAdCount > 0 && payload.map.title?.trim()
      ? payload.map.title
      : "Strategy overview";

  const confidenceLabel = (payload?.derivationQuality ?? payload?.map.derivationQuality)?.trim();

  const strategyDescription =
    !displayError && payload ? (
      <>
        Full funnel map and enrichment from scraped ads for <span className="font-medium text-slate-700">{brand.name}</span>
        {cached ? (
          <>
            {" "}
            ·{" "}
            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-600">Cached</span>
          </>
        ) : null}
        {confidenceLabel ? (
          <>
            {" "}
            · Confidence: {confidenceLabel}
          </>
        ) : null}
      </>
    ) : (
      <>
        Full funnel map and enrichment from scraped ads for <span className="font-medium text-slate-700">{brand.name}</span>
        {cached ? (
          <>
            {" "}
            ·{" "}
            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-600">Cached</span>
          </>
        ) : null}
      </>
    );

  const showInitialSpinner = loading && !payload;

  return (
    <div className="relative mx-auto w-full max-w-[1400px] px-6 py-8 sm:px-8 lg:px-10">
      <CacheRevalidatingDot show={isValidating && !!payload} className="right-4 top-4" />
      {!showInitialSpinner ? (
        <FeatureSectionHeader
          className="mb-4"
          overline="Strategy map"
          title={mapHeadline}
          description={strategyDescription}
          titleTrailing={
            !displayError && payload && payload.map.activeAdCount > 0 ? (
              <DataFreshnessBadge lastScrapedAt={lastScrapedAt ?? null} onRefresh={onFreshnessRescrape} />
            ) : undefined
          }
        />
      ) : null}

      {backgroundRecompute && !emptyStrategy ? (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-indigo-200/90 bg-indigo-50/90 px-4 py-2.5 text-[13px] text-indigo-950">
          <span className="mt-0.5 inline-flex shrink-0 rounded-lg border border-indigo-200/80 bg-white/90 p-[3px] shadow-sm ring-1 ring-indigo-900/[0.05]">
            <RivalLogoVideo size="inline" />
          </span>
          <span className="pt-px leading-snug">
            Building strategy overview in the background… this page will update when recomputation finishes.
          </span>
        </div>
      ) : null}

      {showInitialSpinner ? <RivalLoadingBlock title="Loading strategy data…" padded className="py-20" /> : null}

      {!showInitialSpinner && displayError ? (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50/80 px-4 py-3 text-[14px] text-red-900">
          {displayError}
          <button
            type="button"
            className="mt-2 block text-[13px] font-medium underline"
            onClick={() => {
              setPollError(null);
              void refetch({ force: true });
            }}
          >
            Try again
          </button>
        </div>
      ) : null}

      {!showInitialSpinner && !displayError && backgroundRecompute && emptyStrategy ? (
        <RivalLoadingBlock
          title="Building strategy overview…"
          description="Analyzing scraped ads and generating your funnel map. This usually takes under two minutes."
          size="xl"
          padded
          className="py-14"
        />
      ) : null}

      {!showInitialSpinner && !displayError && !backgroundRecompute && emptyStrategy ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f4f4f5] text-[#a1a1aa]">
            <BarChart3 className="h-6 w-6" />
          </div>
          <p className="text-[15px] font-semibold text-[#3f3f46]">No scraped ads in strategy pipeline yet</p>
          <p className="mt-1.5 max-w-md text-[13px] text-[#71717a]">
            Strategy map is built from ads saved when the Ads Library API runs (including cached responses). Open the Ads
            Library tab first so creatives load, then use <span className="font-medium text-[#52525b]">Reload</span> here —
            or rebuild after a fresh scrape.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              disabled={recomputeBusy}
              onClick={() => void refetch({ force: true })}
              className="rounded-full border border-[#e4e4e7] bg-white px-4 py-2 text-[13px] font-medium text-[#3f3f46] shadow-sm hover:bg-[#fafafa]"
            >
              Reload overview
            </button>
            <button
              type="button"
              disabled={recomputeBusy}
              onClick={() => {
                setRecomputeBusy(true);
                void (async () => {
                  try {
                    const res = await fetch("/api/strategy-overview/recompute", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ competitorDomain: domain }),
                    });
                    const json = (await res.json()) as { ok: boolean; payload?: CompetitorStrategyOverviewPayload };
                    if (json.ok) {
                      setPollError(null);
                      void refetch();
                    }
                  } finally {
                    setRecomputeBusy(false);
                  }
                })();
              }}
              className="rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-[13px] font-medium text-indigo-900 hover:bg-indigo-100/90"
            >
              {recomputeBusy ? "Working…" : "Rebuild from saved ads"}
            </button>
          </div>
        </div>
      ) : null}

      {!showInitialSpinner && !displayError && payload && payload.map.activeAdCount > 0 ? (
        <>
          {enrichmentBanner}

          {suppressBanner ? (
            <div className="mb-4 rounded-xl border border-amber-200/90 bg-amber-50/90 px-4 py-3 text-[13px] text-amber-950">
              {suppressBanner}
            </div>
          ) : null}

          {edgeTip ? (
            <div className="pointer-events-none fixed bottom-24 left-1/2 z-40 max-w-md -translate-x-1/2 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-[11px] text-slate-700 shadow-lg">
              <span className="font-semibold"> {(edgeTip.confidence * 100).toFixed(0)}% — </span>
              {edgeTip.reasoning}
            </div>
          ) : null}

          <div className="flex flex-col items-start gap-6 xl:flex-row">
            <div className="min-w-0 w-full flex-1 space-y-3">
              {funnelClassificationBanner}
              <StrategyMapFlow
                mapKey={mapKey}
                map={payload.map}
                onNodeClick={(nodeId) => {
                  if (nodeId.includes(":")) {
                    setOpenCellId(nodeId as FunnelCellId);
                    setSheetPlatform(null);
                    return;
                  }
                  setSelectedPlatform(nodeId as never);
                  setSheetPlatform(nodeId);
                }}
                onEdgeHover={setEdgeTip}
              />
            </div>
            <aside className="w-full shrink-0 xl:w-[300px]">
              <StrategyOverviewSidebar
                map={payload.map}
                competitorId={competitorId}
                cacheDomainNorm={domainNorm}
                lastScrapedAt={lastScrapedAt ?? null}
                onFreshnessRescrape={onFreshnessRescrape}
              />
            </aside>
          </div>

          <div className="mt-6 flex justify-center">
            <button
              type="button"
              disabled={recomputeBusy}
              onClick={() => {
                setRecomputeBusy(true);
                void (async () => {
                  try {
                    const res = await fetch("/api/strategy-overview/recompute", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ competitorDomain: domain }),
                    });
                    const json = (await res.json()) as { ok: boolean; payload?: CompetitorStrategyOverviewPayload };
                    if (json.ok) {
                      setPollError(null);
                      void refetch();
                    }
                  } finally {
                    setRecomputeBusy(false);
                  }
                })();
              }}
              className="flex items-center gap-2 rounded-full border border-[#e4e4e7] px-4 py-2 text-[13px] text-[#71717a] hover:text-[#3f3f46]"
            >
              {recomputeBusy ? (
                <span className="inline-flex rounded-md border border-neutral-200/80 bg-white/90 p-[3px]">
                  <RivalLogoVideo size="inline" />
                </span>
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh strategy
            </button>
          </div>

          <FunnelCellSheet
            open={openCellId != null}
            cellId={openCellId}
            competitorId={competitorId ?? ""}
            cacheDomainNorm={domainNorm}
            cellSummary={cellSummary}
            onClose={() => setOpenCellId(null)}
          />

          <NodeDetailSheet
            open={sheetPlatform != null}
            platform={sheetPlatform}
            competitorDomain={domain}
            onClose={() => setSheetPlatform(null)}
            onOpenAdsLibrary={onOpenAdsLibrary}
          />
        </>
      ) : null}
    </div>
  );
}
