"use client";

import { ViewportPortal } from "@xyflow/react";
import { useMemo, useState } from "react";

import { buildFunnelArrows } from "@/lib/strategy-overview/funnel-arrow-geometry";
import type { FunnelCellLayoutEntry } from "@/lib/strategy-overview/layout-funnel-cells";
import type { FunnelEdgePayload, FunnelStage } from "@/lib/strategy-overview/payload-types";

type Props = {
  edges: FunnelEdgePayload[];
  layout: Map<string, FunnelCellLayoutEntry>;
  cells: { id: string; platform: string; funnelStage: FunnelStage }[];
  /** When set, skip internal buildFunnelArrows (used for merged paid + channel arrows). */
  prebuiltArrows?: ReturnType<typeof buildFunnelArrows>;
  onEdgeHover?: (edge: { reasoning: string; confidence: number } | null) => void;
};

export function FunnelArrowsLayer({ edges, layout, cells, prebuiltArrows, onEdgeHover }: Props) {
  const [hoverId, setHoverId] = useState<string | null>(null);

  const arrows = useMemo(
    () =>
      prebuiltArrows ??
      buildFunnelArrows({
        edges,
        layout,
        cells,
      }),
    [prebuiltArrows, edges, layout, cells],
  );

  if (arrows.length === 0) return null;

  return (
    <ViewportPortal>
      <svg
        className="rival-funnel-arrows overflow-visible"
        style={{ overflow: "visible", pointerEvents: "none" }}
      >
        <defs>
          {arrows.map((a) => (
            <linearGradient
              key={a.gradId}
              id={a.gradId}
              gradientUnits="userSpaceOnUse"
              x1={a.gradX1}
              y1={a.gradY1}
              x2={a.gradX2}
              y2={a.gradY2}
            >
              <stop offset="0%" stopColor={a.fromColor} />
              <stop offset="100%" stopColor={a.toColor} />
            </linearGradient>
          ))}
        </defs>
        {arrows.map((a) => {
          const active = hoverId === a.id;
          const isChannel = a.id.startsWith("ch_");
          const baseWidth = isChannel ? 2.75 : a.dashed ? 2.5 : 3.5;
          const activeWidth = isChannel ? 3.75 : 4.5;
          return (
            <g
              key={a.id}
              className="rival-funnel-arrow-group"
              style={{ pointerEvents: "stroke" }}
              onMouseEnter={() => {
                setHoverId(a.id);
                onEdgeHover?.({ reasoning: a.reasoning, confidence: a.confidence });
              }}
              onMouseLeave={() => {
                setHoverId(null);
                onEdgeHover?.(null);
              }}
            >
              <path
                d={a.path}
                fill="none"
                stroke="transparent"
                strokeWidth={28}
                style={{ pointerEvents: "stroke" }}
              />
              <path
                d={a.path}
                fill="none"
                stroke={a.dashed ? a.fromColor : `url(#${a.gradId})`}
                strokeWidth={active ? activeWidth : baseWidth}
                strokeDasharray={a.dashed ? "10 7" : undefined}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={isChannel ? (active ? 0.92 : 0.72) : a.dashed ? 0.78 : 0.95}
                className={a.dashed ? "rival-funnel-arrow-dash" : undefined}
              />
              <polygon
                points={a.arrowPoints}
                fill={a.toColor}
                stroke={a.toColor}
                strokeWidth={1}
                strokeLinejoin="round"
                opacity={isChannel ? 0.85 : 1}
              />
            </g>
          );
        })}
      </svg>
    </ViewportPortal>
  );
}
