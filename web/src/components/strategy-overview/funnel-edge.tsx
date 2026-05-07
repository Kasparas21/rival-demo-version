"use client";

import { BaseEdge, getBezierPath, type EdgeProps } from "@xyflow/react";
import { memo } from "react";

export type FunnelEdgeData = {
  reasoning?: string;
  confidence?: number;
  stroke?: string;
  dashed?: boolean;
};

function FunnelEdgeInner(props: EdgeProps) {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    markerEnd,
    selected,
  } = props;
  const data = (props.data ?? {}) as FunnelEdgeData;
  const stroke = data.stroke ?? "#94a3b8";
  const dashed = data.dashed !== false;

  const [path] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <BaseEdge
      id={id}
      path={path}
      markerEnd={markerEnd}
      style={{
        stroke,
        strokeWidth: selected ? 2.6 : 1.8,
        strokeDasharray: dashed ? "8 6" : undefined,
        animation: dashed ? "rivalFlowDash 1.2s linear infinite" : undefined,
      }}
    />
  );
}

export const FunnelEdge = memo(FunnelEdgeInner);
