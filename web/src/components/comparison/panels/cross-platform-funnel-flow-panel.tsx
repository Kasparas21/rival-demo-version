"use client";

import { useId, useMemo } from "react";

import type { CompetitorStrategyOverviewPayload, FunnelStage, StrategyPlatform } from "@/lib/strategy-overview/payload-types";
import { ComparisonInsufficient, ComparisonPanelShell } from "@/components/comparison/panel-shell";
import { ComparisonPlatformIcon } from "@/components/comparison/platform-icon";

const STAGES: FunnelStage[] = ["TOF", "MOF", "BOF"];

type Props = {
  left: { name: string; payload: CompetitorStrategyOverviewPayload | null };
  right: { name: string; payload: CompetitorStrategyOverviewPayload | null };
};

function funnelStructureSignature(payload: CompetitorStrategyOverviewPayload): string {
  const rows = payload.map.platformNodes
    .map((n) => ({ p: n.platform, s: n.funnelStage }))
    .sort((x, y) => (x.p !== y.p ? x.p.localeCompare(y.p) : x.s.localeCompare(y.s)));
  return JSON.stringify(rows);
}

function patternsAreSimilar(
  left: CompetitorStrategyOverviewPayload | null,
  right: CompetitorStrategyOverviewPayload | null
): boolean {
  if (!left || !right) return false;
  return funnelStructureSignature(left) === funnelStructureSignature(right);
}

function stageColor(stage: FunnelStage): string {
  if (stage === "TOF") return "#3b82f6";
  if (stage === "MOF") return "#f59e0b";
  return "#10b981";
}

function stageYPercent(stage: FunnelStage): number {
  if (stage === "TOF") return 22;
  if (stage === "MOF") return 52;
  return 82;
}

function layoutNodeCenters(payload: CompetitorStrategyOverviewPayload): Map<
  StrategyPlatform,
  { x: number; y: number; stage: FunnelStage; adCount: number }
> {
  const m = new Map<StrategyPlatform, { x: number; y: number; stage: FunnelStage; adCount: number }>();
  const byStage: Record<FunnelStage, typeof payload.map.platformNodes> = { TOF: [], MOF: [], BOF: [] };
  for (const n of payload.map.platformNodes) {
    byStage[n.funnelStage].push(n);
  }
  for (const stage of STAGES) {
    const list = [...byStage[stage]].sort((a, b) => b.adCount - a.adCount);
    const n = list.length;
    list.forEach((node, i) => {
      const x = n <= 1 ? 50 : 14 + (i * 72) / Math.max(1, n - 1);
      m.set(node.platform, { x, y: stageYPercent(stage), stage, adCount: node.adCount });
    });
  }
  return m;
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function FunnelBrandDiagram({
  title,
  payload,
}: {
  title: string;
  payload: CompetitorStrategyOverviewPayload;
}) {
  const uid = useId().replace(/:/g, "");
  const markerId = `funnel-arr-${uid}`;
  const centers = useMemo(() => layoutNodeCenters(payload), [payload]);
  const stagesPresent = new Set(
    payload.insights.funnel_distribution.stages.filter((s) => s.adCount > 0).map((s) => s.stage)
  );

  const edges = payload.map.funnelEdges;

  const paths = useMemo(() => {
    const out: { d: string; opacity: number; key: string }[] = [];
    for (let i = 0; i < edges.length; i++) {
      const e = edges[i]!;
      const a = centers.get(e.from);
      const b = centers.get(e.to);
      if (!a || !b) continue;
      const x1 = a.x;
      const y1 = a.y;
      const x2 = b.x;
      const y2 = b.y;
      const mx = (x1 + x2) / 2;
      const d = `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
      out.push({ d, opacity: Math.max(0.35, Math.min(1, e.confidence)), key: `${e.from}-${e.to}-${i}` });
    }
    return out;
  }, [centers, edges]);

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white/50 p-3 relative">
      <p className="text-[11px] font-semibold text-slate-800 mb-2">{title}</p>
      <div className="grid grid-cols-[2.25rem_1fr] gap-1">
        <div className="flex flex-col justify-around py-2 text-[9px] font-bold text-right pr-1">
          {STAGES.map((stage) => (
            <div key={stage} style={{ color: stageColor(stage) }} className="leading-tight">
              {stage}
            </div>
          ))}
        </div>
        <div className="relative h-[280px] w-full rounded-lg border border-slate-100/80 bg-slate-50/30 overflow-hidden">
          <svg
            viewBox="0 0 100 100"
            className="absolute inset-0 w-full h-full pointer-events-none"
            preserveAspectRatio="none"
            aria-hidden
          >
            <defs>
              <marker id={markerId} markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
                <polygon points="0 0, 5 2.5, 0 5" fill="#94a3b8" />
              </marker>
            </defs>
            {paths.map((p) => (
              <path
                key={p.key}
                d={p.d}
                fill="none"
                stroke="#94a3b8"
                strokeWidth={0.65}
                opacity={p.opacity}
                markerEnd={`url(#${markerId})`}
              />
            ))}
          </svg>

          {STAGES.map((stage) => {
            const nodes = payload.map.platformNodes.filter((n) => n.funnelStage === stage);
            const missingLayer = stagesPresent.size > 0 && !stagesPresent.has(stage);
            const y = stageYPercent(stage);
            if (missingLayer) {
              return (
                <div
                  key={stage}
                  className="absolute left-[8%] right-[8%] h-[22%] rounded-lg border border-dashed border-red-300 bg-red-50/50 flex items-center justify-center pointer-events-none"
                  style={{ top: `calc(${y}% - 11%)` }}
                >
                  <p className="text-[9px] font-semibold text-red-800">Missing handoff layer</p>
                </div>
              );
            }
            return nodes.map((n) => {
              const pos = centers.get(n.platform);
              if (!pos) return null;
              return (
                <div
                  key={`${stage}-${n.platform}`}
                  className="absolute z-10"
                  style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: "translate(-50%, -50%)" }}
                >
                  <div className="relative inline-flex flex-col items-center">
                    <span className="absolute -top-2 -right-1 min-w-[18px] rounded-full bg-slate-800 px-1 py-0.5 text-[7px] font-bold text-white tabular-nums text-center z-20">
                      {formatCount(n.adCount)}
                    </span>
                    <div className="rounded-xl border border-slate-200/90 bg-white p-2 shadow-sm">
                      <ComparisonPlatformIcon platform={n.platform} className="h-8 w-8" />
                    </div>
                  </div>
                </div>
              );
            });
          })}
        </div>
      </div>
      {payload.map.funnelEdges.length > 0 ? (
        <p className="mt-2 text-[8px] text-slate-500 text-center">
          Inferred from angle overlap and stage classification.
        </p>
      ) : null}
    </div>
  );
}

export function CrossPlatformFunnelFlowPanel({ left, right }: Props) {
  const hasData = Boolean(left.payload || right.payload);

  return (
    <ComparisonPanelShell
      title="Cross-platform funnel flow"
      subtitle="Platforms by funnel stage and overlap handoffs"
      tooltip="Stages come from enriched funnel_stage per platform. Edges are heuristic overlaps from strategy derivation."
    >
      {!hasData ? (
        <ComparisonInsufficient message="Funnel flow needs at least one strategy payload." />
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:divide-x lg:divide-slate-200/80 lg:gap-0">
            <div className="lg:pr-4">
              {left.payload ? (
                <FunnelBrandDiagram title={left.name} payload={left.payload} />
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 p-4 text-[11px] text-slate-400">
                  {left.name} — no data
                </div>
              )}
            </div>
            <div className="lg:pl-4">
              {right.payload ? (
                <FunnelBrandDiagram title={right.name} payload={right.payload} />
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 p-4 text-[11px] text-slate-400">
                  {right.name} — no data
                </div>
              )}
            </div>
          </div>
          {patternsAreSimilar(left.payload, right.payload) ? (
            <p className="text-[10px] text-slate-500 text-center leading-snug px-1">
              Both brands show similar funnel patterns — see Angle Clustering for content-level differences.
            </p>
          ) : null}
        </div>
      )}
    </ComparisonPanelShell>
  );
}
