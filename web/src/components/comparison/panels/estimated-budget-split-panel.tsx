"use client";

import { useMemo } from "react";
import { ArrowDown, ArrowRight, ArrowUp } from "lucide-react";
import { Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer } from "recharts";

import type { CompetitorStrategyOverviewPayload, SpendTrendByPlatformInsight, StrategyPlatform } from "@/lib/strategy-overview/payload-types";
import { COMPARISON_PLATFORM_ORDER, ComparisonPlatformIcon } from "@/components/comparison/platform-icon";
import { ComparisonInsufficient, ComparisonPanelShell } from "@/components/comparison/panel-shell";

const PLATFORM_COLORS: Record<StrategyPlatform, string> = {
  meta: "#1877F2",
  google: "#4285F4",
  tiktok: "#FF0050",
  linkedin: "#0A66C2",
  pinterest: "#E60023",
  snapchat: "#FFD60A",
};

type Props = {
  left: { name: string; payload: CompetitorStrategyOverviewPayload | null };
  right: { name: string; payload: CompetitorStrategyOverviewPayload | null };
};

type DonutSeg = { name: string; pct: number; platform: StrategyPlatform };

function segmentsFromPayload(payload: CompetitorStrategyOverviewPayload | null): DonutSeg[] {
  if (!payload) return [];
  return payload.insights.budget_allocation.segments.map((s) => ({
    name: s.label,
    pct: s.pct,
    platform: s.platform,
  }));
}

function computeShareComparison(
  leftSegments: DonutSeg[],
  rightSegments: DonutSeg[],
  leftBrandName: string,
  rightBrandName: string,
): { label: string; detail: string | null } {
  let biggestDiff: { platform: StrategyPlatform; ratio: number; leftPct: number; rightPct: number } | null = null;

  for (const pl of COMPARISON_PLATFORM_ORDER) {
    const leftPct = leftSegments.find((s) => s.platform === pl)?.pct ?? 0;
    const rightPct = rightSegments.find((s) => s.platform === pl)?.pct ?? 0;

    if (leftPct < 5 && rightPct < 5) continue;

    const maxPct = Math.max(leftPct, rightPct);
    const minPct = Math.max(Math.min(leftPct, rightPct), 1);
    const ratio = maxPct / minPct;

    if (!biggestDiff || ratio > biggestDiff.ratio) {
      biggestDiff = { platform: pl, ratio, leftPct, rightPct };
    }
  }

  if (!biggestDiff || biggestDiff.ratio < 1.5) {
    return { label: "Similar mix", detail: null };
  }

  const higherSide =
    biggestDiff.leftPct > biggestDiff.rightPct
      ? leftBrandName
      : biggestDiff.rightPct > biggestDiff.leftPct
        ? rightBrandName
        : null;

  const platformName = biggestDiff.platform.charAt(0).toUpperCase() + biggestDiff.platform.slice(1);

  return {
    label: `${biggestDiff.ratio.toFixed(1)}× more on ${platformName}`,
    detail: higherSide,
  };
}

function trendMap(rows: SpendTrendByPlatformInsight[] | undefined): Map<StrategyPlatform, SpendTrendByPlatformInsight> {
  const m = new Map<StrategyPlatform, SpendTrendByPlatformInsight>();
  for (const r of rows ?? []) {
    m.set(r.platform, r);
  }
  return m;
}

function BudgetDonutSlot({ brandName, segments, totalEur }: { brandName: string; segments: DonutSeg[]; totalEur: number }) {
  const hasChart = segments.length > 0;

  return (
    <div className="flex min-w-0 flex-col items-center">
      <p className="mb-1.5 max-w-full truncate text-center text-[10px] font-semibold uppercase tracking-wide text-slate-700">
        {brandName}
      </p>
      <div className="relative mx-auto" style={{ width: 110, height: 110 }}>
        {hasChart ? (
          <>
            <PieChart width={110} height={110}>
              <Pie
                data={segments}
                cx={55}
                cy={55}
                innerRadius={35}
                outerRadius={52}
                paddingAngle={2}
                dataKey="pct"
                nameKey="name"
                stroke="none"
              >
                {segments.map((segment) => (
                  <Cell key={segment.platform} fill={PLATFORM_COLORS[segment.platform] ?? "#94A3B8"} />
                ))}
              </Pie>
            </PieChart>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[11px] font-bold leading-tight text-slate-900 tabular-nums">
                €{totalEur.toLocaleString()}
              </span>
              <span className="text-[8px] leading-tight text-slate-500">/mo</span>
            </div>
          </>
        ) : (
          <div className="flex size-full items-center justify-center rounded-xl border border-dashed border-slate-200/90 bg-white/40 text-[9px] text-slate-400">
            No spend split
          </div>
        )}
      </div>
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
  const leftSegments = useMemo(() => segmentsFromPayload(left.payload), [left.payload]);
  const rightSegments = useMemo(() => segmentsFromPayload(right.payload), [right.payload]);

  const { label: comparisonLabel, detail: comparisonDetail } = useMemo(
    () =>
      computeShareComparison(leftSegments, rightSegments, left.name, right.name),
    [leftSegments, rightSegments, left.name, right.name],
  );

  const leftTotalEur = left.payload?.insights.budget_allocation.totalEstSpendEur ?? 0;
  const rightTotalEur = right.payload?.insights.budget_allocation.totalEstSpendEur ?? 0;

  const leftTrend = trendMap(left.payload?.insights.spend_trend_by_platform);
  const rightTrend = trendMap(right.payload?.insights.spend_trend_by_platform);

  const visiblePlatforms = useMemo(() => {
    return COMPARISON_PLATFORM_ORDER.filter((pl) => {
      const leftHas = (leftSegments.find((s) => s.platform === pl)?.pct ?? 0) > 0;
      const rightHas = (rightSegments.find((s) => s.platform === pl)?.pct ?? 0) > 0;
      return leftHas || rightHas;
    });
  }, [leftSegments, rightSegments]);

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
        <div className="flex flex-col gap-3">
          <div className="grid min-w-0 grid-cols-2 gap-3">
            <div className="min-w-0">
              <BudgetDonutSlot brandName={left.name} segments={leftSegments} totalEur={leftTotalEur} />
            </div>
            <div className="min-w-0">
              <BudgetDonutSlot brandName={right.name} segments={rightSegments} totalEur={rightTotalEur} />
            </div>
          </div>

          <div className="flex flex-col items-center justify-center pt-1">
            <span className="text-center text-[11px] font-medium text-slate-600">{comparisonLabel}</span>
            {comparisonDetail ? (
              <span className="mt-0.5 text-center text-[9px] leading-snug text-slate-500">{comparisonDetail}</span>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 border-t border-slate-100 pt-3">
            {visiblePlatforms.map((platform) => (
              <div key={platform} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PLATFORM_COLORS[platform] }} />
                <span className="text-[10px] capitalize text-slate-600">{platform}</span>
              </div>
            ))}
          </div>

          <div>
            <p className="mb-2 text-[12px] font-semibold text-slate-800">Spend trend (last ~90 days)</p>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div>
                <p className="mb-2 text-[9px] font-semibold uppercase tracking-wider text-slate-500">{left.name}</p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {COMPARISON_PLATFORM_ORDER.map((pl) => {
                    const row = leftTrend.get(pl);
                    const active = (left.payload?.insights.budget_allocation.segments ?? []).some(
                      (s) => s.platform === pl && s.adCount > 0,
                    );
                    return (
                      <div
                        key={pl}
                        className={`rounded-lg border border-slate-100/90 p-1.5 ${
                          active ? "bg-white/80" : "bg-slate-50/60 opacity-50"
                        }`}
                      >
                        <div className="mb-1 flex items-center justify-between gap-0.5">
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
                <p className="mb-2 text-[9px] font-semibold uppercase tracking-wider text-slate-500">{right.name}</p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {COMPARISON_PLATFORM_ORDER.map((pl) => {
                    const row = rightTrend.get(pl);
                    const active = (right.payload?.insights.budget_allocation.segments ?? []).some(
                      (s) => s.platform === pl && s.adCount > 0,
                    );
                    return (
                      <div
                        key={pl}
                        className={`rounded-lg border border-slate-100/90 p-1.5 ${
                          active ? "bg-white/80" : "bg-slate-50/60 opacity-50"
                        }`}
                      >
                        <div className="mb-1 flex items-center justify-between gap-0.5">
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
