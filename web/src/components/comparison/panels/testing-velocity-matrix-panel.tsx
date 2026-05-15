"use client";

import { useId, useMemo } from "react";
import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { Line, LineChart, ResponsiveContainer } from "recharts";

import type {
  CompetitorStrategyOverviewPayload,
  SpendTrendByPlatformInsight,
  StrategyPlatform,
} from "@/lib/strategy-overview/payload-types";
import { COMPARISON_PLATFORM_ORDER, ComparisonPlatformIcon } from "@/components/comparison/platform-icon";
import { ComparisonInsufficient, ComparisonPanelShell } from "@/components/comparison/panel-shell";

type Props = {
  left: { name: string; payload: CompetitorStrategyOverviewPayload | null };
  right: { name: string; payload: CompetitorStrategyOverviewPayload | null };
};

function trendByPlatform(rows: SpendTrendByPlatformInsight[] | undefined): Map<StrategyPlatform, number[]> {
  const m = new Map<StrategyPlatform, number[]>();
  for (const r of rows ?? []) {
    m.set(r.platform, r.weekBuckets.slice(-7));
  }
  return m;
}

function gaugeGradient(testRate: number): { stroke: string; from: string; to: string } {
  const p = testRate * 100;
  if (p < 40) return { stroke: "#ef4444", from: "#fecaca", to: "#ef4444" };
  if (p < 70) return { stroke: "#eab308", from: "#fde047", to: "#ca8a04" };
  return { stroke: "#22c55e", from: "#bbf7d0", to: "#16a34a" };
}

function VelocityGauge({ rate, label }: { rate: number; label: string }) {
  const gid = useId().replace(/:/g, "");
  const pct = Math.min(100, Math.max(0, rate * 100));
  const { stroke, from, to } = gaugeGradient(rate);
  const r = 18;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;
  return (
    <div className="flex flex-col items-center gap-0.5">
      <svg width="52" height="52" viewBox="0 0 52 52" className="shrink-0">
        <defs>
          <linearGradient id={`vg-${gid}-${label}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={from} />
            <stop offset="100%" stopColor={to} />
          </linearGradient>
        </defs>
        <circle cx="26" cy="26" r={r} fill="none" stroke="#f1f5f9" strokeWidth="6" />
        <circle
          cx="26"
          cy="26"
          r={r}
          fill="none"
          stroke={`url(#vg-${gid}-${label})`}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          transform="rotate(-90 26 26)"
        />
      </svg>
      <span className="text-[9px] font-bold tabular-nums" style={{ color: stroke }}>
        {pct.toFixed(0)}%
      </span>
    </div>
  );
}

function modePill(testRate: number, avgLife: number): { label: string; className: string } {
  if (testRate >= 0.3) {
    return { label: "Testing", className: "bg-emerald-100 text-emerald-800 border border-emerald-200/80" };
  }
  if (testRate < 0.1) {
    return { label: "Dormant", className: "bg-slate-100 text-slate-600 border border-slate-200/80" };
  }
  if (avgLife > 30) {
    return { label: "Harvesting", className: "bg-amber-100 text-amber-900 border border-amber-200/80" };
  }
  return { label: "Harvesting", className: "bg-amber-100 text-amber-900 border border-amber-200/80" };
}

function MiniTrend({ buckets }: { buckets: number[] | undefined }) {
  const pts = (buckets ?? []).map((y, i) => ({ i, y }));
  if (pts.length < 2) {
    return <div className="h-7 w-full rounded bg-slate-100/80" />;
  }
  const first = pts[0]!.y;
  const last = pts[pts.length - 1]!.y;
  const dir = last - first;
  const Arrow =
    dir > 8 ? ArrowUpRight : dir < -8 ? ArrowDownRight : ArrowRight;
  return (
    <div className="flex items-center gap-1">
      <Arrow className="h-3 w-3 shrink-0 text-slate-500" aria-hidden />
      <div className="h-7 flex-1 min-w-[48px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={pts} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
            <Line type="monotone" dataKey="y" stroke="#64748b" strokeWidth={1.2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function TestingVelocityMatrixPanel({ left, right }: Props) {
  const lRows = left.payload?.insights?.testing_velocity_by_platform ?? [];
  const rRows = right.payload?.insights?.testing_velocity_by_platform ?? [];
  const leftTrend = trendByPlatform(left.payload?.insights?.spend_trend_by_platform);
  const rightTrend = trendByPlatform(right.payload?.insights?.spend_trend_by_platform);

  const caption = useMemo(() => {
    let maxRatio = 0;
    let pick: { pl: StrategyPlatform; a: number; b: number; faster: "left" | "right" } | null = null;
    for (const pl of COMPARISON_PLATFORM_ORDER) {
      const lu = lRows.find((r) => r.platform === pl);
      const ru = rRows.find((r) => r.platform === pl);
      if (!lu || !ru || lu.testRate <= 0 || ru.testRate <= 0) continue;
      const rl = ru.testRate / lu.testRate;
      const lr = lu.testRate / ru.testRate;
      if (rl > maxRatio && rl >= 1.25) {
        maxRatio = rl;
        pick = { pl, a: ru.testRate, b: lu.testRate, faster: "right" };
      } else if (lr > maxRatio && lr >= 1.25) {
        maxRatio = lr;
        pick = { pl, a: lu.testRate, b: ru.testRate, faster: "left" };
      }
    }
    if (!pick || maxRatio < 1.25) return null;
    const fasterName = pick.faster === "left" ? left.name : right.name;
    const slowerName = pick.faster === "left" ? right.name : left.name;
    return `${fasterName} is testing ~${maxRatio.toFixed(1)}× faster on ${pick.pl} than ${slowerName}.`;
  }, [lRows, rRows, left.name, right.name]);

  const platforms = new Set<string>([...lRows.map((r) => r.platform), ...rRows.map((r) => r.platform)]);

  if (platforms.size === 0) {
    return (
      <ComparisonPanelShell
        title="Testing velocity matrix"
        subtitle="New ads in 30d ÷ active ads, plus average lifespan"
        tooltip="Test rate uses launch date when present, else first_seen. Higher rate = more creative churn."
      >
        <ComparisonInsufficient message="No per-platform velocity data yet — run a fresh strategy recompute." />
      </ComparisonPanelShell>
    );
  }

  return (
    <ComparisonPanelShell
      title="Testing velocity matrix"
      subtitle="New ads in 30d ÷ active ads, plus average lifespan"
      tooltip="Modes: Testing (≥30% new in 30d), Harvesting (mid band or long life), Dormant (&lt;10%)."
    >
      <div className="space-y-3">
        <div className="overflow-x-auto rounded-lg border border-slate-100/90">
          <table className="w-full text-[9px] text-left border-collapse min-w-[560px]">
            <thead>
              <tr className="border-b border-slate-200 bg-white/60">
                <th className="py-2 px-2 font-semibold text-slate-800 w-[100px]">Platform</th>
                <th className="py-2 px-1 font-semibold text-[#3B82F6] text-center border-r border-dotted border-slate-200/80" colSpan={4}>
                  {left.name}
                </th>
                <th className="py-2 px-1 font-semibold text-[#F97316] text-center" colSpan={4}>
                  {right.name}
                </th>
              </tr>
              <tr className="border-b border-slate-100 text-slate-500 bg-slate-50/50">
                <th />
                <th className="py-1 font-medium">Test</th>
                <th className="py-1 font-medium">Life</th>
                <th className="py-1 font-medium">Mode</th>
                <th className="py-1 font-medium border-r border-dotted border-slate-200/80">7w</th>
                <th className="py-1 font-medium">Test</th>
                <th className="py-1 font-medium">Life</th>
                <th className="py-1 font-medium">Mode</th>
                <th className="py-1 font-medium">7w</th>
              </tr>
            </thead>
            <tbody>
              {[...platforms].sort().map((pl) => {
                const lu = lRows.find((r) => r.platform === pl);
                const ru = rRows.find((r) => r.platform === pl);
                const lm = lu ? modePill(lu.testRate, lu.avgLifespanDays) : null;
                const rm = ru ? modePill(ru.testRate, ru.avgLifespanDays) : null;
                const maxLife = Math.max(lu?.avgLifespanDays ?? 0, ru?.avgLifespanDays ?? 0, 1);
                return (
                  <tr key={pl} className="border-b border-slate-100/90 align-middle bg-white/40">
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-1.5 capitalize font-medium text-slate-800">
                        <ComparisonPlatformIcon platform={pl as StrategyPlatform} className="h-6 w-6" />
                        {pl}
                      </div>
                    </td>
                    <td className="py-2 px-1 text-center border-r-0">
                      {lu ? <VelocityGauge rate={lu.testRate} label={`L-${pl}`} /> : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="py-2 px-1">
                      {lu ? (
                        <div className="flex items-center gap-1">
                          <div className="flex-1 h-[3px] rounded-full bg-slate-200 overflow-hidden min-w-[40px]">
                            <div
                              className="h-full rounded-full bg-[#3B82F6]"
                              style={{ width: `${Math.min(100, (lu.avgLifespanDays / Math.max(maxLife, 200)) * 100)}%` }}
                            />
                          </div>
                          <span className="tabular-nums text-slate-600 shrink-0">{lu.avgLifespanDays}d</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-2 px-1">
                      {lm ? (
                        <span className={`inline-block rounded-full px-2 py-0.5 text-[8px] font-semibold ${lm.className}`}>
                          {lm.label}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-2 px-1 border-r border-dotted border-slate-200/80">
                      <MiniTrend buckets={leftTrend.get(pl as StrategyPlatform)} />
                    </td>
                    <td className="py-2 px-1 text-center">
                      {ru ? <VelocityGauge rate={ru.testRate} label={`R-${pl}`} /> : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="py-2 px-1">
                      {ru ? (
                        <div className="flex items-center gap-1">
                          <div className="flex-1 h-[3px] rounded-full bg-slate-200 overflow-hidden min-w-[40px]">
                            <div
                              className="h-full rounded-full bg-[#F97316]"
                              style={{ width: `${Math.min(100, (ru.avgLifespanDays / Math.max(maxLife, 200)) * 100)}%` }}
                            />
                          </div>
                          <span className="tabular-nums text-slate-600 shrink-0">{ru.avgLifespanDays}d</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-2 px-1">
                      {rm ? (
                        <span className={`inline-block rounded-full px-2 py-0.5 text-[8px] font-semibold ${rm.className}`}>
                          {rm.label}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-2 px-1">
                      <MiniTrend buckets={rightTrend.get(pl as StrategyPlatform)} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {caption ? (
          <p className="text-[10px] text-slate-600 text-center leading-snug">{caption}</p>
        ) : null}
      </div>
    </ComparisonPanelShell>
  );
}
