"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeftRight, Download } from "lucide-react";

import { buildComparisonDigest } from "@/lib/brand-comparison/build-comparison-digest";
import type { BrandComparisonLlmResult } from "@/lib/brand-comparison/run-brand-comparison-llm";
import { useScrapeKeyedCache } from "@/lib/cache/use-scrape-keyed-cache";
import type { ComparisonDerivedStats } from "@/lib/comparison/scraped-ads-derived-stats";
import type { ComparisonPayloadJson } from "@/lib/comparison/comparison-payload-types";
import { AdWallPanel } from "@/components/comparison/panels/ad-wall-panel";
import { AngleMigrationPanel } from "@/components/comparison/panels/angle-migration-panel";
import { EstimatedBudgetSplitPanel } from "@/components/comparison/panels/estimated-budget-split-panel";
import { SideBySideStatsPanel } from "@/components/comparison/panels/side-by-side-stats-panel";
import { StealableAnglesPanel } from "@/components/comparison/panels/stealable-angles-panel";
import { TestingVelocityMatrixPanel } from "@/components/comparison/panels/testing-velocity-matrix-panel";
import { ThreeMovesPanel } from "@/components/comparison/panels/three-moves-panel";
import { COMPETITOR_PAGE_SHELL, COMPETITOR_PAGE_X } from "@/components/dashboard/competitor/competitor-page-layout";
import { FeatureSectionHeader } from "@/components/dashboard/feature-section-header";
import { ComparisonSkeleton } from "@/components/ui/feature-skeleton";

export type { ComparisonPayloadJson } from "@/lib/comparison/comparison-payload-types";

const EMPTY_DERIVED: ComparisonDerivedStats = {
  avgAdAgeDays: 0,
  newAdsLast30d: 0,
  videoPercent: 0,
  uniqueAnglesCount: 0,
};

export type ComparisonPageProps = {
  isConfirmed: boolean;
  competitorDisplayLabel: string;
  competitor: { name: string; domain: string; logoUrl: string | null };
  workspace: {
    name: string;
    domain: string | null;
    logoUrl: string | null;
    brandContext?: string | null;
    color?: string;
    badge?: string;
  };
  comparisonPayload: ComparisonPayloadJson | null;
  comparisonPayloadLoading: boolean;
  comparisonPayloadError: string | null;
  onRefreshComparisonPayload: () => void;
  cacheDomainNorm: string;
  onOpenAd: (adId: string) => void;
};

type BrandComparisonApi = {
  ok?: boolean;
  error?: string;
  model?: string;
  comparison?: BrandComparisonLlmResult;
  fromCache?: boolean;
  computed_at?: string;
};

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return isMobile;
}

function relativeScrapeLabel(iso: string | null): string {
  if (!iso?.trim()) return "—";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "—";
  const diff = Date.now() - t;
  const days = Math.floor(diff / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.round(days / 7);
  if (weeks === 1) return "1 week ago";
  return `${weeks} weeks ago`;
}

export function ComparisonPage({
  isConfirmed,
  competitorDisplayLabel,
  competitor,
  workspace,
  comparisonPayload,
  comparisonPayloadLoading,
  comparisonPayloadError,
  onRefreshComparisonPayload,
  cacheDomainNorm,
  onOpenAd,
}: ComparisonPageProps) {
  const [swapSides, setSwapSides] = useState(false);
  const isMobile = useIsMobile();

  const analyticsFired = useRef(false);

  const workspaceSide = comparisonPayload?.workspace ?? null;
  const competitorSide = comparisonPayload?.competitor ?? null;

  const wsId = workspaceSide?.meta.competitorId ?? "";
  const rivalId = competitorSide?.meta.competitorId ?? "";
  const wsScrape = workspaceSide?.meta.lastScrapedAt ?? "none";
  const rivalScrape = competitorSide?.meta.lastScrapedAt ?? "none";
  const brandComparisonCacheKey = `${competitor.domain.trim().toLowerCase()}:brand-comparison:${wsId}:${rivalId}:${wsScrape}:${rivalScrape}`;

  const wsPayload = workspaceSide?.payload ?? null;
  const compPayload = competitorSide?.payload ?? null;

  const wsDerived = workspaceSide?.derivedStats ?? EMPTY_DERIVED;
  const compDerived = competitorSide?.derivedStats ?? EMPTY_DERIVED;

  const freshLabel = useMemo(() => {
    const a = wsScrape !== "none" ? Date.parse(wsScrape) : 0;
    const b = rivalScrape !== "none" ? Date.parse(rivalScrape) : 0;
    const newest = Math.max(a, b);
    if (!Number.isFinite(newest) || newest <= 0) return relativeScrapeLabel(competitorSide?.meta.lastScrapedAt ?? null);
    return relativeScrapeLabel(new Date(newest).toISOString());
  }, [wsScrape, rivalScrape, competitorSide?.meta.lastScrapedAt]);

  const {
    data: brandLlmPayload,
    loading: llmLoading,
    error: brandLlmErr,
    invalidate: invalidateBrandComparisonCache,
  } = useScrapeKeyedCache<BrandComparisonApi>({
    cacheKey: brandComparisonCacheKey,
    enabled: isConfirmed && Boolean(wsId && rivalId && wsPayload && compPayload),
    persistAcrossTabs: true,
    validateCached: (c) =>
      Boolean(
        c.ok === true &&
          c.comparison?.moves?.length &&
          c.comparison?.headlineTitles?.userArchetype &&
          c.comparison?.headlineTitles?.competitorArchetype
      ),
    fetcher: async () => {
      const structuredDigest = buildComparisonDigest(wsPayload!, compPayload!, {
        workspaceDerived: workspaceSide?.derivedStats ?? null,
        competitorDerived: competitorSide?.derivedStats ?? null,
      });
      const res = await fetch("/api/brand-comparison", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          yourBrandId: wsId,
          competitorId: rivalId,
          competitor: { name: competitor.name, domain: competitor.domain },
          userBrand: {
            name: workspace.name,
            domain: workspace.domain,
            brandContext: workspace.brandContext,
          },
          structuredDigest,
          adEvidence: "",
        }),
      });
      const json = (await res.json()) as BrandComparisonApi;
      if (!res.ok || !json.ok || !json.comparison) {
        throw new Error(json.error ?? `Brand comparison failed (${res.status})`);
      }
      return json;
    },
  });

  const llm = brandLlmPayload?.ok && brandLlmPayload.comparison ? brandLlmPayload.comparison : null;
  const llmError = brandLlmErr?.message ?? null;

  const payloadLoading = comparisonPayloadLoading;
  const payloadError = comparisonPayloadError;

  useEffect(() => {
    if (analyticsFired.current) return;
    if (!wsPayload || !compPayload) return;
    analyticsFired.current = true;
    window.dispatchEvent(
      new CustomEvent("rival_comparison_viewed", {
        detail: { competitorDomain: competitor.domain },
      })
    );
    window.dispatchEvent(
      new CustomEvent("comparison_viewed", {
        detail: { competitorDomain: competitor.domain },
      })
    );
  }, [wsPayload, compPayload, competitor.domain]);

  const left = swapSides
    ? { name: competitorDisplayLabel, payload: compPayload }
    : { name: workspace.name, payload: wsPayload };
  const right = swapSides
    ? { name: workspace.name, payload: wsPayload }
    : { name: competitorDisplayLabel, payload: compPayload };

  const sideBySideOk = Boolean(wsId && !workspaceSide?.needsScrape);

  if (!isConfirmed) {
    return (
      <div className={`${COMPETITOR_PAGE_X} pt-8`}>
        <div className="rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-[14px] text-amber-950">
          Confirm this competitor (finish discovery / sidebar sync) to load comparison data.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] pb-16">
      <div className={`${COMPETITOR_PAGE_SHELL} pb-6 pt-8`}>
        <FeatureSectionHeader
          overline="Comparison"
          title={
            <>
              <span className="text-slate-900">{workspace.name}</span>{" "}
              <span className="text-sm font-normal text-slate-400">vs</span>{" "}
              <span className="text-slate-900">{competitorDisplayLabel}</span>
            </>
          }
          description={
            <>
              Updated {freshLabel} · 6 sections · Auto-refreshed with scrapes
            </>
          }
          actions={
            <>
              <button
                type="button"
                onClick={() => setSwapSides((s) => !s)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
              >
                <ArrowLeftRight className="h-3.5 w-3.5" />
                Swap
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
              >
                <Download className="h-3.5 w-3.5" />
                Export PDF
              </button>
            </>
          }
        />
      </div>

      <div className={`${COMPETITOR_PAGE_SHELL} pb-12 pt-2`}>
        {isMobile ? (
          <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            Comparison view is optimized for larger screens. Below is a mobile-friendly snapshot — open on desktop for the full
            canvas.
          </div>
        ) : null}

        {workspaceSide?.needsScrape ? (
          <div className="mb-8 rounded-xl border border-sky-100 bg-sky-50/90 px-4 py-3 text-[13px] text-sky-950">
            Your workspace brand has no active scraped ads yet. Add your brand to the scrape queue in workspace settings, then return
            here.
          </div>
        ) : null}

        {payloadLoading && !wsPayload && !compPayload ? (
          <ComparisonSkeleton />
        ) : payloadError ? (
          <div className="rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 text-[14px] text-red-900">
            {payloadError}
            <button
              type="button"
              className="mt-2 block text-[13px] font-medium underline"
              onClick={() => onRefreshComparisonPayload()}
            >
              Retry
            </button>
          </div>
        ) : isMobile ? (
          <ThreeMovesPanel
            headlineTitles={llm?.headlineTitles ?? null}
            moves={llm?.moves ?? null}
            isLoading={llmLoading}
            errorMessage={llmError}
            workspaceName={workspace.name}
            competitorName={competitorDisplayLabel}
          />
        ) : (
          <>
            <SideBySideStatsPanel
              workspaceName={workspace.name}
              competitorName={competitorDisplayLabel}
              workspacePayload={wsPayload}
              competitorPayload={compPayload}
              workspaceDerived={wsDerived}
              competitorDerived={compDerived}
              workspaceDataIncomplete={workspaceSide?.needsScrape === true}
            />

            <div id="comparison-budget-split" className="relative mb-12 scroll-mt-36 pt-8">
              <div
                className="pointer-events-none absolute inset-x-8 -top-6 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"
                aria-hidden
              />
              <EstimatedBudgetSplitPanel left={left} right={right} />
            </div>

            <StealableAnglesPanel
              workspacePayload={wsPayload}
              competitorPayload={compPayload}
              competitorId={rivalId}
              competitorBrandName={competitorDisplayLabel}
              competitorDomain={competitor.domain}
              workspaceBrandName={workspace.name}
              cacheDomainNorm={cacheDomainNorm}
              competitorScrapeStamp={rivalScrape}
              onOpenAd={onOpenAd}
            />

            <ThreeMovesPanel
              headlineTitles={llm?.headlineTitles ?? null}
              moves={llm?.moves ?? null}
              isLoading={llmLoading}
              errorMessage={llmError}
              workspaceName={workspace.name}
              competitorName={competitorDisplayLabel}
            />

            <AdWallPanel
              themCompetitorId={rivalId}
              youCompetitorId={wsId}
              themBrandName={competitorDisplayLabel}
              youBrandName={workspace.name}
              cacheDomainNorm={cacheDomainNorm}
              wsScrape={wsScrape}
              rivalScrape={rivalScrape}
              sideBySideAvailable={sideBySideOk}
              onOpenAd={onOpenAd}
            />

            <div id="comparison-velocity" className="relative mb-12 scroll-mt-36 pt-8">
              <div
                className="pointer-events-none absolute inset-x-8 -top-6 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"
                aria-hidden
              />
              <TestingVelocityMatrixPanel left={left} right={right} />
            </div>

            <AngleMigrationPanel
              workspace={{ name: workspace.name, payload: wsPayload }}
              competitor={{ name: competitorDisplayLabel, payload: compPayload }}
              competitorId={rivalId}
              onOpenAd={onOpenAd}
            />
          </>
        )}
      </div>
    </div>
  );
}
