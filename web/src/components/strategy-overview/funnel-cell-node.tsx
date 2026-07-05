"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { memo } from "react";

import { ComparisonPlatformIcon } from "@/components/comparison/platform-icon";
import {
  STAGE_THEME,
  activityIntensity,
  activityLevelLabel,
} from "@/lib/strategy-overview/map-node-sizing";
import type { FunnelStage, StrategyPlatform } from "@/lib/strategy-overview/payload-types";

export type FunnelCellNodeData = {
  label: string;
  platform: StrategyPlatform;
  funnelStage: FunnelStage;
  adCount: number;
  maxAdCount?: number;
  estSpendEurLow: number;
  estSpendEurHigh: number;
  cellConfidence: "high" | "medium" | "low";
};

function formatSpendShort(n: number): string {
  if (n >= 1000) return `€${(n / 1000).toFixed(1)}K`;
  return `€${Math.round(n)}`;
}

function describeSpend(d: FunnelCellNodeData): string {
  const mid = (d.estSpendEurLow + d.estSpendEurHigh) / 2;
  return `Est. Spend ${formatSpendShort(mid)}/mo`;
}

const handleClass =
  "!h-3 !w-3 !border-2 !border-white !bg-slate-500 !opacity-100 pointer-events-none";

function FunnelCellNodeInner({ data, selected }: NodeProps) {
  const d = data as FunnelCellNodeData;
  const theme = STAGE_THEME[d.funnelStage];
  const max = d.maxAdCount ?? d.adCount;
  const intensity = activityIntensity(d.adCount, max);
  const borderWidth = 1.5 + intensity * 1.5;
  const activity = activityLevelLabel(d.adCount, max);

  return (
    <div
      className={`relative flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-2xl px-4 py-3 transition-all duration-200 cursor-pointer ${
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
      <Handle id="top" type="target" position={Position.Top} className={handleClass} />
      <Handle id="left" type="target" position={Position.Left} className={handleClass} />
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
      <p className={`mt-1.5 line-clamp-1 text-[12px] font-semibold capitalize ${theme.subtle}`}>
        {activity} activity
      </p>
      <p className={`mt-0.5 line-clamp-1 text-[12px] font-bold ${theme.subtle}`}>{describeSpend(d)}</p>
      <Handle id="bottom" type="source" position={Position.Bottom} className={handleClass} />
      <Handle id="right" type="source" position={Position.Right} className={handleClass} />
    </div>
  );
}

export const FunnelCellNode = memo(FunnelCellNodeInner);
