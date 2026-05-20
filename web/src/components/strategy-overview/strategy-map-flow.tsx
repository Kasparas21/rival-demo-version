"use client";

import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useReactFlow,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useMemo, useRef, type RefObject } from "react";

import { FunnelArrowsLayer } from "@/components/strategy-overview/funnel-arrows-layer";
import { FunnelCellNode, type FunnelCellNodeData } from "@/components/strategy-overview/funnel-cell-node";
import type { PlatformNodeData } from "@/components/strategy-overview/platform-node";
import { PlatformNode } from "@/components/strategy-overview/platform-node";
import { StrategyMapLegend } from "@/components/strategy-overview/strategy-map-legend";
import { coerceStrategyPlatformForDisplay } from "@/lib/strategy-overview/brand-scale-score";
import { layoutFunnelCellPositions } from "@/lib/strategy-overview/layout-funnel-cells";
import { strategyMapNodeSize } from "@/lib/strategy-overview/map-node-sizing";
import { normalizeStrategyMapPayload } from "@/lib/strategy-overview/normalize-strategy-payload";
import type { StrategyMapPayload } from "@/lib/strategy-overview/payload-types";
import { resolveStrategyMapEdges } from "@/lib/strategy-overview/resolve-map-edges";

type Props = {
  map: StrategyMapPayload;
  mapKey: string;
  onNodeClick?: (nodeId: string) => void;
  onEdgeHover?: (edge: { reasoning: string; confidence: number } | null) => void;
};

function FlowInner({
  map,
  onNodeClick,
  onEdgeHover,
  fitContainerRef,
}: Omit<Props, "mapKey"> & { fitContainerRef: RefObject<HTMLDivElement | null> }) {
  const { fitView } = useReactFlow();

  const runFit = useCallback(() => {
    requestAnimationFrame(() => {
      fitView({ padding: 0.18, duration: 220, maxZoom: 1.25 });
    });
  }, [fitView]);

  const platformRows = Array.isArray(map.platformNodes) ? map.platformNodes : [];
  const cellRows = Array.isArray(map.funnelCells) ? map.funnelCells : [];
  const useCellsLayout = cellRows.length > 0;

  const maxAdCount = useMemo(() => {
    if (useCellsLayout) return Math.max(1, ...cellRows.map((c) => c.adCount));
    return Math.max(1, ...platformRows.map((n) => n.adCount));
  }, [useCellsLayout, platformRows, cellRows]);

  const cellLayout = useMemo(
    () => (useCellsLayout ? layoutFunnelCellPositions(cellRows, maxAdCount) : new Map()),
    [useCellsLayout, cellRows, maxAdCount]
  );

  const funnelEdges = useMemo(
    () => (useCellsLayout ? resolveStrategyMapEdges(map) : []),
    [useCellsLayout, map]
  );

  const nodeTypes = useMemo(
    () => ({
      platform: PlatformNode as React.ComponentType<unknown>,
      "funnel-cell": FunnelCellNode as React.ComponentType<unknown>,
    }),
    []
  );

  const initialNodes: Node<PlatformNodeData | FunnelCellNodeData>[] = useMemo(() => {
    if (useCellsLayout) {
      return cellRows.map((c) => {
        const slot = cellLayout.get(c.id);
        const width = slot?.width ?? strategyMapNodeSize(c.adCount, maxAdCount).width;
        const height = slot?.height ?? strategyMapNodeSize(c.adCount, maxAdCount).height;
        return {
          id: c.id,
          type: "funnel-cell",
          position: { x: slot?.x ?? 0, y: slot?.y ?? 0 },
          width,
          height,
          style: { width, height },
          draggable: false,
          selectable: true,
          data: {
            label: c.label,
            platform: coerceStrategyPlatformForDisplay(String(c.platform)),
            funnelStage: c.funnelStage,
            adCount: c.adCount,
            maxAdCount,
            estSpendEurLow: c.estSpendEurLow,
            estSpendEurHigh: c.estSpendEurHigh,
            cellConfidence: c.cellConfidence,
          },
        };
      });
    }
    return platformRows.map((n) => {
      const { width, height } = strategyMapNodeSize(n.adCount, maxAdCount);
      return {
        id: n.platform,
        type: "platform",
        position: n.position,
        width,
        height,
        style: { width, height },
        draggable: false,
        selectable: true,
        data: {
          label: n.label,
          platform: n.platform,
          adCount: n.adCount,
          maxAdCount,
          activityLevel: n.activityLevel,
          estSpendEur: n.estSpendEur,
          estSpendEurLow: n.estSpendEurLow,
          estSpendEurHigh: n.estSpendEurHigh,
          funnelStage: n.funnelStage,
        },
      };
    });
  }, [useCellsLayout, platformRows, cellRows, maxAdCount, cellLayout]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);

  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  useEffect(() => {
    const el = fitContainerRef?.current;
    if (!el) return;
    let debounce: ReturnType<typeof setTimeout> | undefined;
    const scheduleFit = () => {
      const { width, height } = el.getBoundingClientRect();
      if (width < 48 || height < 48) return;
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => runFit(), 60);
    };
    const ro = new ResizeObserver(scheduleFit);
    ro.observe(el);
    scheduleFit();
    return () => {
      ro.disconnect();
      if (debounce) clearTimeout(debounce);
    };
  }, [fitContainerRef, runFit]);

  useEffect(() => {
    runFit();
  }, [runFit, initialNodes, funnelEdges.length]);

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onNodeClick?.(node.id);
    },
    [onNodeClick]
  );

  const arrowCells = useMemo(
    () =>
      cellRows.map((c) => ({
        id: c.id,
        platform: String(c.platform),
        funnelStage: c.funnelStage,
      })),
    [cellRows]
  );

  return (
    <>
      <style>{`
        @keyframes rivalFlowDash {
          to { stroke-dashoffset: -36; }
        }
        .rival-strategy-flow .react-flow__controls-button {
          border-radius: 8px;
        }
        .rival-funnel-arrow-dash {
          animation: rivalFlowDash 1.4s linear infinite;
        }
        .rival-funnel-arrows {
          z-index: 3;
          pointer-events: none;
        }
        .rival-funnel-arrow-group {
          pointer-events: auto;
        }
        .rival-strategy-flow .react-flow__nodes {
          z-index: 2;
        }
      `}</style>
      <ReactFlow
        className="rival-strategy-flow"
        nodes={nodes}
        edges={[]}
        onNodesChange={onNodesChange}
        nodeTypes={nodeTypes as never}
        onNodeClick={handleNodeClick}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        minZoom={0.35}
        maxZoom={1.75}
        proOptions={{ hideAttribution: true }}
      >
        {useCellsLayout ? (
          <FunnelArrowsLayer
            edges={funnelEdges}
            layout={cellLayout}
            cells={arrowCells}
            onEdgeHover={onEdgeHover}
          />
        ) : null}
        <Background variant={BackgroundVariant.Dots} gap={22} size={1.2} color="#cbd5e1" />
        <Controls
          position="bottom-center"
          orientation="horizontal"
          showInteractive={false}
          className="!rounded-xl !border !border-slate-200/90 !bg-white/95 !shadow-lg"
        />
      </ReactFlow>
    </>
  );
}

export function StrategyMapFlow(props: Props) {
  const { mapKey, map, ...rest } = props;
  const safeMap = normalizeStrategyMapPayload(map);
  const containerRef = useRef<HTMLDivElement>(null);
  return (
    <div className="w-full">
      <StrategyMapLegend />
      <div
        ref={containerRef}
        className="h-[min(680px,78vh)] w-full overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-br from-slate-50/90 via-white to-slate-100/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
      >
        <ReactFlowProvider>
          <FlowInner key={mapKey} map={safeMap} fitContainerRef={containerRef} {...rest} />
        </ReactFlowProvider>
      </div>
    </div>
  );
}
