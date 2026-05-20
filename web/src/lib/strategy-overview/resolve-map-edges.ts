import { deriveFunnelCellEdges } from "@/lib/strategy-overview/funnel-cell-edges";
import type { FunnelCellId, FunnelEdgePayload, FunnelStage, StrategyMapPayload } from "@/lib/strategy-overview/payload-types";

/** Always derive cell-level edges from live funnel cells (ignore stale platform-only cache). */
export function resolveStrategyMapEdges(map: StrategyMapPayload): FunnelEdgePayload[] {
  const cells = Array.isArray(map.funnelCells) ? map.funnelCells : [];
  const stored = Array.isArray(map.funnelEdges) ? map.funnelEdges : [];

  if (cells.length === 0) return stored;

  const allowCrossPlatform = map.suppressEdgesReason !== "single_platform" && map.suppressEdgesReason !== "low_sample";
  const enriched = new Map<FunnelCellId, number>(
    cells.map((c) => [c.id, Math.max(1, c.adCount)])
  );

  return deriveFunnelCellEdges({
    cells,
    angleByCell: new Map(),
    enrichedCountByCell: enriched,
    allowCrossPlatform,
  }).edges;
}

export function stageForEdgeEndpoint(
  map: StrategyMapPayload,
  nodeId: string,
  hint?: FunnelStage
): FunnelStage {
  if (hint === "TOF" || hint === "MOF" || hint === "BOF") return hint;
  const cell = map.funnelCells?.find((c) => c.id === nodeId);
  if (cell) return cell.funnelStage;
  const platform = map.platformNodes?.find((n) => n.platform === nodeId);
  return platform?.funnelStage ?? "MOF";
}

export function edgeHandlesForCells(
  fromId: string,
  toId: string,
  cells: NonNullable<StrategyMapPayload["funnelCells"]>
): { sourceHandle?: string; targetHandle?: string } {
  const from = cells.find((c) => c.id === fromId);
  const to = cells.find((c) => c.id === toId);
  if (!from || !to) return {};
  if (from.platform === to.platform) {
    return { sourceHandle: "bottom", targetHandle: "top" };
  }
  return { sourceHandle: "right", targetHandle: "left" };
}
