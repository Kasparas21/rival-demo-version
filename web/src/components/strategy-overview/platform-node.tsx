"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { memo } from "react";

import { ComparisonPlatformIcon } from "@/components/comparison/platform-icon";
import {
  STAGE_THEME,
  activityIntensity,
} from "@/lib/strategy-overview/map-node-sizing";
import type { FunnelStage, StrategyPlatform } from "@/lib/strategy-overview/payload-types";

export type PlatformNodeData = {
  label: string;
  platform: StrategyPlatform;
  adCount: number;
  maxAdCount?: number;
  activityLevel: string;
  estSpendEur: number;
  estSpendEurLow?: number;
  estSpendEurHigh?: number;
  funnelStage: FunnelStage;
};

function fmtSpendEurShort(n: number): string {
  if (n >= 1000) return `€${(n / 1000).toFixed(1)}K`;
  return `€${Math.round(n)}`;
}

function describeEstSpend(d: PlatformNodeData): string {
  const mid = d.estSpendEur;
  return `Est. Spend ${fmtSpendEurShort(mid)}/mo`;
}

function PlatformNodeInner({ data, selected }: NodeProps) {
  const d = data as PlatformNodeData;
  const theme = STAGE_THEME[d.funnelStage];
  const intensity = activityIntensity(d.adCount, d.maxAdCount ?? d.adCount);
  const borderWidth = 1.5 + intensity * 1.5;

  return (
    <div
      className={`relative flex h-full w-full flex-col rounded-2xl px-4 py-3.5 transition-all duration-200 ${
        selected ? "scale-[1.02] ring-2 ring-slate-400/40" : "hover:scale-[1.015]"
      }`}
      style={{
        background: theme.bg,
        borderColor: theme.border,
        borderWidth,
        borderStyle: "solid",
        boxShadow: selected ? theme.glow : `0 8px 28px rgba(15, 23, 42, 0.08), ${theme.glow}`,
        opacity: 0.88 + intensity * 0.12,
      }}
    >
      <Handle type="target" position={Position.Left} className="!h-2.5 !w-2.5 !border-2 !border-white !bg-slate-400" />
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/90 shadow-sm ring-1 ring-white/80">
            <ComparisonPlatformIcon platform={d.platform} className="h-5 w-5" />
          </div>
          <span className="truncate text-[14px] font-bold text-slate-900">{d.label}</span>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${theme.badge}`}
        >
          {d.funnelStage}
        </span>
      </div>
      <p className={`text-[28px] font-extrabold leading-none tabular-nums ${theme.adText}`}>
        {d.adCount}
        <span className="ml-1.5 text-[15px] font-bold text-slate-600">ads</span>
      </p>
      <p className={`mt-2 text-[12px] font-semibold capitalize ${theme.subtle}`}>{d.activityLevel} activity</p>
      <p className={`mt-1 text-[12px] font-bold ${theme.subtle}`}>{describeEstSpend(d)}</p>
      <Handle type="source" position={Position.Right} className="!h-2.5 !w-2.5 !border-2 !border-white !bg-slate-400" />
    </div>
  );
}

export const PlatformNode = memo(PlatformNodeInner);
