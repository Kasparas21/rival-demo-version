"use client";

import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useMemo } from "react";

import { FunnelCellNode, type FunnelCellNodeData } from "@/components/strategy-overview/funnel-cell-node";
import { FunnelEdge } from "@/components/strategy-overview/funnel-edge";
import type { PlatformNodeData } from "@/components/strategy-overview/platform-node";
import { PlatformNode } from "@/components/strategy-overview/platform-node";
import type { FunnelStage, StrategyMapPayload } from "@/lib/strategy-overview/payload-types";

type Props = {
  map: StrategyMapPayload;
  mapKey: string;
  onNodeClick?: (nodeId: string) => void;
  onEdgeHover?: (edge: { reasoning: string; confidence: number } | null) => void;
};

const STAGE_STROKE: Record<FunnelStage, string> = {
  TOF: "#3b82f6",
  MOF: "#f59e0b",
  BOF: "#10b981",
};

function stageForPlatform(payload: StrategyMapPayload, platform: string): FunnelStage {
  const n = payload.platformNodes.find((p) => p.platform === platform);
  return n?.funnelStage ?? "MOF";
}

function FlowInner({ map, onNodeClick, onEdgeHover }: Omit<Props, "mapKey">) {
  const { fitView } = useReactFlow();

  const useCellsLayout = map.funnelCells != null && map.funnelCells.length > 0;

  const nodeTypes = useMemo(
    () => ({
      platform: PlatformNode as React.ComponentType<unknown>,
      "funnel-cell": FunnelCellNode as React.ComponentType<unknown>,
    }),
    []
  );

  const edgeTypes = useMemo(
    () => ({
      funnel: FunnelEdge as React.ComponentType<unknown>,
    }),
    []
  );

  const initialNodes: Node<PlatformNodeData | FunnelCellNodeData>[] = useMemo(() => {
    if (useCellsLayout) {
      return map.funnelCells!.map((c) => ({
        id: c.id,
        type: "funnel-cell",
        position: c.position,
        style: { width: 200 },
        draggable: false,
        selectable: true,
        data: {
          label: c.label,
          platform: c.platform,
          funnelStage: c.funnelStage,
          adCount: c.adCount,
          estSpendEurLow: c.estSpendEurLow,
          estSpendEurHigh: c.estSpendEurHigh,
          cellConfidence: c.cellConfidence,
        },
      }));
    }
    return map.platformNodes.map((n) => ({
      id: n.platform,
      type: "platform",
      position: n.position,
      style: { width: 200 },
      draggable: false,
      selectable: true,
      data: {
        label: n.label,
        platform: n.platform,
        adCount: n.adCount,
        activityLevel: n.activityLevel,
        estSpendEur: n.estSpendEur,
        estSpendEurLow: n.estSpendEurLow,
        estSpendEurHigh: n.estSpendEurHigh,
        funnelStage: n.funnelStage,
      },
    }));
  }, [map, useCellsLayout]);

  const initialEdges: Edge[] = useMemo(() => {
    // TODO: design cell-level relationship edges (e.g., TOF → MOF cross-platform) in a future pass.
    if (useCellsLayout) return [];

    return map.funnelEdges.map((e) => {
      const st = stageForPlatform(map, e.from);
      const stroke = STAGE_STROKE[st];
      return {
        id: `${e.from}-${e.to}`,
        source: e.from,
        target: e.to,
        type: "funnel",
        animated: false,
        markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20, color: stroke },
        data: {
          stroke,
          dashed: e.style === "dashed",
          reasoning: e.reasoning,
          confidence: e.confidence,
        },
      };
    });
  }, [map, useCellsLayout]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  useEffect(() => {
    requestAnimationFrame(() => fitView({ padding: 0.2, duration: 200 }));
  }, [fitView, initialNodes, initialEdges]);

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onNodeClick?.(node.id);
    },
    [onNodeClick]
  );

  const handleEdgeMouseEnter = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      const d = edge.data as { reasoning?: string; confidence?: number } | undefined;
      if (d?.reasoning != null && d.confidence != null) {
        onEdgeHover?.({ reasoning: d.reasoning, confidence: d.confidence });
      }
    },
    [onEdgeHover]
  );

  const handleEdgeMouseLeave = useCallback(() => {
    onEdgeHover?.(null);
  }, [onEdgeHover]);

  return (
    <>
      <style>{`
        @keyframes rivalFlowDash {
          to { stroke-dashoffset: -28; }
        }
      `}</style>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes as never}
        edgeTypes={edgeTypes as never}
        onNodeClick={handleNodeClick}
        onEdgeMouseEnter={handleEdgeMouseEnter}
        onEdgeMouseLeave={handleEdgeMouseLeave}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        minZoom={0.4}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#cbd5e1" />
        <Controls
          position="bottom-center"
          orientation="horizontal"
          className="!bg-white/90 !border !border-slate-200/80 !rounded-xl !shadow-md"
        />
      </ReactFlow>
    </>
  );
}

export function StrategyMapFlow(props: Props) {
  const { mapKey, map, ...rest } = props;
  const useCellsLayout = map.funnelCells != null && map.funnelCells.length > 0;
  const heightClass = useCellsLayout ? "h-[min(640px,76vh)]" : "h-[min(520px,70vh)]";
  return (
    <div
      className={`${heightClass} w-full rounded-2xl border border-[0.5px] border-slate-200/90 bg-white/60 overflow-hidden`}
    >
      <ReactFlowProvider>
        <FlowInner key={mapKey} map={map} {...rest} />
      </ReactFlowProvider>
    </div>
  );
}
