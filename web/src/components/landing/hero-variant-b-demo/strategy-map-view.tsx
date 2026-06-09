"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { Check } from "lucide-react";

import { FeatureSectionHeader } from "@/components/dashboard/feature-section-header";

const StrategyMapFlow = dynamic(
  () =>
    import("@/components/strategy-overview/strategy-map-flow").then((m) => m.StrategyMapFlow),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[min(520px,58vh)] items-center justify-center rounded-2xl border border-slate-200/90 bg-slate-50/80">
        <p className="text-[12px] text-slate-500">Loading strategy map…</p>
      </div>
    ),
  },
);

const StrategyOverviewSidebar = dynamic(
  () =>
    import("@/components/strategy-overview/strategy-sidebar").then(
      (m) => m.StrategyOverviewSidebar,
    ),
  { ssr: false },
);
import {
  DEMO_ACTIVITY_SCORE,
  DEMO_COMPETITOR,
  DEMO_STRATEGY_MAP,
} from "@/lib/landing/hero-variant-b-demo-data";

function DemoActivityScoreCard() {
  const tierClass =
    DEMO_ACTIVITY_SCORE.tier === 4
      ? "bg-indigo-100 text-indigo-900 border-indigo-300"
      : "bg-slate-100 text-slate-800 border-slate-200";

  return (
    <div className="relative rounded-2xl border border-[#e5e7eb]/90 bg-white/95 p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#71717a]">Activity score</p>
      <div className="mt-3 flex flex-wrap items-end gap-2 sm:gap-3">
        <p className="text-[42px] font-extrabold leading-none tabular-nums text-[color:var(--rival-primary)]">
          {DEMO_ACTIVITY_SCORE.score}
        </p>
        <span
          className={`mb-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${tierClass}`}
        >
          {DEMO_ACTIVITY_SCORE.tierLabel}
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#f4f4f5]">
        <div
          className="h-full rounded-full bg-[color:var(--rival-primary)] transition-all duration-500"
          style={{ width: `${DEMO_ACTIVITY_SCORE.score}%` }}
        />
      </div>
      <p className="mt-2 text-[12px] font-semibold text-[#3f3f46]">{DEMO_ACTIVITY_SCORE.spend}</p>
      <p className="mt-0.5 text-[11px] text-[#71717a]">
        {DEMO_ACTIVITY_SCORE.confidence} · {DEMO_ACTIVITY_SCORE.topPercent}
      </p>
      <div className="mt-3 rounded-xl border border-[color:var(--rival-accent-blue)]/35 bg-[color:var(--rival-accent-blue)]/25 px-3 py-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[#52525b]">Why this score</p>
        <ul className="mt-2 space-y-1.5">
          {DEMO_ACTIVITY_SCORE.reasons.map((reason) => (
            <li key={reason} className="flex items-start gap-2 text-[11px] leading-snug text-[#3f3f46]">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--rival-primary)]" aria-hidden />
              {reason}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Strategy Map tab — reuses production map flow + sidebar with static demo data. */
export function DemoStrategyMapView() {
  const [edgeTip, setEdgeTip] = useState<{ reasoning: string; confidence: number } | null>(null);

  const mapKey = useMemo(() => {
    const cells = DEMO_STRATEGY_MAP.funnelCells ?? [];
    return `demo-${cells.map((c) => `${c.id}:${c.adCount}`).join("|")}`;
  }, []);

  return (
    <div className="min-w-0">
      <FeatureSectionHeader
        className="mb-4"
        overline="Strategy map"
        title={DEMO_STRATEGY_MAP.title}
        description={
          <>
            Full funnel map and enrichment from scraped ads for{" "}
            <span className="font-medium text-slate-700">{DEMO_COMPETITOR.name}</span>
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
          <span className="font-semibold"> {(edgeTip.confidence * 100).toFixed(0)}% — </span>
          {edgeTip.reasoning}
        </div>
      ) : null}

      <div className="flex flex-col items-start gap-6 xl:flex-row">
        <div className="min-w-0 w-full flex-1">
          <StrategyMapFlow
            mapKey={mapKey}
            map={DEMO_STRATEGY_MAP}
            onEdgeHover={setEdgeTip}
            mapHeightClass="h-[min(520px,58vh)]"
          />
        </div>
        <aside className="w-full shrink-0 xl:w-[min(520px,36vw)] xl:max-w-[520px]">
          <StrategyOverviewSidebar
            map={DEMO_STRATEGY_MAP}
            cacheDomainNorm={DEMO_COMPETITOR.domain}
            activityScoreFallback={<DemoActivityScoreCard />}
          />
        </aside>
      </div>
    </div>
  );
}
