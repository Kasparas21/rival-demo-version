"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { memo } from "react";

import type { FunnelStage } from "@/lib/strategy-overview/payload-types";

export type PlatformNodeData = {
  label: string;
  platform: string;
  adCount: number;
  activityLevel: string;
  estSpendEur: number;
  estSpendEurLow?: number;
  estSpendEurHigh?: number;
  funnelStage: FunnelStage;
};

const STAGE_BORDER: Record<FunnelStage, string> = {
  TOF: "rgba(59, 130, 246, 0.55)",
  MOF: "rgba(245, 158, 11, 0.65)",
  BOF: "rgba(16, 185, 129, 0.6)",
};

const STAGE_BADGE: Record<FunnelStage, string> = {
  TOF: "bg-blue-100 text-blue-800 border-blue-200",
  MOF: "bg-amber-100 text-amber-900 border-amber-200",
  BOF: "bg-emerald-100 text-emerald-900 border-emerald-200",
};

function fmtSpendEur(n: number): string {
  if (n >= 1000) return `€${(n / 1000).toFixed(1)}K/mo`;
  return `€${Math.round(n)}/mo`;
}

function fmtSpendEurShort(n: number): string {
  if (n >= 1000) return `€${(n / 1000).toFixed(1)}K`;
  return `€${Math.round(n)}`;
}

function describeEstSpend(d: PlatformNodeData): string {
  const low = d.estSpendEurLow ?? d.estSpendEur;
  const high = d.estSpendEurHigh ?? d.estSpendEur;
  if (Math.abs(high - low) < Math.max(low, high, 1) * 0.02) {
    return `Est. spend ${fmtSpendEur(d.estSpendEur)}`;
  }
  return `Est. spend ${fmtSpendEurShort(low)}–${fmtSpendEurShort(high)}/mo`;
}

function PlatformNodeInner({ data, selected }: NodeProps) {
  const d = data as PlatformNodeData;
  return (
    <div
      className={`rounded-2xl border bg-white/95 px-4 py-3 shadow-[0_8px_28px_rgba(15,23,42,0.08)] transition-all min-w-[140px] max-w-[220px] ${
        selected ? "ring-2 ring-[#343434]/25 scale-[1.02]" : ""
      }`}
      style={{ borderColor: STAGE_BORDER[d.funnelStage], borderWidth: "0.5px" }}
    >
      <Handle type="target" position={Position.Left} className="!bg-slate-400 !w-2 !h-2" />
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <span className="text-[13px] font-semibold text-[#0f172a] truncate">{d.label}</span>
        <span
          className={`shrink-0 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full border ${STAGE_BADGE[d.funnelStage]}`}
        >
          {d.funnelStage}
        </span>
      </div>
      <p className="text-[22px] font-bold text-[#0f172a] leading-tight tabular-nums">
        {d.adCount} <span className="text-[14px] font-semibold text-[#64748b]">ads</span>
      </p>
      <p className="text-[11px] text-[#64748b] mt-0.5">{d.activityLevel} activity</p>
      <p className="text-[11px] font-medium text-[#334155] mt-2">{describeEstSpend(d)}</p>
      <Handle type="source" position={Position.Right} className="!bg-slate-400 !w-2 !h-2" />
    </div>
  );
}

export const PlatformNode = memo(PlatformNodeInner);
