"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { Check, RefreshCw } from "lucide-react";

import { DataFreshnessBadge } from "@/components/competitor/data-freshness-badge";
import { FeatureSectionHeader } from "@/components/dashboard/feature-section-header";
import { StrategyChannelSummary } from "@/components/strategy-overview/strategy-channel-summary";
import { StrategyJourneySummary } from "@/components/strategy-overview/strategy-journey-summary";
import { StrategyMapFlow } from "@/components/strategy-overview/strategy-map-flow";
import { StrategyOverviewSidebar } from "@/components/strategy-overview/strategy-sidebar";
import {
  getDemoBrandPayload,
  type DemoActivityScoreSnapshot,
} from "@/lib/demo/demo-brand-payload";

const JourneyGoalSheet = dynamic(
  () =>
    import("@/components/strategy-overview/journey-goal-sheet").then((m) => m.JourneyGoalSheet),
  { ssr: false },
);

function DemoActivityScoreCard({ score }: { score: DemoActivityScoreSnapshot }) {
  const tierClass =
    score.tier === 4
      ? "bg-indigo-100 text-indigo-900 border-indigo-300"
      : "bg-slate-100 text-slate-800 border-slate-200";

  return (
    <div className="relative rounded-2xl border border-[#e5e7eb]/90 bg-white/95 p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#71717a]">Activity score</p>
          <p className="mt-0.5 text-[10px] text-indigo-600">Refreshing score in the background…</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <DataFreshnessBadge lastScrapedAt="2026-07-15T12:00:00.000Z" />
          <button
            type="button"
            title="Refresh score"
            aria-label="Refresh activity score"
            className="rounded-full border border-[#e4e4e7] bg-white p-1.5 text-[#52525b] hover:bg-[#fafafa]"
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>

      <div className="mb-2 flex flex-wrap items-end gap-2 sm:gap-3">
        <p className="text-[28px] font-bold tabular-nums leading-none text-[color:var(--rival-primary)]">
          {score.score}
          <span className="text-[14px] font-semibold text-[#71717a]">/100</span>
        </p>
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${tierClass}`}
        >
          Tier {score.tier}
        </span>
        <span className="flex items-center gap-0.5 rounded-full border border-emerald-200/90 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
          <Check className="h-3 w-3" aria-hidden />
          High confidence
        </span>
      </div>

      <div className="mb-2 h-2 overflow-hidden rounded-full bg-[#f4f4f5]">
        <div
          className="h-full rounded-full bg-[color:var(--rival-primary)] transition-all duration-500"
          style={{ width: `${score.score}%` }}
        />
      </div>

      <p className="text-[14px] font-semibold text-[#3f3f46]">
        {score.tierLabel} — {score.spend}
      </p>
      <p className="mt-2 text-[11px] leading-snug text-[#71717a]">
        Based on operational footprint visible in scraped ads. Actual spend is not publicly disclosed by ad libraries.
      </p>

      <div className="mt-4 rounded-xl border border-[color:var(--rival-accent-blue)]/35 bg-[color:var(--rival-accent-blue)]/25 px-3 py-2.5">
        <p className="text-[10px] font-bold uppercase tracking-wide text-[#52525b]">Why this score</p>
        <ul className="mt-2 space-y-1.5">
          {score.reasons.map((reason) => (
            <li key={reason} className="flex items-start gap-1.5 text-[12px] leading-snug text-[#3f3f46]">
              <span className="shrink-0 text-[color:var(--rival-primary)]" aria-hidden>
                ✓
              </span>
              {reason}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Strategy Map tab - reuses production map flow + sidebar with static demo data. */
export function DemoStrategyMapView({ domain }: { domain?: string }) {
  const payload = useMemo(() => getDemoBrandPayload(domain), [domain]);
  const [edgeTip, setEdgeTip] = useState<{ reasoning: string; confidence: number } | null>(null);
  const [openGoalSheet, setOpenGoalSheet] = useState(false);

  const mapKey = useMemo(() => {
    const cells = payload.strategyMap.funnelCells ?? [];
    return `demo-${payload.key}-${cells.map((c) => `${c.id}:${c.adCount}`).join("|")}`;
  }, [payload.key, payload.strategyMap.funnelCells]);

  return (
    <div className="min-w-0">
      <FeatureSectionHeader
        className="mb-4"
        overline="Strategy map"
        title={payload.strategyMap.title}
        description={
          <>
            Full funnel map and enrichment from scraped ads for{" "}
            <span className="font-medium text-slate-700">{payload.name}</span>
            {" · "}
            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-600">
              Cached
            </span>
            {" · Confidence: high"}
          </>
        }
      />

      {edgeTip ? (
        <div className="pointer-events-none fixed bottom-24 left-1/2 z-40 max-w-md -translate-x-1/2 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-[11px] text-slate-700 shadow-lg">
          <span className="font-semibold"> {(edgeTip.confidence * 100).toFixed(0)}% - </span>
          {edgeTip.reasoning}
        </div>
      ) : null}

      <div className="flex flex-col items-start gap-6 xl:flex-row">
        <div className="min-w-0 w-full flex-1 space-y-3">
          <StrategyMapFlow
            key={payload.domain}
            mapKey={mapKey}
            map={payload.strategyMap}
            channelSignals={payload.strategyChannelSignals}
            journeyGoal={payload.strategyJourneyGoal}
            onGoalNodeClick={() => setOpenGoalSheet(true)}
            onEdgeHover={setEdgeTip}
          />
        </div>
        <aside className="w-full shrink-0 space-y-2.5 xl:w-[min(520px,36vw)] xl:max-w-[520px]">
          <StrategyJourneySummary
            goal={payload.strategyJourneyGoal}
            onOpenGoal={() => setOpenGoalSheet(true)}
          />
          <StrategyChannelSummary signals={payload.strategyChannelSignals} />
          <StrategyOverviewSidebar
            map={payload.strategyMap}
            cacheDomainNorm={payload.domain}
            activityScoreFallback={<DemoActivityScoreCard score={payload.activityScore} />}
            showInsightCards={false}
          />
        </aside>
      </div>

      <JourneyGoalSheet
        open={openGoalSheet}
        goal={payload.strategyJourneyGoal}
        channelSignals={payload.strategyChannelSignals}
        onClose={() => setOpenGoalSheet(false)}
      />
    </div>
  );
}
