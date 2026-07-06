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

import { GoalNode, type GoalNodeData } from "@/components/strategy-overview/goal-node";
import { EmailChannelNode, type EmailChannelNodeData } from "@/components/strategy-overview/email-channel-node";
import { FunnelArrowsLayer } from "@/components/strategy-overview/funnel-arrows-layer";
import { FunnelCellNode, type FunnelCellNodeData } from "@/components/strategy-overview/funnel-cell-node";
import { OrganicChannelNode, type OrganicChannelNodeData } from "@/components/strategy-overview/organic-channel-node";
import type { PlatformNodeData } from "@/components/strategy-overview/platform-node";
import { PlatformNode } from "@/components/strategy-overview/platform-node";
import { StrategyMapLegend } from "@/components/strategy-overview/strategy-map-legend";
import { coerceStrategyPlatformForDisplay } from "@/lib/strategy-overview/brand-scale-score";
import { hasChannelSignals } from "@/lib/strategy-overview/channel-signals";
import { hasJourneyGoal } from "@/lib/strategy-overview/derive-journey-goal";
import { buildChannelArrows, buildFunnelArrows } from "@/lib/strategy-overview/funnel-arrow-geometry";
import { layoutFunnelCellPositions } from "@/lib/strategy-overview/layout-funnel-cells";
import { layoutChannelNodePositions, JOURNEY_GOAL_NODE_ID } from "@/lib/strategy-overview/layout-channel-nodes";
import { strategyMapNodeSize } from "@/lib/strategy-overview/map-node-sizing";
import { normalizeStrategyMapPayload } from "@/lib/strategy-overview/normalize-strategy-payload";
import type {
  StrategyChannelSignals,
  StrategyJourneyGoal,
  StrategyMapPayload,
} from "@/lib/strategy-overview/payload-types";
import { resolveStrategyMapEdges } from "@/lib/strategy-overview/resolve-map-edges";

type Props = {
  map: StrategyMapPayload;
  channelSignals?: StrategyChannelSignals | null;
  journeyGoal?: StrategyJourneyGoal | null;
  mapKey: string;
  onNodeClick?: (nodeId: string) => void;
  onChannelNodeClick?: (kind: "organic" | "email", platform?: string) => void;
  onGoalNodeClick?: () => void;
  onEdgeHover?: (edge: { reasoning: string; confidence: number } | null) => void;
  mapHeightClass?: string;
  /** Landing / thumbnail embed — tighter legend, no controls, zoomed-out fit */
  compact?: boolean;
};

function FlowInner({
  map,
  channelSignals,
  journeyGoal,
  onNodeClick,
  onChannelNodeClick,
  onGoalNodeClick,
  onEdgeHover,
  fitContainerRef,
  compact = false,
}: Omit<Props, "mapKey"> & { fitContainerRef: RefObject<HTMLDivElement | null> }) {
  const { fitView } = useReactFlow();

  const runFit = useCallback(() => {
    requestAnimationFrame(() => {
      fitView({
        padding: compact ? 0.14 : 0.2,
        duration: compact ? 0 : 220,
        minZoom: compact ? 0.02 : 0.28,
        maxZoom: compact ? 0.55 : 1.1,
      });
    });
  }, [compact, fitView]);

  const platformRows = Array.isArray(map.platformNodes) ? map.platformNodes : [];
  const cellRows = Array.isArray(map.funnelCells) ? map.funnelCells : [];
  const useCellsLayout = cellRows.length > 0;
  const showGoal = hasJourneyGoal(journeyGoal);
  const showChannels = hasChannelSignals(channelSignals) || showGoal;

  const maxAdCount = useMemo(() => {
    if (useCellsLayout) return Math.max(1, ...cellRows.map((c) => c.adCount));
    return Math.max(1, ...platformRows.map((n) => n.adCount));
  }, [useCellsLayout, platformRows, cellRows]);

  const cellLayout = useMemo(
    () => (useCellsLayout ? layoutFunnelCellPositions(cellRows, maxAdCount) : new Map()),
    [useCellsLayout, cellRows, maxAdCount],
  );

  const emailAnchorCellId = useMemo(() => {
    if (channelSignals?.emailNode) {
      const edge = channelSignals.channelEdges.find((e) => e.kind === "paid_to_email");
      if (edge?.from) return edge.from;
    }
    if (showGoal && journeyGoal) {
      const bofEdge = journeyGoal.goalEdges.find((e) => e.kind === "bof_to_goal");
      if (bofEdge) return bofEdge.from;
    }
    const bof = cellRows.filter((c) => c.funnelStage === "BOF").sort((a, b) => b.adCount - a.adCount)[0];
    return bof?.id ?? null;
  }, [channelSignals, showGoal, journeyGoal, cellRows]);

  const channelLayout = useMemo(() => {
    if (!showChannels || cellLayout.size === 0) return new Map();
    return layoutChannelNodePositions({
      cellLayout,
      cells: cellRows.map((c) => ({ id: c.id, platform: String(c.platform) })),
      signals: channelSignals,
      emailAnchorCellId,
      journeyGoal: showGoal ? journeyGoal : null,
    });
  }, [showChannels, channelSignals, cellLayout, cellRows, emailAnchorCellId, showGoal, journeyGoal]);

  const mergedLayout = useMemo(() => {
    const merged = new Map(cellLayout);
    for (const [k, v] of channelLayout) merged.set(k, v);
    return merged;
  }, [cellLayout, channelLayout]);

  const funnelEdges = useMemo(
    () => (useCellsLayout ? resolveStrategyMapEdges(map) : []),
    [useCellsLayout, map],
  );

  const allArrows = useMemo(() => {
    const paid = buildFunnelArrows({
      edges: funnelEdges,
      layout: mergedLayout,
      cells: cellRows.map((c) => ({
        id: c.id,
        platform: String(c.platform),
        funnelStage: c.funnelStage,
      })),
    });
    const crossChannelEdges = [
      ...(channelSignals?.channelEdges ?? []),
      ...(journeyGoal?.goalEdges ?? []),
    ];
    if (crossChannelEdges.length === 0) return paid;
    const channel = buildChannelArrows({
      edges: crossChannelEdges,
      layout: mergedLayout,
    });
    return [...paid, ...channel];
  }, [funnelEdges, mergedLayout, cellRows, channelSignals, journeyGoal]);

  const nodeTypes = useMemo(
    () => ({
      platform: PlatformNode as React.ComponentType<unknown>,
      "funnel-cell": FunnelCellNode as React.ComponentType<unknown>,
      "organic-channel": OrganicChannelNode as React.ComponentType<unknown>,
      "email-channel": EmailChannelNode as React.ComponentType<unknown>,
      "goal-node": GoalNode as React.ComponentType<unknown>,
    }),
    [],
  );

  const initialNodes: Node<
    | PlatformNodeData
    | FunnelCellNodeData
    | OrganicChannelNodeData
    | EmailChannelNodeData
    | GoalNodeData
  >[] = useMemo(() => {
    const nodes: Node<
      | PlatformNodeData
      | FunnelCellNodeData
      | OrganicChannelNodeData
      | EmailChannelNodeData
      | GoalNodeData
    >[] = [];

    if (useCellsLayout) {
      for (const c of cellRows) {
        const slot = cellLayout.get(c.id);
        const width = slot?.width ?? strategyMapNodeSize(c.adCount, maxAdCount).width;
        const height = slot?.height ?? strategyMapNodeSize(c.adCount, maxAdCount).height;
        nodes.push({
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
        });
      }
    } else {
      for (const n of platformRows) {
        const { width, height } = strategyMapNodeSize(n.adCount, maxAdCount);
        nodes.push({
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
        });
      }
    }

    if (showChannels && channelSignals) {
      for (const o of channelSignals.organicNodes) {
        const slot = channelLayout.get(o.id);
        if (!slot) continue;
        nodes.push({
          id: o.id,
          type: "organic-channel",
          position: { x: slot.x, y: slot.y },
          width: slot.width,
          height: slot.height,
          style: { width: slot.width, height: slot.height },
          draggable: false,
          selectable: true,
          data: {
            label: o.label,
            platform: o.platform,
            postCount: o.postCount,
            postsPerWeek: o.postsPerWeek,
            avgEngagement: o.avgEngagement,
            pairedPaidPlatform: o.pairedPaidPlatform,
          },
        });
      }
      if (channelSignals.emailNode) {
        const slot = channelLayout.get(channelSignals.emailNode.id);
        if (slot) {
          nodes.push({
            id: channelSignals.emailNode.id,
            type: "email-channel",
            position: { x: slot.x, y: slot.y },
            width: slot.width,
            height: slot.height,
            style: { width: slot.width, height: slot.height },
            draggable: false,
            selectable: true,
            data: {
              label: channelSignals.emailNode.label,
              emailCount: channelSignals.emailNode.emailCount,
              emailsPerWeek: channelSignals.emailNode.emailsPerWeek,
              dominantType: channelSignals.emailNode.dominantType,
              dominantAngle: channelSignals.emailNode.dominantAngle,
              offerSharePct: channelSignals.emailNode.offerSharePct,
              espDetected: channelSignals.emailNode.espDetected,
            },
          });
        }
      }
    }

    if (showGoal && journeyGoal) {
      const slot = channelLayout.get(JOURNEY_GOAL_NODE_ID);
      if (slot) {
        nodes.push({
          id: JOURNEY_GOAL_NODE_ID,
          type: "goal-node",
          className: "rival-goal-node",
          position: { x: slot.x, y: slot.y },
          width: slot.width,
          height: slot.height,
          style: { width: slot.width, height: slot.height },
          draggable: false,
          selectable: true,
          data: {
            label: journeyGoal.label,
            confidence: journeyGoal.confidence,
            pathIntentBreakdown: journeyGoal.pathIntentBreakdown,
          },
        });
      }
    }

    return nodes;
  }, [
    useCellsLayout,
    platformRows,
    cellRows,
    maxAdCount,
    cellLayout,
    channelLayout,
    showChannels,
    channelSignals,
    showGoal,
    journeyGoal,
  ]);

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
  }, [runFit, initialNodes, allArrows.length]);

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.type === "organic-channel") {
        const d = node.data as OrganicChannelNodeData;
        onChannelNodeClick?.("organic", d.platform);
        return;
      }
      if (node.type === "email-channel") {
        onChannelNodeClick?.("email");
        return;
      }
      if (node.type === "goal-node") {
        onGoalNodeClick?.();
        return;
      }
      onNodeClick?.(node.id);
    },
    [onNodeClick, onChannelNodeClick, onGoalNodeClick],
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
        .rival-strategy-flow--static .react-flow__node {
          overflow: hidden;
          pointer-events: none !important;
          cursor: default !important;
        }
        .rival-strategy-flow--static .rival-funnel-arrow-dash {
          animation: none;
        }
        .rival-strategy-flow--static .rival-funnel-arrow-group {
          pointer-events: none !important;
        }
        .rival-strategy-flow .react-flow__node {
          overflow: hidden;
        }
        .rival-strategy-flow .react-flow__node.rival-goal-node {
          overflow: visible;
        }
      `}</style>
      <ReactFlow
        className={compact ? "rival-strategy-flow rival-strategy-flow--static" : "rival-strategy-flow"}
        nodes={nodes}
        edges={[]}
        onNodesChange={compact ? undefined : onNodesChange}
        nodeTypes={nodeTypes as never}
        onNodeClick={compact ? undefined : handleNodeClick}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={!compact}
        panOnDrag={!compact}
        panOnScroll={!compact}
        zoomOnScroll={!compact}
        zoomOnPinch={!compact}
        zoomOnDoubleClick={!compact}
        preventScrolling={!compact}
        minZoom={compact ? 0.02 : 0.28}
        maxZoom={compact ? 0.55 : 1.5}
        proOptions={{ hideAttribution: true }}
      >
        {useCellsLayout && allArrows.length > 0 ? (
          <FunnelArrowsLayer
            edges={[]}
            layout={mergedLayout}
            cells={cellRows.map((c) => ({
              id: c.id,
              platform: String(c.platform),
              funnelStage: c.funnelStage,
            }))}
            prebuiltArrows={allArrows}
            onEdgeHover={compact ? undefined : onEdgeHover}
          />
        ) : null}
        <Background variant={BackgroundVariant.Dots} gap={22} size={1.2} color="#cbd5e1" />
        {!compact ? (
          <Controls
            position="bottom-center"
            orientation="horizontal"
            showInteractive={false}
            className="!rounded-xl !border !border-slate-200/90 !bg-white/95 !shadow-lg"
          />
        ) : null}
      </ReactFlow>
    </>
  );
}

export function StrategyMapFlow(props: Props) {
  const {
    mapKey,
    map,
    channelSignals,
    journeyGoal,
    mapHeightClass = "h-[min(720px,82vh)]",
    compact = false,
    ...rest
  } = props;
  const safeMap = normalizeStrategyMapPayload(map);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasChannels = hasChannelSignals(channelSignals);
  const hasGoal = hasJourneyGoal(journeyGoal);

  return (
    <div className={compact ? "flex h-full min-h-0 w-full flex-col" : "w-full"}>
      <StrategyMapLegend showChannels={hasChannels} showGoal={hasGoal} compact={compact} />
      <div
        ref={containerRef}
        className={`w-full overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-br from-slate-50/90 via-white to-slate-100/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] ${
          compact ? "min-h-0 flex-1 pointer-events-none select-none touch-none" : mapHeightClass
        }`}
      >
        <ReactFlowProvider>
          <FlowInner
            key={mapKey}
            map={safeMap}
            channelSignals={channelSignals}
            journeyGoal={journeyGoal}
            fitContainerRef={containerRef}
            compact={compact}
            {...rest}
          />
        </ReactFlowProvider>
      </div>
    </div>
  );
}
