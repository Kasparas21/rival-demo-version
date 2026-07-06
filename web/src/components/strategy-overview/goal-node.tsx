"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { memo } from "react";
import { Target } from "lucide-react";

import { JOURNEY_GOAL_THEME } from "@/lib/strategy-overview/map-node-sizing";
import type { JourneyPathIntentSummary } from "@/lib/strategy-overview/payload-types";

export type GoalNodeData = {
  label: string;
  confidence: number;
  pathIntentBreakdown: JourneyPathIntentSummary[];
};

const theme = JOURNEY_GOAL_THEME;
const handleClass =
  "!h-3 !w-3 !border-2 !border-white !bg-rose-600 !opacity-100 pointer-events-none";

function GoalNodeInner({ data, selected }: NodeProps) {
  const d = data as GoalNodeData;
  const topPaths = d.pathIntentBreakdown.slice(0, 3);

  return (
    <div
      className={`group relative flex h-full min-h-0 w-full min-w-0 flex-col items-center justify-center overflow-visible transition-all duration-200 cursor-pointer ${
        selected ? "scale-[1.03]" : "hover:scale-[1.02]"
      }`}
    >
      <Handle id="top" type="target" position={Position.Top} className={handleClass} />

      {/* Dashed outer ring — terminal marker, not a channel card */}
      <div
        className="pointer-events-none absolute inset-0 rounded-[999px] border-2 border-dashed"
        style={{ borderColor: theme.ring }}
        aria-hidden
      />

      <div
        className="relative z-10 flex h-[calc(100%-6px)] w-[calc(100%-8px)] min-w-0 flex-col items-center justify-center overflow-hidden rounded-[999px] px-4 py-2 text-center"
        style={{
          background: theme.bg,
          boxShadow: selected ? theme.glow : `0 12px 36px rgba(15, 23, 42, 0.12), ${theme.glow}`,
        }}
      >
        <div
          className="mb-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white"
          style={{ background: theme.core, boxShadow: theme.coreGlow }}
        >
          <Target className="h-[18px] w-[18px]" aria-hidden />
        </div>

        <p className="text-[8px] font-bold uppercase tracking-[0.22em] text-rose-600/85">
          Business outcome
        </p>
        <p className={`line-clamp-1 max-w-full text-[14px] font-extrabold leading-tight ${theme.metricText}`}>
          {d.label}
        </p>

        {topPaths.length > 0 ? (
          <div className="mt-1 flex max-w-full flex-wrap items-center justify-center gap-1">
            {topPaths.map((p) => (
              <span
                key={p.intent}
                className={`truncate rounded-full px-1.5 py-px text-[8px] font-semibold ${theme.chip}`}
              >
                {p.pathCount}× {p.label}
              </span>
            ))}
          </div>
        ) : (
          <p className={`mt-0.5 text-[9px] font-medium ${theme.subtle}`}>
            {Math.round(d.confidence * 100)}% confidence
          </p>
        )}
      </div>

      {/* Map-pin tip */}
      <div
        className="pointer-events-none absolute -bottom-1 left-1/2 z-0 h-2.5 w-2.5 -translate-x-1/2 rotate-45 border-b-2 border-r-2 bg-rose-100"
        style={{ borderColor: theme.border }}
        aria-hidden
      />
    </div>
  );
}

export const GoalNode = memo(GoalNodeInner);
