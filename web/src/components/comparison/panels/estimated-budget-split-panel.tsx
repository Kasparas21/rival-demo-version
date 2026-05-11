"use client";

import { useMemo } from "react";
import { ArrowDown, ArrowRight, ArrowUp } from "lucide-react";
import { Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer } from "recharts";

import type {
  BudgetAllocationCard,
  CompetitorStrategyOverviewPayload,
  SpendTrendByPlatformInsight,
  StrategyPlatform,
} from "@/lib/strategy-overview/payload-types";
import { COMPARISON_PLATFORM_ORDER, ComparisonPlatformIcon } from "@/components/comparison/platform-icon";
import { ComparisonInsufficient, ComparisonPanelShell } from "@/components/comparison/panel-shell";

const COLORS = ["#1877F2", "#4285F4", "#FF0050", "#0A66C2", "#E60023", "#FFFC00"];

type BudgetSegment = BudgetAllocationCard["segments"][number];

type Props = {
  left: { name: string; payload: CompetitorStrategyOverviewPayload | null };
  right: { name: string; payload: CompetitorStrategyOverviewPayload | null };
};

function findLargestSpendDelta(
  left: BudgetSegment[],
  right: BudgetSegment[]
): { platform: StrategyPlatform; ratio: number; label: string } | null {
  let best: { platform: StrategyPlatform; ratio: number } | null = null;
  for (const segment of right) {
    const leftMatch = left.find((s) => s.platform === segment.platform);
    const leftSpend = leftMatch?.estSpendEur ?? 0;
    if (leftSpend > 0) {
      const ratio = segment.estSpendEur / leftSpend;
      if (ratio >= 1.3 && (!best || ratio > best.ratio)) {
        best = { platform: segment.platform, ratio };
      }
    } else if (segment.estSpendEur > 0) {
      if (!best || best.ratio < 999) {
        best = { platform: segment.platform, ratio: Infinity };
      }
    }
  }
  if (!best || best.ratio < 1.3) return null;
  const label =
    best.ratio === Infinity
      ? `${best.platform} active vs none`
      : `${best.ratio.toFixed(1)}× more on ${best.platform}`;
  return { platform: best.platform, ratio: best.ratio, label };
}

function trendMap(rows: SpendTrendByPlatformInsight[] | undefined): Map<StrategyPlatform, SpendTrendByPlatformInsight> {
  const m = new Map<StrategyPlatform, SpendTrendByPlatformInsight>();
  for (const r of rows ?? []) {
    m.set(r.platform, r);
  }
  return m;
}

function DonutBlock({
  brandName,
  payload,
}: {
  brandName: string;
  payload: CompetitorStrategyOverviewPayload | null;
}) {
  const data = useMemo(() => {
    if (!payload) return [];
    return payload.insights.budget_allocation.segments.map((s) => ({
      name: s.label,
      value: s.pct,
      platform: s.platform,
    }));
  }, [payload]);

  if (!payload || data.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-[11px] text-slate-400 border border-dashed border-slate-200/90 rounded-xl bg-white/40">
        No spend split
      </div>
    );
  }

  const total = payload.insights.budget_allocation.totalEstSpendEur;

  return (
    <div className="flex flex-col items-center">
      <p className="text-[12px] font-semibold text-slate-800 mb-2 w-full text-center">{brandName}</p>
      <div className="h-[220px] w-full max-w-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={62}
              outerRadius={88}
              paddingAngle={2}
              dataKey="value"
              nameKey="name"
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <p className="-mt-4 text-[18px] font-bold text-slate-900 tabular-nums text-center">
        €{total.toLocaleString()}
        <span className="block font-sans text-[10px] font-normal text-slate-500">/ mo est.</span>
      </p>
    </div>
  );
}

function SpendTrendSpark({ row }: { row: SpendTrendByPlatformInsight | undefined }) {
  const pts = (row?.weekBuckets ?? []).slice(-7);
  const chartData = pts.map((y, i) => ({ i, y }));
  if (!row || chartData.length === 0) {
    return <div className="h-8 w-full rounded bg-slate-100/80" />;
  }
  return (
    <div className="h-8 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <Line type="monotone" dataKey="y" stroke="#64748b" strokeWidth={1.25} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function EstimatedBudgetSplitPanel({ left, right }: Props) {
  const deltaLine = useMemo(() => {
    const l = left.payload?.insights.budget_allocation.segments ?? [];
    const r = right.payload?.insights.budget_allocation.segments ?? [];
    if (l.length === 0 || r.length === 0) return null;
    return findLargestSpendDelta(l, r);
  }, [left.payload, right.payload]);

  const leftTrend = trendMap(left.payload?.insights.spend_trend_by_platform);
  const rightTrend = trendMap(right.payload?.insights.spend_trend_by_platform);

  const legendSegments = useMemo(() => {
    const set = new Set<StrategyPlatform>();
    for (const s of left.payload?.insights.budget_allocation.segments ?? []) set.add(s.platform);
    for (const s of right.payload?.insights.budget_allocation.segments ?? []) set.add(s.platform);
    return COMPARISON_PLATFORM_ORDER.filter((p) => set.has(p));
  }, [left.payload, right.payload]);

  const DirectionGlyph = ({ d }: { d: "up" | "down" | "flat" }) => {
    if (d === "up") return <ArrowUp className="h-3 w-3 text-emerald-600" aria-hidden />;
    if (d === "down") return <ArrowDown className="h-3 w-3 text-red-600" aria-hidden />;
    return <ArrowRight className="h-3 w-3 text-slate-400" aria-hidden />;
  };

  return (
    <ComparisonPanelShell
      title="Estimated budget split"
      subtitle="Modeled monthly spend share by platform"
      tooltip={left.payload?.insights.budget_allocation.tooltip ?? "Estimated spend share."}
    >
      {!left.payload && !right.payload ? (
        <ComparisonInsufficient message="Budget comparison needs strategy payloads for both brands." />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-3 items-center">
            <DonutBlock brandName={left.name} payload={left.payload} />
            <div className="flex flex-col items-center justify-center py-2 px-1 min-h-[100px]">
              {deltaLine ? (
                <>
                  <ArrowUp className="h-6 w-6 text-red-500 rotate-180 mb-1" aria-hidden />
                  <p className="text-center font-sans text-[10px] font-semibold text-slate-800 leading-tight max-w-[100px]">
                    {deltaLine.label}
                  </p>
                </>
              ) : (
                <p className="text-[10px] text-slate-400 text-center">Similar mix</p>
              )}
            </div>
            <DonutBlock brandName={right.name} payload={right.payload} />
          </div>

          {legendSegments.length > 0 ? (
            <div className="flex flex-wrap justify-center gap-3 border-t border-slate-100 pt-3">
              {legendSegments.map((pl, i) => (
                <div key={pl} className="inline-flex items-center gap-1.5 text-[9px] text-slate-600 capitalize">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  {pl}
                </div>
              ))}
            </div>
          ) : null}

          <div>
            <p className="text-[12px] font-semibold text-slate-800 mb-2">
              Spend trend (last ~90 days)
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500 mb-2">{left.name}</p>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {COMPARISON_PLATFORM_ORDER.map((pl) => {
                    const row = leftTrend.get(pl);
                    const active = (left.payload?.insights.budget_allocation.segments ?? []).some(
                      (s) => s.platform === pl && s.adCount > 0
                    );
                    return (
                      <div
                        key={pl}
                        className={`rounded-lg border border-slate-100/90 p-1.5 ${
                          active ? "bg-white/80" : "bg-slate-50/60 opacity-50"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-0.5 mb-1">
                          <ComparisonPlatformIcon platform={pl} className="h-4 w-4" />
                          <DirectionGlyph d={row?.direction ?? "flat"} />
                        </div>
                        <SpendTrendSpark row={row} />
                      </div>
                    );
                  })}
                </div>
              </div>
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500 mb-2">{right.name}</p>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {COMPARISON_PLATFORM_ORDER.map((pl) => {
                    const row = rightTrend.get(pl);
                    const active = (right.payload?.insights.budget_allocation.segments ?? []).some(
                      (s) => s.platform === pl && s.adCount > 0
                    );
                    return (
                      <div
                        key={pl}
                        className={`rounded-lg border border-slate-100/90 p-1.5 ${
                          active ? "bg-white/80" : "bg-slate-50/60 opacity-50"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-0.5 mb-1">
                          <ComparisonPlatformIcon platform={pl} className="h-4 w-4" />
                          <DirectionGlyph d={row?.direction ?? "flat"} />
                        </div>
                        <SpendTrendSpark row={row} />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </ComparisonPanelShell>
  );
}
