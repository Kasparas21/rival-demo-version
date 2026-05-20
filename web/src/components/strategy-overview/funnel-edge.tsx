"use client";

import { getSmoothStepPath, Position, type EdgeProps } from "@xyflow/react";
import { memo } from "react";

import type { FunnelStage } from "@/lib/strategy-overview/payload-types";
import { STAGE_THEME } from "@/lib/strategy-overview/map-node-sizing";

export type FunnelEdgeData = {
  reasoning?: string;
  confidence?: number;
  fromStage?: FunnelStage;
  toStage?: FunnelStage;
  dashed?: boolean;
};

function arrowHeadPoints(x: number, y: number, position: Position, size = 12): string {
  const wing = size * 1.35;
  switch (position) {
    case Position.Top:
      return `${x},${y} ${x - size},${y + wing} ${x + size},${y + wing}`;
    case Position.Bottom:
      return `${x},${y} ${x - size},${y - wing} ${x + size},${y - wing}`;
    case Position.Left:
      return `${x},${y} ${x + wing},${y - size} ${x + wing},${y + size}`;
    case Position.Right:
    default:
      return `${x},${y} ${x - wing},${y - size} ${x - wing},${y + size}`;
  }
}

function FunnelEdgeInner(props: EdgeProps) {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    selected,
    data,
  } = props;
  const d = (data ?? {}) as FunnelEdgeData;
  const fromColor = d.fromStage ? STAGE_THEME[d.fromStage].border : "#475569";
  const toColor = d.toStage ? STAGE_THEME[d.toStage].border : fromColor;
  const dashed = d.dashed === true;

  const [path] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 22,
    offset: 12,
  });

  const strokeWidth = selected ? 4.5 : dashed ? 2.5 : 4;

  return (
    <g className="react-flow__edge rival-funnel-edge" data-id={id}>
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth={24}
        className="react-flow__edge-interaction"
      />
      <path
        d={path}
        fill="none"
        className="react-flow__edge-path"
        stroke={fromColor}
        strokeWidth={strokeWidth}
        strokeDasharray={dashed ? "12 8" : undefined}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={dashed ? 0.82 : 1}
      />
      <polygon
        className="rival-funnel-edge-arrow"
        points={arrowHeadPoints(targetX, targetY, targetPosition ?? Position.Left, 11)}
        fill={toColor}
        stroke={toColor}
        strokeWidth={1}
        strokeLinejoin="round"
      />
    </g>
  );
}

export const FunnelEdge = memo(FunnelEdgeInner);
