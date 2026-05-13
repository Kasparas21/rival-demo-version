"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BarChart3, RefreshCw } from "lucide-react";

import { RivalLoadingBlock, RivalLogoVideo } from "@/components/ui/rival-loading";

import {
  ADS_LIBRARY_UPDATED_EVENT,
  pendingStrategyRefreshStorageKey,
} from "@/lib/strategy-overview/ads-library-strategy-bridge";
import type {
  CompetitorStrategyOverviewPayload,
  FunnelCellId,
} from "@/lib/strategy-overview/payload-types";
import { useStrategyOverviewUi, type StrategyViewMode } from "@/lib/strategy-overview/strategy-overview-store";
import { StrategyViewToggle } from "@/components/strategy-overview/strategy-view-toggle";
import { StrategyMapFlow } from "@/components/strategy-overview/strategy-map-flow";
import { StrategyOverviewSidebar } from "@/components/strategy-overview/strategy-sidebar";
import { StrategyInsightView } from "@/components/strategy-overview/strategy-insight-view";
import { FunnelCellSheet } from "@/components/strategy-overview/funnel-cell-sheet";
import { NodeDetailSheet } from "@/components/strategy-overview/node-detail-sheet";

type Brand = { name: string; domain: string };

type Props = {
  brand: Brand;
  onOpenAdsLibrary?: () => void;
  /** When set, parent controls map vs insight; internal toggle is hidden. */
  forceView?: StrategyViewMode;
  competitorId?: string;
};

function readViewParam(raw: string | null): StrategyViewMode {
  if (raw === "insight") return "insight";
  return "map";
}

export function StrategyOverviewApp({ brand, onOpenAdsLibrary, forceView, competitorId }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlView = readViewParam(searchParams.get("view"));
  const view: StrategyViewMode = forceView ?? urlView;

  const setView = useCallback(
    (v: StrategyViewMode) => {
      const p = new URLSearchParams(searchParams.toString());
      p.set("view", v);
      router.replace(`${pathname}?${p.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const setSelectedPlatform = useStrategyOverviewUi((s) => s.setSelectedPlatform);
  const selectedPlatform = useStrategyOverviewUi((s) => s.selectedPlatform);

  const [payload, setPayload] = useState<CompetitorStrategyOverviewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cached, setCached] = useState(false);
  const [recomputeBusy, setRecomputeBusy] = useState(false);
  const [sheetPlatform, setSheetPlatform] = useState<string | null>(null);
  const [openCellId, setOpenCellId] = useState<FunnelCellId | null>(null);
  const [edgeTip, setEdgeTip] = useState<{ reasoning: string; confidence: number } | null>(null);

  const domain = brand.domain.trim();

  const [backgroundRecompute, setBackgroundRecompute] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const loadGenerationRef = useRef(0);

  const clearPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const load = useCallback(
    async (force?: boolean, isCancelled?: () => boolean) => {
      const myGeneration = ++loadGenerationRef.current;
      clearPoll();
      setLoading(true);
      setError(null);
      try {
        const q = new URLSearchParams({ competitorDomain: domain });
        if (force) q.set("force", "1");
        const res = await fetch(`/api/strategy-overview/compiled?${q}`);
        if (isCancelled?.() || myGeneration !== loadGenerationRef.current) return;
        const json = (await res.json()) as {
          ok: boolean;
          error?: string;
          payload?: CompetitorStrategyOverviewPayload;
          cached?: boolean;
          recomputing?: boolean;
          staleWhileRecomputing?: boolean;
        };
        if (isCancelled?.() || myGeneration !== loadGenerationRef.current) return;
        if (!json.ok || !json.payload) {
          if (isCancelled?.() || myGeneration !== loadGenerationRef.current) return;
          setPayload(null);
          setError(json.error ?? "Failed to load strategy overview");
          setCached(false);
          setBackgroundRecompute(false);
          return;
        }
        if (isCancelled?.() || myGeneration !== loadGenerationRef.current) return;
        setPayload(json.payload);
        setCached(json.cached === true);

        const shouldPoll = json.recomputing === true || json.staleWhileRecomputing === true;
        if (shouldPoll) {
          if (isCancelled?.() || myGeneration !== loadGenerationRef.current) return;
          setBackgroundRecompute(true);
          clearPoll();
          if (isCancelled?.() || myGeneration !== loadGenerationRef.current) return;
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
                if (myGeneration !== loadGenerationRef.current || isCancelled?.()) return;
                const sj = (await st.json()) as {
                  ok?: boolean;
                  status?: string;
                  error?: string | null;
                };
                if (myGeneration !== loadGenerationRef.current || isCancelled?.()) return;
                statusFailed = sj.ok === true && sj.status === "failed";
                failedMessage = sj.error?.trim() ?? null;
                done =
                  triesRef.n >= maxPolls ||
                  (sj.ok === true && (sj.status === "idle" || sj.status === "failed"));
              } catch {
                done = triesRef.n >= maxPolls;
              }
              if (!done) return;
              if (myGeneration !== loadGenerationRef.current || isCancelled?.()) return;

              if (pollRef.current) {
                clearInterval(pollRef.current);
                pollRef.current = null;
              }
              setBackgroundRecompute(false);
              if (statusFailed) {
                setError(failedMessage || "Strategy recomputation failed");
              }

              try {
                const qQuiet = new URLSearchParams({ competitorDomain: domain });
                const resQuiet = await fetch(`/api/strategy-overview/compiled?${qQuiet}`);
                if (myGeneration !== loadGenerationRef.current || isCancelled?.()) return;
                const jq = (await resQuiet.json()) as {
                  ok: boolean;
                  payload?: CompetitorStrategyOverviewPayload;
                  cached?: boolean;
                };
                if (myGeneration !== loadGenerationRef.current || isCancelled?.()) return;
                if (jq.ok && jq.payload) {
                  setPayload(jq.payload);
                  setCached(jq.cached === true);
                  setError(null);
                }
              } catch {
                /* ignore transient refresh errors */
              }
            })();
          }, 5000);
        } else {
          if (isCancelled?.() || myGeneration !== loadGenerationRef.current) return;
          setBackgroundRecompute(false);
        }
      } catch {
        if (myGeneration !== loadGenerationRef.current) return;
        setPayload(null);
        setError("Network error");
        setCached(false);
        setBackgroundRecompute(false);
      } finally {
        if (myGeneration === loadGenerationRef.current) {
          setLoading(false);
        }
      }
    },
    [clearPoll, domain]
  );

  const domainNorm = useMemo(() => domain.trim().toLowerCase(), [domain]);

  useEffect(() => {
    let debounce: ReturnType<typeof setTimeout> | null = null;
    const handler: EventListener = (ev) => {
      const detail = (ev as CustomEvent<{ domain?: string }>).detail;
      const d = detail?.domain?.trim().toLowerCase() ?? "";
      if (!d || d !== domainNorm) return;
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => {
        debounce = null;
        void load(true);
      }, 350);
    };
    window.addEventListener(ADS_LIBRARY_UPDATED_EVENT, handler);
    return () => {
      if (debounce) clearTimeout(debounce);
      window.removeEventListener(ADS_LIBRARY_UPDATED_EVENT, handler);
    };
  }, [domainNorm, load]);

  useEffect(() => {
    let cancelled = false;
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
        void load(true, () => cancelled);
        return () => {
          cancelled = true;
          clearPoll();
        };
      }
    }
    void load(false, () => cancelled);
    return () => {
      cancelled = true;
      clearPoll();
    };
  }, [clearPoll, load, domainNorm]);

  const emptyStrategy = useMemo(
    () =>
      !!payload &&
      (payload.pipelineStatus === "no_ads_found" || payload.map.activeAdCount === 0),
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
    !loading &&
    !error &&
    payload &&
    payload.map.activeAdCount > 0 &&
    Array.isArray(payload.map.funnelCells) &&
    payload.map.funnelCells.length === 0 ? (
      <div className="mb-4 rounded-xl border border-sky-200/90 bg-sky-50/90 px-4 py-3 text-[13px] text-sky-950">
        <p className="font-semibold text-sky-950">Funnel classification is still processing for this competitor.</p>
        <p className="mt-1 text-sky-950/95">
          Showing platform-level view in the meantime.
        </p>
      </div>
    ) : null;

  const suppressBanner = payload?.map.suppressEdgesReason
    ? payload.map.suppressEdgesReason === "low_sample"
      ? "More ads are needed to detect funnel flow with confidence. Run a fresh scrape to gather additional creatives."
      : `This competitor only advertises on ${payload.map.platformCount} channel(s). Cross-platform funnel lines are hidden.`
    : null;

  const enrichmentBanner =
    !loading &&
    !error &&
    payload &&
    payload.map.activeAdCount > 0 &&
    (payload.insufficientEnrichedAds === true || payload.lowEnrichmentConfidence === true) ? (
      <div className="mb-4 rounded-xl border border-amber-200/90 bg-amber-50/90 px-4 py-3 text-[13px] text-amber-950">
        <p className="font-semibold text-amber-950">Some strategy copy is still heuristic</p>
        <p className="mt-1 text-amber-950/95">
          {payload.insufficientEnrichedAds
            ? "Fewer than five ads finished funnel and angle analysis, so the deep AI insight pass was skipped. Sidebar and map numbers still come from benchmarks and your scraped creatives."
            : "Less than half of saved ads are fully enriched yet, so AI narratives may stay generic until analysis catches up."}{" "}
          Open the Ads Library tab to load creatives, wait for enrichment, or use{" "}
          <span className="font-medium">Refresh insights</span> / <span className="font-medium">Rebuild from saved ads</span>{" "}
          after more rows analyze.
        </p>
      </div>
    ) : null;

  return (
    <div className="w-full max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-10 py-8">
      <div className="mb-2">
        <h2 className="text-[18px] font-semibold text-[#343434]">Strategy overview</h2>
        <p className="text-[14px] text-[#71717a] mt-0.5">
          Full funnel map and enriched insights from scraped ads for{" "}
          <span className="font-medium text-[#3f3f46]">{brand.name}</span>.
          {cached ? (
            <span className="ml-2 text-[11px] font-medium text-indigo-600 bg-indigo-50 rounded-full px-2 py-0.5">
              Cached
            </span>
          ) : null}
        </p>
      </div>

      {!forceView ? <StrategyViewToggle view={view} onChange={setView} /> : null}

      {backgroundRecompute && !emptyStrategy ? (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-indigo-200/90 bg-indigo-50/90 px-4 py-2.5 text-[13px] text-indigo-950">
          <span className="mt-0.5 inline-flex shrink-0 rounded-lg border border-indigo-200/80 bg-white/90 p-[3px] shadow-sm ring-1 ring-indigo-900/[0.05]">
            <RivalLogoVideo size="inline" />
          </span>
          <span className="leading-snug pt-px">
            Building strategy overview in the background… this page will update when recomputation finishes.
          </span>
        </div>
      ) : null}

      {loading ? <RivalLoadingBlock title="Loading strategy data…" padded className="py-20" /> : null}

      {!loading && error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50/80 px-4 py-3 text-[14px] text-red-900 mb-4">
          {error}
          <button
            type="button"
            className="mt-2 block text-[13px] font-medium underline"
            onClick={() => void load(false)}
          >
            Try again
          </button>
        </div>
      ) : null}

      {!loading && !error && backgroundRecompute && emptyStrategy ? (
        <RivalLoadingBlock
          title="Building strategy overview…"
          description="Analyzing scraped ads and generating your funnel map. This usually takes under two minutes."
          size="xl"
          padded
          className="py-14"
        />
      ) : null}

      {!loading && !error && !backgroundRecompute && emptyStrategy ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f4f4f5] text-[#a1a1aa]">
            <BarChart3 className="h-6 w-6" />
          </div>
          <p className="text-[15px] font-semibold text-[#3f3f46]">No scraped ads in strategy pipeline yet</p>
          <p className="mt-1.5 max-w-md text-[13px] text-[#71717a]">
            Strategy map and insights are built from ads saved when the Ads Library API runs (including cached
            responses). Open the Ads Library tab first so creatives load, then use{" "}
            <span className="font-medium text-[#52525b]">Reload</span> here — or rebuild after a fresh scrape.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              disabled={recomputeBusy}
              onClick={() => void load(true)}
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
                    if (json.ok && json.payload) setPayload(json.payload);
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

      {!loading && !error && payload && payload.map.activeAdCount > 0 ? (
        <>
          {enrichmentBanner}

          {suppressBanner ? (
            <div className="mb-4 rounded-xl border border-amber-200/90 bg-amber-50/90 px-4 py-3 text-[13px] text-amber-950">
              {suppressBanner}
            </div>
          ) : null}

          {edgeTip ? (
            <div className="fixed bottom-24 left-1/2 z-40 max-w-md -translate-x-1/2 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-[11px] text-slate-700 shadow-lg pointer-events-none">
              <span className="font-semibold"> {(edgeTip.confidence * 100).toFixed(0)}% — </span>
              {edgeTip.reasoning}
            </div>
          ) : null}

          {view === "map" ? (
            <div className="flex flex-col xl:flex-row gap-6 items-start">
              <div className="flex-1 min-w-0 w-full space-y-3">
                <div className="flex flex-wrap items-center gap-2 gap-y-1">
                  <h3 className="text-[16px] font-bold text-[#0f172a] tracking-tight">{payload.map.title}</h3>
                  {payload.map.derivationQuality || payload.derivationQuality ? (
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200/80">
                      Confidence: {payload.derivationQuality ?? payload.map.derivationQuality}
                    </span>
                  ) : null}
                </div>
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
              <aside className="w-full xl:w-[300px] shrink-0">
                <StrategyOverviewSidebar map={payload.map} competitorId={competitorId} />
              </aside>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 gap-y-1">
                  <h3 className="text-[17px] font-bold text-[#0f172a] tracking-tight">Strategic insights</h3>
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-violet-100 text-violet-800 border border-violet-200/80">
                    AI-generated
                  </span>
                </div>
                <p className="text-[13px] text-[#64748b] mt-1 max-w-[720px]">
                  AI-powered analysis of{" "}
                  <span className="font-medium text-[#334155]">{payload.map.competitor.name}</span>
                  &apos;s advertising strategy, creative performance, and audience signals — grounded in your
                  scraped ad library.
                </p>
              </div>
              <StrategyInsightView insights={payload.insights} selectedPlatform={selectedPlatform} />
            </div>
          )}

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
                    if (json.ok && json.payload) setPayload(json.payload);
                  } finally {
                    setRecomputeBusy(false);
                  }
                })();
              }}
              className="border border-[#e4e4e7] rounded-full px-4 py-2 text-[13px] text-[#71717a] hover:text-[#3f3f46] flex items-center gap-2"
            >
              {recomputeBusy ? (
                <span className="inline-flex rounded-md border border-neutral-200/80 bg-white/90 p-[3px]">
                  <RivalLogoVideo size="inline" />
                </span>
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh insights
            </button>
          </div>

          <FunnelCellSheet
            open={openCellId != null}
            cellId={openCellId}
            competitorId={competitorId ?? ""}
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
