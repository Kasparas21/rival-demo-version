"use client";

import type { FunnelStage } from "@/lib/strategy-overview/payload-types";

const LEGEND: { stage: FunnelStage; label: string; sub: string; dot: string; ring: string }[] = [
  { stage: "TOF", label: "TOF", sub: "Awareness", dot: "bg-blue-500", ring: "ring-blue-200" },
  { stage: "MOF", label: "MOF", sub: "Consideration", dot: "bg-amber-500", ring: "ring-amber-200" },
  { stage: "BOF", label: "BOF", sub: "Conversion", dot: "bg-emerald-500", ring: "ring-emerald-200" },
];

export function StrategyMapLegend() {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-4 rounded-xl border border-slate-200/80 bg-white/90 px-4 py-2.5 shadow-sm">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Funnel stages</span>
      {LEGEND.map((item) => (
        <div key={item.stage} className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${item.dot} ring-2 ${item.ring}`} aria-hidden />
          <span className="text-[12px] font-semibold text-slate-800">{item.label}</span>
          <span className="text-[11px] text-slate-500">{item.sub}</span>
        </div>
      ))}
    </div>
  );
}
