"use client";

import { type NodeProps } from "@xyflow/react";
import { memo } from "react";

import { ComparisonPlatformIcon } from "@/components/comparison/platform-icon";
import type { FunnelStage, StrategyPlatform } from "@/lib/strategy-overview/payload-types";

export type FunnelCellNodeData = {
  label: string;
  platform: StrategyPlatform;
  funnelStage: FunnelStage;
  adCount: number;
  estSpendEurLow: number;
  estSpendEurHigh: number;
  cellConfidence: "high" | "medium" | "low";
};

/** Platform accent at ~25% opacity for card border */
const PLATFORM_BORDER: Record<StrategyPlatform, string> = {
  meta: "rgba(0, 100, 224, 0.25)",
  google: "rgba(66, 133, 244, 0.25)",
  tiktok: "rgba(0, 242, 234, 0.28)",
  linkedin: "rgba(10, 102, 194, 0.25)",
  pinterest: "rgba(230, 0, 35, 0.22)",
  snapchat: "rgba(255, 252, 0, 0.35)",
};

const STAGE_PILL: Record<FunnelStage, string> = {
  TOF: "bg-blue-100 text-blue-700 border-blue-200",
  MOF: "bg-amber-100 text-amber-700 border-amber-200",
  BOF: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

function formatSpendShort(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return `${Math.round(n)}`;
}

function describeSpend(d: FunnelCellNodeData): string {
  return `Modeled €${formatSpendShort(d.estSpendEurLow)}–€${formatSpendShort(d.estSpendEurHigh)}/mo`;
}

function FunnelCellNodeInner({ data, selected }: NodeProps) {
  const d = data as FunnelCellNodeData;
  const border = PLATFORM_BORDER[d.platform] ?? "rgba(100, 116, 139, 0.25)";

  return (
    <div
      className={`rounded-2xl border bg-white/95 px-3 py-2.5 shadow-[0_8px_28px_rgba(15,23,42,0.08)] transition-all cursor-pointer hover:scale-[1.02] hover:shadow-[0_12px_32px_rgba(15,23,42,0.12)] w-[200px] min-h-[120px] ${
        selected ? "ring-2 ring-[#343434]/25" : ""
      }`}
      style={{ borderColor: border, borderWidth: "1px" }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <ComparisonPlatformIcon platform={d.platform} className="h-6 w-6 shrink-0" />
          <span className="text-[13px] font-semibold text-[#0f172a] truncate">{d.label}</span>
        </div>
        <span
          className={`shrink-0 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full border ${STAGE_PILL[d.funnelStage]}`}
        >
          {d.funnelStage}
        </span>
      </div>
      <p className="text-[20px] font-bold text-[#0f172a] leading-tight tabular-nums">
        {d.adCount} <span className="text-[13px] font-semibold text-[#64748b]">ads</span>
      </p>
      <p className="text-[11px] font-medium text-[#334155] mt-1.5">{describeSpend(d)}</p>
      {d.cellConfidence === "high" ? (
        <p className="text-[10px] text-slate-600 mt-1.5 flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
          High confidence
        </p>
      ) : d.cellConfidence === "low" ? (
        <p className="text-[10px] text-amber-800 mt-1.5 flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden />
          Limited data
        </p>
      ) : null}
    </div>
  );
}

export const FunnelCellNode = memo(FunnelCellNodeInner);
