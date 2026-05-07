"use client";

import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  Panel,
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

import type { FunnelStage, StrategyMapPayload } from "@/lib/strategy-overview/payload-types";
import { FunnelEdge } from "@/components/strategy-overview/funnel-edge";
import type { PlatformNodeData } from "@/components/strategy-overview/platform-node";
import { PlatformNode } from "@/components/strategy-overview/platform-node";

type Props = {
  map: StrategyMapPayload;
  mapKey: string;
  onNodeClick?: (platform: string) => void;
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

  const nodeTypes = useMemo(
    () => ({
      platform: PlatformNode as React.ComponentType<unknown>,
    }),
    []
  );

  const edgeTypes = useMemo(
    () => ({
      funnel: FunnelEdge as React.ComponentType<unknown>,
    }),
    []
  );

  const initialNodes: Node<PlatformNodeData>[] = useMemo(
    () =>
      map.platformNodes.map((n) => ({
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
      })),
    [map]
  );

  const initialEdges: Edge[] = useMemo(() => {
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
  }, [map]);

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
        <Panel position="top-right" className="m-2">
          <div className="rounded-xl border border-slate-200/80 bg-white/95 px-3 py-2 text-[10px] shadow-sm">
            <p className="font-semibold text-slate-600 mb-1.5">Legend</p>
            <div className="flex flex-col gap-1">
              <span className="flex items-center gap-2 text-slate-700">
                <span className="h-2 w-2 rounded-full bg-blue-500" /> TOF (Awareness)
              </span>
              <span className="flex items-center gap-2 text-slate-700">
                <span className="h-2 w-2 rounded-full bg-amber-500" /> MOF (Consideration)
              </span>
              <span className="flex items-center gap-2 text-slate-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> BOF (Conversion)
              </span>
            </div>
          </div>
        </Panel>
      </ReactFlow>
    </>
  );
}

export function StrategyMapFlow(props: Props) {
  const { mapKey, ...rest } = props;
  return (
    <div className="h-[min(520px,70vh)] w-full rounded-2xl border border-[0.5px] border-slate-200/90 bg-white/60 overflow-hidden">
      <ReactFlowProvider>
        <FlowInner key={mapKey} {...rest} />
      </ReactFlowProvider>
    </div>
  );
}
