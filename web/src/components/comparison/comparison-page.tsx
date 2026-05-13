"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeftRight, Loader2, RefreshCw, Sparkles } from "lucide-react";

import { CompetitorLogo } from "@/components/shared/competitor-logo";
import { buildComparisonDigest } from "@/lib/brand-comparison/build-comparison-digest";
import type { BrandComparisonLlmResult } from "@/lib/brand-comparison/run-brand-comparison-llm";
import type { CompetitorStrategyOverviewPayload } from "@/lib/strategy-overview/payload-types";
import { CompetitiveScoreSidebar } from "@/components/comparison/competitive-score-sidebar";
import type { ComparisonMoveRow } from "@/lib/comparison/comparison-move-types";
import { AngleMigrationPanel } from "@/components/comparison/panels/angle-migration-panel";
import { CrossPlatformFunnelFlowPanel } from "@/components/comparison/panels/cross-platform-funnel-flow-panel";
import { EstimatedBudgetSplitPanel } from "@/components/comparison/panels/estimated-budget-split-panel";
import { PlatformPresencePanel } from "@/components/comparison/panels/platform-presence-panel";
import { PlatformVoiceMapPanel } from "@/components/comparison/panels/platform-voice-map-panel";
import { TestingVelocityMatrixPanel } from "@/components/comparison/panels/testing-velocity-matrix-panel";

export type { ComparisonPayloadJson } from "@/lib/comparison/comparison-payload-types";

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
};

type PayloadApi = {
  ok: boolean;
  error?: string;
  workspace?: {
    meta: {
      competitorId: string;
      name: string;
      domain: string;
      logoUrl: string | null;
      lastScrapedAt: string | null;
    };
    payload: CompetitorStrategyOverviewPayload | null;
    recomputing: boolean;
    needsScrape?: boolean;
    recent_moves: ComparisonMoveRow[];
    snapshot_count: number;
  };
  competitor?: {
    meta: {
      competitorId: string;
      name: string;
      domain: string;
      logoUrl: string | null;
      lastScrapedAt: string | null;
    };
    payload: CompetitorStrategyOverviewPayload | null;
    recomputing: boolean;
    recent_moves: ComparisonMoveRow[];
    snapshot_count: number;
  };
};

export function ComparisonPage({
  isConfirmed,
  competitorDisplayLabel,
  competitor,
  workspace,
}: ComparisonPageProps) {
  const [swapSides, setSwapSides] = useState(false);
  const [payloadLoading, setPayloadLoading] = useState(false);
  const [payloadError, setPayloadError] = useState<string | null>(null);
  const [workspaceSide, setWorkspaceSide] = useState<PayloadApi["workspace"] | null>(null);
  const [competitorSide, setCompetitorSide] = useState<PayloadApi["competitor"] | null>(null);

  const [llm, setLlm] = useState<BrandComparisonLlmResult | null>(null);
  const [llmLoading, setLlmLoading] = useState(false);
  const [llmError, setLlmError] = useState<string | null>(null);

  const analyticsFired = useRef(false);

  const loadPayloads = useCallback(async () => {
    setPayloadLoading(true);
    setPayloadError(null);
    try {
      const res = await fetch(
        `/api/comparison/payload?competitorDomain=${encodeURIComponent(competitor.domain)}`,
        { credentials: "include" }
      );
      const json = (await res.json()) as PayloadApi;
      if (!res.ok || !json.ok) {
        setPayloadError(json.error ?? "Failed to load comparison data");
        setWorkspaceSide(null);
        setCompetitorSide(null);
        return;
      }
      setWorkspaceSide(json.workspace ?? null);
      setCompetitorSide(json.competitor ?? null);
    } catch {
      setPayloadError("Network error");
      setWorkspaceSide(null);
      setCompetitorSide(null);
    } finally {
      setPayloadLoading(false);
    }
  }, [competitor.domain]);

  useEffect(() => {
    if (!isConfirmed) return;
    void loadPayloads();
  }, [isConfirmed, loadPayloads]);

  const wsPayload = workspaceSide?.payload ?? null;
  const compPayload = competitorSide?.payload ?? null;

  useEffect(() => {
    if (!isConfirmed) return;
    if (!compPayload && !wsPayload) return;

    let cancelled = false;
    setLlmLoading(true);
    setLlmError(null);

    void (async () => {
      try {
        const structuredDigest = buildComparisonDigest(wsPayload, compPayload);
        const res = await fetch("/api/brand-comparison", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
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
        const json = (await res.json()) as {
          ok?: boolean;
          error?: string;
          comparison?: BrandComparisonLlmResult;
        };
        if (cancelled) return;
        if (!res.ok || !json.ok || !json.comparison) {
          setLlm(null);
          setLlmError(json.error ?? "AI analysis failed");
          return;
        }
        setLlm(json.comparison);
      } catch {
        if (!cancelled) {
          setLlm(null);
          setLlmError("Network error");
        }
      } finally {
        if (!cancelled) setLlmLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    isConfirmed,
    wsPayload,
    compPayload,
    competitor.domain,
    competitor.name,
    workspace.brandContext,
    workspace.domain,
    workspace.name,
  ]);
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

  const leftIsWorkspace = !swapSides;

  const recomputingNote =
    workspaceSide?.recomputing || competitorSide?.recomputing ? (
      <div className="rounded-lg border border-amber-100 bg-amber-50/90 px-3 py-2 text-[11px] text-amber-950">
        Strategy data is refreshing in the background. Numbers may update after a minute — use Refresh to reload.
      </div>
    ) : null;

  if (!isConfirmed) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-[14px] text-amber-950">
        Confirm this competitor (finish discovery / sidebar sync) to load comparison data.
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] rounded-3xl bg-gradient-to-br from-[#FDF8F0] via-white/40 to-[#E8F0F7] px-4 py-6 sm:px-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-[22px] font-bold text-[#343434] tracking-[-0.02em]">Comparison to Your Brand</h2>
            <p className="text-[14px] text-[#71717a] mt-0.5">
              How <span className="font-medium text-[#3f3f46]">{competitorDisplayLabel}</span> stacks up against{" "}
              <span className="font-medium text-[#3f3f46]">{workspace.name}</span>
            </p>
            <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-slate-500">
              Mult-panel view · Claude Sonnet narratives
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
                setLlm(null);
                void loadPayloads();
              }}
              className="inline-flex items-center gap-2 rounded-full border border-[#e4e4e7] bg-white px-3 py-1.5 text-[12px] font-medium text-[#3f3f46] shadow-sm hover:bg-[#fafafa] disabled:opacity-50"
            >
              {payloadLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Refresh
            </button>
          </div>
        </div>

        {workspaceSide?.needsScrape ? (
          <div className="rounded-xl border border-sky-100 bg-sky-50/90 px-4 py-3 text-[13px] text-sky-950">
            Your workspace brand has no active scraped ads yet. Add your brand to the scrape queue in workspace settings,
            then return here.
          </div>
        ) : null}

        {recomputingNote}

        {payloadLoading && !wsPayload && !compPayload ? (
          <div className="flex items-center justify-center gap-2 py-16 text-[14px] text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin shrink-0" />
            Loading strategy snapshots…
          </div>
        ) : payloadError ? (
          <div className="rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 text-[14px] text-red-900">
            {payloadError}
            <button type="button" className="mt-2 block text-[13px] font-medium underline" onClick={() => void loadPayloads()}>
              Retry
            </button>
          </div>
        ) : (
          <>
            {/* Row 1: three panels */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 items-start">
              <PlatformPresencePanel left={left} right={right} leftIsWorkspace={leftIsWorkspace} />
              <EstimatedBudgetSplitPanel left={left} right={right} />
              <CrossPlatformFunnelFlowPanel left={left} right={right} />
            </div>

            {/* Row 2: voice + velocity */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 items-start">
              <PlatformVoiceMapPanel left={left} right={right} />
              <TestingVelocityMatrixPanel left={left} right={right} />
            </div>

            <AngleMigrationPanel left={left} right={right} leftIsWorkspace={leftIsWorkspace} />

            {/* AI gap analysis */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-md bg-[#343434] flex items-center justify-center shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
                <h3 className="text-[14px] font-semibold text-slate-900">AI gap analysis</h3>
                {llmLoading ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : null}
              </div>
              {llmError ? (
                <p className="text-[13px] text-red-700">{llmError}</p>
              ) : !llm ? (
                <p className="text-[13px] text-slate-500">Generating narrative…</p>
              ) : (
                <div className="space-y-4 text-[14px] text-slate-700 leading-relaxed">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                    <div className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-slate-200">
                        <CompetitorLogo
                          sources={{
                            primary: competitor.logoUrl,
                            domain: competitor.domain,
                          }}
                          name={competitorDisplayLabel}
                          size="md"
                          shape="rounded"
                          className="rounded-xl border-slate-200"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase text-slate-500">{competitorDisplayLabel}</p>
                        <p className="font-semibold text-slate-900">{llm.competitorArchetype.headline}</p>
                        <p className="text-[13px] text-slate-600 mt-1">{llm.competitorArchetype.subtitle}</p>
                      </div>
                    </div>
                    <div className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-slate-200">
                        <CompetitorLogo
                          sources={{
                            primary: workspace.logoUrl,
                            domain: workspace.domain,
                          }}
                          name={workspace.name}
                          size="md"
                          shape="rounded"
                          className="rounded-xl border-slate-200"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase text-slate-500">{workspace.name}</p>
                        <p className="font-semibold text-slate-900">{llm.userArchetype.headline}</p>
                        <p className="text-[13px] text-slate-600 mt-1">{llm.userArchetype.subtitle}</p>
                      </div>
                    </div>
                  </div>

                  {llm.audienceComparisonNarrative ? (
                    <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-4">
                      <h4 className="text-[13px] font-semibold text-violet-950 mb-1">Audience comparison</h4>
                      <p className="text-[13px] text-violet-900 leading-relaxed">{llm.audienceComparisonNarrative}</p>
                    </div>
                  ) : null}

                  <div className="rounded-xl border border-slate-100 p-4 bg-white">
                    <h4 className="text-[13px] font-semibold text-slate-900 mb-1">{llm.theirAdvantage.title}</h4>
                    <p className="text-[13px] text-slate-600 whitespace-pre-wrap">{llm.theirAdvantage.body}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 p-4 bg-white">
                    <h4 className="text-[13px] font-semibold text-slate-900 mb-1">{llm.yourAdvantage.title}</h4>
                    <p className="text-[13px] text-slate-600 whitespace-pre-wrap">{llm.yourAdvantage.body}</p>
                  </div>
                  <div className="rounded-xl border border-[#DDF1FD] bg-[#DDF1FD]/35 p-4">
                    <h4 className="text-[13px] font-semibold text-slate-900 mb-1">{llm.recommendation.title}</h4>
                    <p className="text-[13px] text-slate-800 whitespace-pre-wrap">{llm.recommendation.body}</p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {!payloadLoading && !payloadError ? (
        <div className="shrink-0 lg:w-[300px]">
          <CompetitiveScoreSidebar workspacePayload={wsPayload} competitorPayload={compPayload} llm={llm} />
        </div>
      ) : null}
    </div>
    </div>
  );
}
