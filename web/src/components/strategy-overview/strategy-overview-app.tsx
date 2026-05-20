"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { RivalLoadingBlock } from "@/components/ui/rival-loading";

import {
  ADS_LIBRARY_UPDATED_EVENT,
  pendingStrategyRefreshStorageKey,
} from "@/lib/strategy-overview/ads-library-strategy-bridge";
import type { CompetitorStrategyOverviewPayload, FunnelCellId } from "@/lib/strategy-overview/payload-types";
import { normalizeCompetitorStrategyOverviewPayload, normalizeStrategyMapPayload } from "@/lib/strategy-overview/normalize-strategy-payload";
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
  /** Bump suffix when compiled payload shape expectations change (invalidates stale local/session cache). */
  const strategyCacheKey = `${domainNorm}:strategy-compiled:v2:${scrapeStamp}`;

  const setSelectedPlatform = useStrategyOverviewUi((s) => s.setSelectedPlatform);

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
    validateCached: (c) => {
      const p = c.payload;
      return c.ok === true && !!p && typeof p.map === "object" && p.map != null;
    },
    fetcher: async ({ force } = {}) => {
      const q = new URLSearchParams({ competitorDomain: domain });
      if (force) q.set("force", "1");
      const res = await fetch(`/api/strategy-overview/compiled?${q}`);
      const json = (await res.json()) as StrategyCompiledResponse;
      if (!json.ok || !json.payload) {
        throw new Error(json.error ?? "Failed to load strategy overview");
      }
      return {
        ...json,
        payload: normalizeCompetitorStrategyOverviewPayload(json.payload),
      };
    },
  });

  const payload = useMemo(() => {
    const raw = compiled?.payload;
    return raw ? normalizeCompetitorStrategyOverviewPayload(raw) : null;
  }, [compiled?.payload]);
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

  const pipelinePending =
    compiled?.recomputing === true ||
    compiled?.staleWhileRecomputing === true ||
    backgroundRecompute;

  const emptyStrategy = useMemo(
    () =>
      !!payload &&
      (payload.pipelineStatus === "no_ads_found" || (payload.map?.activeAdCount ?? 0) === 0),
    [payload]
  );

  const autoKickRef = useRef<string | null>(null);

  useEffect(() => {
    autoKickRef.current = null;
  }, [domainNorm, scrapeStamp]);

  useEffect(() => {
    if (loading || !domainNorm || displayError) return;
    const needsPipeline = !payload || emptyStrategy || pipelinePending;
    if (!needsPipeline) return;
    const kickKey = `${domainNorm}:${scrapeStamp}`;
    if (autoKickRef.current === kickKey) return;
    autoKickRef.current = kickKey;

    void (async () => {
      try {
        await fetch(`/api/strategy-overview/compiled?competitorDomain=${encodeURIComponent(domain)}`, {
          credentials: "include",
        });
        void refetch();
        await fetch("/api/strategy-overview/recompute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ competitorDomain: domain }),
          credentials: "include",
        });
        void refetch();
      } catch {
        /* status polling retries */
      }
    })();
  }, [
    loading,
    domainNorm,
    scrapeStamp,
    domain,
    displayError,
    payload,
    emptyStrategy,
    pipelinePending,
    refetch,
  ]);

  useEffect(() => {
    if (!pipelinePending) return;
    const id = window.setInterval(() => {
      void refetch();
    }, 8000);
    return () => window.clearInterval(id);
  }, [pipelinePending, refetch]);

  const mapKey = useMemo(() => {
    if (!payload?.map) return "empty";
    const m = normalizeStrategyMapPayload(payload.map);
    const fc = m.funnelCells;
    const fcKey = fc?.length ? fc.map((c) => c.id).join("|") : "legacy-cells";
    const nodes = Array.isArray(m.platformNodes) ? m.platformNodes : [];
    return `${m.activeAdCount}-${fcKey}-${nodes.map((n) => n.adCount).join(",")}`;
  }, [payload]);

  const cellSummary = useMemo(() => {
    if (!openCellId || !payload?.map?.funnelCells?.length) return null;
    return payload.map.funnelCells.find((c) => c.id === openCellId) ?? null;
  }, [openCellId, payload]);

  const mapHeadline =
    payload && payload.map.activeAdCount > 0 && payload.map.title?.trim()
      ? payload.map.title
      : "Strategy overview";

  const confidenceLabel = (payload?.derivationQuality ?? payload?.map?.derivationQuality)?.trim();

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
  const awaitingStrategy =
    showInitialSpinner || pipelinePending || emptyStrategy || (!payload && !displayError && loading);
  const showMap =
    !displayError && !!payload && payload.map.activeAdCount > 0 && !pipelinePending;

  return (
    <div className="relative mx-auto w-full max-w-[1400px] px-6 py-8 sm:px-8 lg:px-10">
      <CacheRevalidatingDot show={isValidating && !!payload && !pipelinePending} className="right-4 top-4" />
      {!awaitingStrategy ? (
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

      {awaitingStrategy ? <RivalLoadingBlock padded className="py-20" /> : null}

      {!awaitingStrategy && displayError ? (
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

      {showMap ? (
        <>
          {edgeTip ? (
            <div className="pointer-events-none fixed bottom-24 left-1/2 z-40 max-w-md -translate-x-1/2 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-[11px] text-slate-700 shadow-lg">
              <span className="font-semibold"> {(edgeTip.confidence * 100).toFixed(0)}% — </span>
              {edgeTip.reasoning}
            </div>
          ) : null}

          <div className="flex flex-col items-start gap-6 xl:flex-row">
            <div className="min-w-0 w-full flex-1 space-y-3">
              <StrategyMapFlow
                mapKey={mapKey}
                map={payload!.map}
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
            <aside className="w-full shrink-0 xl:w-[min(520px,36vw)] xl:max-w-[520px]">
              <StrategyOverviewSidebar
                map={payload!.map}
                competitorId={competitorId}
                cacheDomainNorm={domainNorm}
                lastScrapedAt={lastScrapedAt ?? null}
                onFreshnessRescrape={onFreshnessRescrape}
              />
            </aside>
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
