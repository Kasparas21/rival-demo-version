"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeftRight, RefreshCw } from "lucide-react";

import { RivalLoadingBlock, RivalLogoVideo } from "@/components/ui/rival-loading";

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

  const {
    data: brandLlmPayload,
    loading: llmLoading,
    error: brandLlmErr,
    invalidate: invalidateBrandComparisonCache,
  } = useScrapeKeyedCache<BrandComparisonApi>({
    cacheKey: brandComparisonCacheKey,
    enabled: isConfirmed && Boolean(wsId && rivalId && wsPayload && compPayload),
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

  const recomputingNote =
    workspaceSide?.recomputing || competitorSide?.recomputing ? (
      <div className="rounded-lg border border-amber-100 bg-amber-50/90 px-3 py-2 text-[11px] text-amber-950">
        Strategy data is refreshing in the background. Numbers may update after a minute — use Refresh to reload.
      </div>
    ) : null;

  const sideBySideOk = Boolean(wsId && !workspaceSide?.needsScrape);

  if (!isConfirmed) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-[14px] text-amber-950">
        Confirm this competitor (finish discovery / sidebar sync) to load comparison data.
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] rounded-3xl bg-gradient-to-br from-[#FDF8F0] via-white/40 to-[#E8F0F7] px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-[1100px] space-y-0">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-[22px] font-bold tracking-[-0.02em] text-[#343434]">Comparison to Your Brand</h2>
            <p className="mt-0.5 text-[14px] text-[#71717a]">
              How <span className="font-medium text-[#3f3f46]">{competitorDisplayLabel}</span> stacks up against{" "}
              <span className="font-medium text-[#3f3f46]">{workspace.name}</span>
            </p>
            <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-slate-500">
              Head-to-head · stealable angles · tactical moves
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSwapSides((s) => !s)}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <ArrowLeftRight className="h-3.5 w-3.5" />
              Swap sides
            </button>
            <button
              type="button"
              disabled={payloadLoading}
              onClick={() => {
                invalidateBrandComparisonCache();
                onRefreshComparisonPayload();
              }}
              className="inline-flex items-center gap-2 rounded-full border border-[#e4e4e7] bg-white px-3 py-1.5 text-[12px] font-medium text-[#3f3f46] shadow-sm hover:bg-[#fafafa] disabled:opacity-50"
            >
              {payloadLoading ? (
                <span className="inline-flex rounded-md border border-neutral-200/80 bg-white p-[3px]">
                  <RivalLogoVideo size="inline" />
                </span>
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Refresh
            </button>
          </div>
        </div>

        {workspaceSide?.needsScrape ? (
          <div className="mb-6 rounded-xl border border-sky-100 bg-sky-50/90 px-4 py-3 text-[13px] text-sky-950">
            Your workspace brand has no active scraped ads yet. Add your brand to the scrape queue in workspace settings, then return
            here.
          </div>
        ) : null}

        {recomputingNote ? <div className="mb-6">{recomputingNote}</div> : null}

        {payloadLoading && !wsPayload && !compPayload ? (
          <RivalLoadingBlock
            title="Loading strategy snapshots…"
            description="Pulling the latest scraped ads summary for workspace and competitor."
            padded
            className="py-14 sm:py-16"
          />
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

            <div id="comparison-budget-split" className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
              <EstimatedBudgetSplitPanel left={left} right={right} />
            </div>

            <StealableAnglesPanel
              workspacePayload={wsPayload}
              competitorPayload={compPayload}
              competitorId={rivalId}
              competitorBrandName={competitorDisplayLabel}
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
              onInvalidate={() => invalidateBrandComparisonCache()}
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

            <div className="mb-6">
              <TestingVelocityMatrixPanel left={left} right={right} />
            </div>

            <AngleMigrationPanel
              workspace={{ name: workspace.name, payload: wsPayload }}
              competitor={{ name: competitorDisplayLabel, payload: compPayload }}
            />
          </>
        )}
      </div>
    </div>
  );
}
