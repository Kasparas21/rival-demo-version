"use client";

import { Leaf, Mail, Target } from "lucide-react";

import type { FunnelStage } from "@/lib/strategy-overview/payload-types";

const LEGEND: { stage: FunnelStage; label: string; sub: string; dot: string; ring: string }[] = [
  { stage: "TOF", label: "TOF", sub: "Awareness", dot: "bg-blue-500", ring: "ring-blue-200" },
  { stage: "MOF", label: "MOF", sub: "Consideration", dot: "bg-amber-500", ring: "ring-amber-200" },
  { stage: "BOF", label: "BOF", sub: "Conversion", dot: "bg-emerald-500", ring: "ring-emerald-200" },
];

type Props = {
  showChannels?: boolean;
  showGoal?: boolean;
};

export function StrategyMapLegend({ showChannels = false, showGoal = false }: Props) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-slate-200/80 bg-white/90 px-4 py-2.5 shadow-sm">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Funnel stages</span>
      {LEGEND.map((item) => (
        <div key={item.stage} className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${item.dot} ring-2 ${item.ring}`} aria-hidden />
          <span className="text-[12px] font-semibold text-slate-800">{item.label}</span>
          <span className="text-[11px] text-slate-500">{item.sub}</span>
        </div>
      ))}
      {showChannels ? (
        <>
          <span className="hidden h-4 w-px bg-slate-200 sm:block" aria-hidden />
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-violet-100 text-violet-600">
              <Leaf className="h-3 w-3" aria-hidden />
            </span>
            <span className="text-[12px] font-semibold text-slate-800">Organic</span>
            <span className="text-[11px] text-slate-500">warms paid TOF</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-amber-100 text-amber-700">
              <Mail className="h-3 w-3" aria-hidden />
            </span>
            <span className="text-[12px] font-semibold text-slate-800">Email</span>
            <span className="text-[11px] text-slate-500">captures BOF traffic</span>
          </div>
        </>
      ) : null}
      {showGoal ? (
        <>
          <span className="hidden h-4 w-px bg-slate-200 sm:block" aria-hidden />
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-white shadow-sm">
              <Target className="h-3 w-3" aria-hidden />
            </span>
            <span className="text-[12px] font-semibold text-slate-800">Outcome</span>
            <span className="text-[11px] text-slate-500">macro goal · paths differ</span>
          </div>
        </>
      ) : null}
    </div>
  );
}
