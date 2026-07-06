"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  ADS_LIBRARY_UPDATED_EVENT,
  pendingStrategyRefreshStorageKey,
  STRATEGY_CHANNEL_DATA_UPDATED_EVENT,
} from "@/lib/strategy-overview/ads-library-strategy-bridge";
import { hasChannelSignals } from "@/lib/strategy-overview/channel-signals";
import { hasJourneyGoal } from "@/lib/strategy-overview/derive-journey-goal";
import type { CompetitorStrategyOverviewPayload, FunnelCellId } from "@/lib/strategy-overview/payload-types";
import { normalizeCompetitorStrategyOverviewPayload, normalizeStrategyMapPayload } from "@/lib/strategy-overview/normalize-strategy-payload";
import { useStrategyOverviewUi } from "@/lib/strategy-overview/strategy-overview-store";
import { StrategyMapFlow } from "@/components/strategy-overview/strategy-map-flow";
import { StrategyMapSkeleton } from "@/components/strategy-overview/strategy-map-skeleton";
import { StrategyChannelSummary } from "@/components/strategy-overview/strategy-channel-summary";
import { StrategyJourneySummary } from "@/components/strategy-overview/strategy-journey-summary";
import { StrategyOverviewSidebar } from "@/components/strategy-overview/strategy-sidebar";
import { FunnelCellSheet } from "@/components/strategy-overview/funnel-cell-sheet";
import { EmailChannelSheet } from "@/components/strategy-overview/email-channel-sheet";
import { JourneyGoalSheet } from "@/components/strategy-overview/journey-goal-sheet";
import { OrganicChannelSheet } from "@/components/strategy-overview/organic-channel-sheet";
import { NodeDetailSheet } from "@/components/strategy-overview/node-detail-sheet";
import { OrganicPostDetailDrawer } from "@/components/organic/OrganicPostDetailDrawer";
import { OwnBrandStrategyGapsPanel } from "@/components/workspace/own-brand-strategy-gaps-panel";
import type { OrganicPostDetailOpenSeed } from "@/lib/organic-content/organic-post-detail-cache";
import { useOrganicPostDetailState } from "@/lib/organic-content/use-organic-post-detail-state";
import type { OrganicChannelPlatform } from "@/lib/strategy-overview/payload-types";
import { CacheRevalidatingDot } from "@/components/competitor/data-freshness-badge";
import { COMPETITOR_PAGE_SHELL } from "@/components/dashboard/competitor/competitor-page-layout";
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
  /** When false, skip compiled fetch (tab mounted but inactive). */
  fetchEnabled?: boolean;
  /** Lifted from competitor page — replaces local recompute-status polling. */
  externalRecomputeRunning?: boolean;
  externalRecomputeError?: string | null;
  isOwnWorkspace?: boolean;
  brandId?: string;
  onNavigateGaps?: (tab: string, sub?: string | null) => void;
  onOpenOrganicTab?: () => void;
  onOpenEmailTab?: () => void;
  onOpenLandingPages?: () => void;
};

export function StrategyOverviewApp({
  brand,
  onOpenAdsLibrary,
  competitorId,
  lastScrapedAt = null,
  onFreshnessRescrape,
  fetchEnabled = true,
  externalRecomputeRunning = false,
  externalRecomputeError = null,
  isOwnWorkspace = false,
  brandId,
  onNavigateGaps,
  onOpenOrganicTab,
  onOpenEmailTab,
  onOpenLandingPages,
}: Props) {
  const domain = brand.domain.trim();
  const domainNorm = useMemo(() => domain.trim().toLowerCase(), [domain]);
  const scrapeStamp = lastScrapedAt ?? "none";
  /** Bump suffix when compiled payload shape expectations change (invalidates stale local/session cache). */
  const strategyCacheKey = `${domainNorm}:strategy-compiled:v4-journey-goal:${scrapeStamp}`;

  const setSelectedPlatform = useStrategyOverviewUi((s) => s.setSelectedPlatform);

  const [sheetPlatform, setSheetPlatform] = useState<string | null>(null);
  const [openCellId, setOpenCellId] = useState<FunnelCellId | null>(null);
  const [openOrganicPlatform, setOpenOrganicPlatform] = useState<OrganicChannelPlatform | null>(null);
  const [openEmailChannel, setOpenEmailChannel] = useState(false);
  const [openGoalSheet, setOpenGoalSheet] = useState(false);
  const [edgeTip, setEdgeTip] = useState<{ reasoning: string; confidence: number } | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);

  const { activePostId, openPost, closePost } = useOrganicPostDetailState(competitorId);

  const { data: compiled, loading, isValidating, error: loadError, refetch, refetchIfStale, cacheHit } =
    useScrapeKeyedCache<StrategyCompiledResponse>({
    cacheKey: strategyCacheKey,
    enabled: Boolean(domainNorm) && fetchEnabled,
    validateCached: (c) => {
      const p = c.payload;
      if (!(c.ok === true && p && typeof p.map === "object" && p.map != null)) return false;
      // Drop pre-runtime-layer client caches (fields were never attached server-side).
      return (
        Object.prototype.hasOwnProperty.call(p, "channelSignals") &&
        Object.prototype.hasOwnProperty.call(p, "journeyGoal")
      );
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
  const displayError = loadError?.message ?? pollError ?? externalRecomputeError;
  const isBackgroundRefresh =
    externalRecomputeRunning ||
    compiled?.recomputing === true ||
    compiled?.staleWhileRecomputing === true;

  useEffect(() => {
    let debounce: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefresh = () => {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => {
        debounce = null;
        void refetch();
      }, 350);
    };
    const handler: EventListener = (ev) => {
      const detail = (ev as CustomEvent<{ domain?: string }>).detail;
      const d = detail?.domain?.trim().toLowerCase() ?? "";
      if (!d || d !== domainNorm) return;
      scheduleRefresh();
    };
    window.addEventListener(ADS_LIBRARY_UPDATED_EVENT, handler);
    window.addEventListener(STRATEGY_CHANNEL_DATA_UPDATED_EVENT, handler);
    return () => {
      if (debounce) clearTimeout(debounce);
      window.removeEventListener(ADS_LIBRARY_UPDATED_EVENT, handler);
      window.removeEventListener(STRATEGY_CHANNEL_DATA_UPDATED_EVENT, handler);
    };
  }, [domainNorm, refetch]);

  /** Stale-while-revalidate: show cached map instantly, then refresh channel layer from API. */
  useEffect(() => {
    if (!fetchEnabled || !domainNorm) return;
    if (cacheHit) {
      void refetchIfStale(0);
      return;
    }
    const p = compiled?.payload;
    if (
      p &&
      (!Object.prototype.hasOwnProperty.call(p, "channelSignals") ||
        !Object.prototype.hasOwnProperty.call(p, "journeyGoal"))
    ) {
      void refetch();
    }
  }, [fetchEnabled, domainNorm, cacheHit, compiled?.payload, refetch, refetchIfStale]);

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
  }, [domainNorm, refetch]);

  useEffect(() => {
    if (!externalRecomputeError) return;
    setPollError(externalRecomputeError);
  }, [externalRecomputeError]);

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
    if (loading || !domainNorm || displayError || !fetchEnabled) return;
    const needsPipeline = !payload || emptyStrategy;
    if (!needsPipeline) return;
    const kickKey = `${domainNorm}:${scrapeStamp}`;
    if (autoKickRef.current === kickKey) return;
    autoKickRef.current = kickKey;

    void (async () => {
      try {
        const st = await fetch(
          `/api/strategy-overview/recompute-status?competitorDomain=${encodeURIComponent(domain)}`,
          { credentials: "include" }
        );
        const sj = (await st.json()) as { ok?: boolean; status?: string };
        if (sj.ok && sj.status === "running") {
          void refetch();
          return;
        }

        if (externalRecomputeRunning) return;

        const rec = await fetch("/api/strategy-overview/recompute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ competitorDomain: domain }),
          credentials: "include",
        });
        if (rec.status !== 409) {
          void refetch();
        }
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
    fetchEnabled,
    payload,
    emptyStrategy,
    refetch,
    externalRecomputeRunning,
  ]);

  const mapKey = useMemo(() => {
    if (!payload?.map) return "empty";
    const m = normalizeStrategyMapPayload(payload.map);
    const fc = m.funnelCells;
    const fcKey = fc?.length ? fc.map((c) => c.id).join("|") : "legacy-cells";
    const nodes = Array.isArray(m.platformNodes) ? m.platformNodes : [];
    const ch = payload.channelSignals;
    const chKey = ch
      ? `${ch.organicNodes.length}-${ch.emailNode?.emailCount ?? 0}-${ch.channelEdges.length}`
      : "no-ch";
    const jg = payload.journeyGoal;
    const jgKey = jg ? `${jg.kind}-${jg.goalEdges.length}` : "no-goal";
    return `${m.activeAdCount}-${fcKey}-${nodes.map((n) => n.adCount).join(",")}-${chKey}-${jgKey}`;
  }, [payload]);

  const cellSummary = useMemo(() => {
    if (!openCellId || !payload?.map?.funnelCells?.length) return null;
    return payload.map.funnelCells.find((c) => c.id === openCellId) ?? null;
  }, [openCellId, payload]);

  const organicNodeSummary = useMemo(() => {
    if (!openOrganicPlatform || !payload?.channelSignals) return null;
    return (
      payload.channelSignals.organicNodes.find((n) => n.platform === openOrganicPlatform) ?? null
    );
  }, [openOrganicPlatform, payload?.channelSignals]);

  const emailNodeSummary = useMemo(
    () => payload?.channelSignals?.emailNode ?? null,
    [payload?.channelSignals],
  );

  const closeChannelSheets = useCallback(() => {
    setOpenOrganicPlatform(null);
    setOpenEmailChannel(false);
    setOpenGoalSheet(false);
  }, []);

  const handleOpenOrganicPost = useCallback(
    (postId: string, seed: OrganicPostDetailOpenSeed) => {
      openPost(postId, seed);
    },
    [openPost],
  );

  const mapHeadline =
    payload && payload.map.activeAdCount > 0 && payload.map.title?.trim()
      ? payload.map.title
      : "Strategy overview";

  const confidenceLabel = (payload?.derivationQuality ?? payload?.map?.derivationQuality)?.trim();

  const channelsActive = hasChannelSignals(payload?.channelSignals);
  const journeyGoalActive = hasJourneyGoal(payload?.journeyGoal);

  const strategyDescription =
    !displayError && payload ? (
      <>
        {channelsActive
          ? "Full funnel map from scraped ads, organic social, and email capture for "
          : "Full funnel map from scraped ads for "}
        <span className="font-medium text-slate-700">{brand.name}</span>
        {journeyGoalActive ? (
          <>
            {" "}
            · Outcome:{" "}
            <span className="font-medium text-rose-700">{payload!.journeyGoal!.label}</span>
          </>
        ) : null}
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
        Full funnel map from scraped ads for{" "}
        <span className="font-medium text-slate-700">{brand.name}</span>
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
  const awaitingStrategy = showInitialSpinner || (emptyStrategy && isBackgroundRefresh);
  const showEmptyStrategy =
    !awaitingStrategy && !displayError && !!payload && emptyStrategy && !isBackgroundRefresh;
  const showMap =
    !displayError && !!payload && payload.map.activeAdCount > 0;
  const mapDimmed = isBackgroundRefresh && showMap;

  return (
    <div className={`relative ${COMPETITOR_PAGE_SHELL} py-8`}>
      <CacheRevalidatingDot show={isValidating && !!payload} className="right-4 top-4" />
      {!awaitingStrategy ? (
        <FeatureSectionHeader
          className="mb-4"
          overline="Strategy map"
          title={mapHeadline}
          description={strategyDescription}
        />
      ) : null}

      {awaitingStrategy ? <StrategyMapSkeleton /> : null}

      {showEmptyStrategy ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center text-[14px] text-slate-600">
          No active ads found for this competitor yet. Open the Ad Library tab or wait for the next spy run.
        </div>
      ) : null}

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
              <span className="font-semibold"> {(edgeTip.confidence * 100).toFixed(0)}% - </span>
              {edgeTip.reasoning}
            </div>
          ) : null}

          <div className={`flex flex-col items-start gap-6 xl:flex-row ${mapDimmed ? "opacity-60" : ""}`}>
            <div className="min-w-0 w-full flex-1 space-y-3">
              <StrategyMapFlow
                mapKey={mapKey}
                map={payload!.map}
                channelSignals={payload!.channelSignals}
                journeyGoal={payload!.journeyGoal}
                onNodeClick={(nodeId) => {
                  closeChannelSheets();
                  if (nodeId.includes(":")) {
                    setOpenCellId(nodeId as FunnelCellId);
                    setSheetPlatform(null);
                    return;
                  }
                  setSelectedPlatform(nodeId as never);
                  setSheetPlatform(nodeId);
                }}
                onChannelNodeClick={(kind, platform) => {
                  setOpenCellId(null);
                  setSheetPlatform(null);
                  setOpenGoalSheet(false);
                  if (kind === "organic" && platform) {
                    setOpenEmailChannel(false);
                    setOpenOrganicPlatform(platform as OrganicChannelPlatform);
                    return;
                  }
                  setOpenOrganicPlatform(null);
                  setOpenEmailChannel(true);
                }}
                onGoalNodeClick={() => {
                  setOpenCellId(null);
                  setSheetPlatform(null);
                  setOpenOrganicPlatform(null);
                  setOpenEmailChannel(false);
                  setOpenGoalSheet(true);
                }}
                onEdgeHover={setEdgeTip}
              />
            </div>
            <aside className="w-full shrink-0 xl:w-[min(520px,36vw)] xl:max-w-[520px] space-y-4">
              {journeyGoalActive && payload!.journeyGoal ? (
                <div className="mb-2.5">
                  <StrategyJourneySummary
                    goal={payload!.journeyGoal}
                    onOpenGoal={() => {
                      closeChannelSheets();
                      setOpenGoalSheet(true);
                    }}
                    onOpenLandingPages={onOpenLandingPages}
                  />
                </div>
              ) : null}
              {hasChannelSignals(payload!.channelSignals) ? (
                <div className="mb-2.5">
                  <StrategyChannelSummary
                    signals={payload!.channelSignals!}
                    onOpenOrganic={onOpenOrganicTab}
                    onOpenEmail={onOpenEmailTab}
                  />
                </div>
              ) : null}
              <StrategyOverviewSidebar
                map={payload!.map}
                competitorId={competitorId}
                cacheDomainNorm={domainNorm}
                lastScrapedAt={lastScrapedAt ?? null}
                onFreshnessRescrape={onFreshnessRescrape}
                activityScoreEnabled={fetchEnabled}
              />
              {isOwnWorkspace && onNavigateGaps ? (
                <OwnBrandStrategyGapsPanel
                  brandId={brandId}
                  fetchEnabled={fetchEnabled}
                  onNavigate={onNavigateGaps}
                />
              ) : null}
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

          <OrganicChannelSheet
            open={openOrganicPlatform != null}
            platform={openOrganicPlatform}
            competitorId={competitorId ?? ""}
            competitorName={brand.name}
            nodeSummary={organicNodeSummary}
            onClose={() => setOpenOrganicPlatform(null)}
            onOpenPost={handleOpenOrganicPost}
          />

          <EmailChannelSheet
            open={openEmailChannel}
            competitorId={competitorId ?? ""}
            nodeSummary={emailNodeSummary}
            onClose={() => setOpenEmailChannel(false)}
          />

          <JourneyGoalSheet
            open={openGoalSheet}
            goal={payload?.journeyGoal ?? null}
            channelSignals={payload?.channelSignals ?? null}
            onClose={() => setOpenGoalSheet(false)}
            onOpenLandingPages={onOpenLandingPages}
          />

          {competitorId ? (
            <OrganicPostDetailDrawer
              competitorId={competitorId}
              postId={activePostId}
              openSeed={null}
              socials={{}}
              onClose={closePost}
            />
          ) : null}

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
