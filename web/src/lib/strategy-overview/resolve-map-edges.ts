import type { FunnelEdgePayload, FunnelStage, StrategyMapPayload } from "@/lib/strategy-overview/payload-types";

/**
 * Funnel arrows to draw: the stored ones that carry evidence (a landing page both ends share). This used to
 * re-derive arrows in the browser from stage order and ad counts alone, ignoring what the server stored;
 * maps saved before evidence existed show no arrows until their next recompute.
 */
export function resolveStrategyMapEdges(map: StrategyMapPayload): FunnelEdgePayload[] {
  const stored = Array.isArray(map.funnelEdges) ? map.funnelEdges : [];
  return stored.filter((e) => (e.evidence?.sharedLandingPages.length ?? 0) > 0);
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
