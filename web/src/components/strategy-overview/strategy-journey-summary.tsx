"use client";

import { Target } from "lucide-react";

import type { StrategyJourneyGoal } from "@/lib/strategy-overview/payload-types";

const CARD =
  "relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-[0_1px_3px_rgba(15,23,42,0.05)] min-w-0";

type Props = {
  goal: StrategyJourneyGoal;
  onOpenGoal?: () => void;
  onOpenLandingPages?: () => void;
};

export function StrategyJourneySummary({ goal, onOpenGoal, onOpenLandingPages }: Props) {
  const pathLine =
    goal.pathIntentBreakdown.length > 0
      ? goal.pathIntentBreakdown.map((p) => `${p.pathCount}× ${p.label}`).join(" · ")
      : null;

  return (
    <div className={CARD}>
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-rose-400/15 blur-2xl" aria-hidden />
      <div className="relative">
        <div className="mb-2.5 flex items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose-600 text-white shadow-sm">
            <Target className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-rose-600">Business outcome</p>
            <p className="text-[11px] font-semibold leading-tight text-[#0f172a]">Macro goal</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenGoal}
          className="w-full rounded-xl border border-rose-100 bg-gradient-to-br from-rose-50/90 to-white px-3 py-2.5 text-left transition hover:border-rose-200 hover:bg-rose-50"
        >
          <p className="text-[13px] font-semibold text-rose-900">{goal.label}</p>
          <p className="mt-1 line-clamp-3 text-[11px] leading-relaxed text-slate-600">
            {goal.evidence?.narrative || goal.macroFraming}
          </p>
          {pathLine ? (
            <p className="mt-1.5 text-[10px] font-medium text-slate-500">Paths: {pathLine}</p>
          ) : (
            <p className="mt-1.5 text-[10px] text-slate-500">{goal.catalogLabel}</p>
          )}
        </button>

        {goal.topDestinations[0] ? (
          <button
            type="button"
            onClick={onOpenLandingPages ?? onOpenGoal}
            className="mt-2 w-full truncate text-left text-[10px] font-medium text-rose-700 hover:underline"
          >
            Top destination: {goal.topDestinations[0].displayUrl}
          </button>
        ) : null}
      </div>
    </div>
  );
}
