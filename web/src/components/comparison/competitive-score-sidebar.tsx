"use client";

import type { BrandComparisonLlmResult } from "@/lib/brand-comparison/run-brand-comparison-llm";
import {
  computeCompetitiveSubscores,
  SUBSCORE_LABELS,
  type SubscoreKey,
} from "@/lib/comparison/competitive-score";
import type { CompetitorStrategyOverviewPayload } from "@/lib/strategy-overview/payload-types";

type Props = {
  workspacePayload: CompetitorStrategyOverviewPayload | null;
  competitorPayload: CompetitorStrategyOverviewPayload | null;
  llm: BrandComparisonLlmResult | null;
};

function SubBar({ label, value, context }: { label: string; value: number; context?: string }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div className="mb-3">
      <div className="flex justify-between text-[10px] text-slate-600 mb-1">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums">{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-sky-500 to-sky-600 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      {context ? <p className="mt-1 text-[9px] text-slate-500 leading-snug">{context}</p> : null}
    </div>
  );
}

function deltaContext(k: SubscoreKey, d: { user: number; competitor: number }): string {
  switch (k) {
    case "platformCoverage":
      return `You: ${d.user}/6 platforms · Them: ${d.competitor}/6`;
    case "funnelCoverage":
      return `You: ${d.user}/3 funnel stages with ads · Them: ${d.competitor}/3`;
    case "testingVelocity":
      return `You: ${d.user} new creatives (30d) · Them: ${d.competitor}`;
    case "angleDiversity":
      return `You: ${d.user} distinct angles · Them: ${d.competitor}`;
    default:
      return "";
  }
}

export function CompetitiveScoreSidebar({ workspacePayload, competitorPayload, llm }: Props) {
  const { scores, overall, worst, best, deltas } = computeCompetitiveSubscores(
    workspacePayload,
    competitorPayload
  );

  const order: SubscoreKey[] = ["platformCoverage", "funnelCoverage", "testingVelocity", "angleDiversity"];

  return (
    <aside className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)] lg:sticky lg:top-4 h-fit">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Competitive score</p>
      <p className="text-[10px] text-slate-500 mb-4 leading-snug">From your workspace brand vs this competitor</p>

      <div className="flex items-baseline gap-2 mb-4">
        <span className="font-serif text-[34px] font-normal text-slate-900 tabular-nums leading-none">{overall}</span>
        <span className="text-[12px] text-slate-500">/ 100</span>
      </div>

      {order.map((k) => (
        <SubBar
          key={k}
          label={SUBSCORE_LABELS[k]}
          value={scores[k]}
          context={deltaContext(k, { user: deltas[k].user, competitor: deltas[k].competitor })}
        />
      ))}

      <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
        <div className="rounded-lg bg-rose-50/90 border border-rose-100 px-2.5 py-2">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-rose-800 mb-0.5">Biggest gap</p>
          <p className="text-[10px] text-rose-950 leading-snug">
            <span className="font-medium">{SUBSCORE_LABELS[worst]}</span>
            {llm?.biggestGapNarrative ? <> — {llm.biggestGapNarrative}</> : null}
          </p>
        </div>
        <div className="rounded-lg bg-emerald-50/90 border border-emerald-100 px-2.5 py-2">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-emerald-800 mb-0.5">Biggest advantage</p>
          <p className="text-[10px] text-emerald-950 leading-snug">
            <span className="font-medium">{SUBSCORE_LABELS[best]}</span>
            {llm?.biggestAdvantageNarrative ? <> — {llm.biggestAdvantageNarrative}</> : null}
          </p>
        </div>
      </div>

      {llm?.actionItems?.length ? (
        <div className="mt-4 pt-3 border-t border-slate-100">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500 mb-2">Action items</p>
          <ul className="space-y-1.5 text-[10px] text-slate-700 leading-snug list-disc pl-4">
            {llm.actionItems.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {(llm?.voiceMapCaption || llm?.velocityCaption) && (
        <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-[10px] text-slate-600 leading-snug">
          {llm.voiceMapCaption ? (
            <p>
              <span className="font-semibold text-slate-700">Voice: </span>
              {llm.voiceMapCaption}
            </p>
          ) : null}
          {llm.velocityCaption ? (
            <p>
              <span className="font-semibold text-slate-700">Velocity: </span>
              {llm.velocityCaption}
            </p>
          ) : null}
        </div>
      )}
    </aside>
  );
}
