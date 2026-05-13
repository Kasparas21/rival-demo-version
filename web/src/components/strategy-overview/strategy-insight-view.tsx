"use client";

import { useMemo } from "react";
import {
  Pie,
  PieChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import { AlertTriangle, BarChart3, Info, Layers } from "lucide-react";

import type { InsightCardsPayload } from "@/lib/strategy-overview/payload-types";
import { useStrategyOverviewUi } from "@/lib/strategy-overview/strategy-overview-store";

type Props = {
  insights: InsightCardsPayload;
  selectedPlatform: string | null;
};

const COLORS = ["#3b82f6", "#f59e0b", "#10b981", "#a855f7", "#64748b", "#ec4899", "#06b6d4"];

function StageColor(stage: string): string {
  const u = stage.toUpperCase();
  if (u === "TOF" || u.includes("TOF")) return "#3b82f6";
  if (u === "MOF" || u.includes("MOF")) return "#f59e0b";
  if (u === "BOF" || u.includes("BOF")) return "#10b981";
  return "#94a3b8";
}

function formatMonthYm(ym: string): string {
  const [ys, ms] = ym.split("-");
  const y = Number(ys);
  const m = Number(ms);
  if (!Number.isFinite(y) || !Number.isFinite(m)) return ym;
  const d = new Date(y, m - 1, 1);
  return d.toLocaleString("en-US", { month: "short", year: "2-digit" });
}

function fmtEurRange(low: number, high: number): string {
  const a = Math.round(low);
  const b = Math.round(high);
  return `${a.toLocaleString()}–${b.toLocaleString()}`;
}

function CardShell({
  title,
  subtitle,
  tooltip,
  children,
  narrative,
}: {
  title: string;
  subtitle?: string;
  tooltip: string;
  children: React.ReactNode;
  narrative?: string | null;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)] flex flex-col min-h-[200px] hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{title}</p>
          {subtitle ? (
            <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">{subtitle}</p>
          ) : null}
        </div>
        <span className="shrink-0 cursor-help text-slate-400" title={tooltip}>
          <Info className="h-3.5 w-3.5" aria-hidden />
        </span>
      </div>
      <div className="flex-1 min-h-0">{children}</div>
      {narrative?.trim() ? (
        <div className="mt-3 pt-2 border-t border-slate-100 flex gap-1.5 items-start">
          <Info className="h-3.5 w-3.5 shrink-0 text-slate-400 mt-0.5" aria-hidden />
          <p className="text-[10px] text-slate-500 leading-snug">{narrative}</p>
        </div>
      ) : null}
    </div>
  );
}

function InsufficientPlaceholder({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-slate-400">
      <AlertTriangle className="h-8 w-8 opacity-60" aria-hidden />
      <p className="text-[11px] leading-snug max-w-[220px]">{message}</p>
    </div>
  );
}

function FunnelDistributionVisual({
  stages,
}: {
  stages: InsightCardsPayload["funnel_distribution"]["stages"];
}) {
  return (
    <div className="flex flex-col gap-3 py-1">
      {stages.map((s) => (
        <div key={s.stage}>
          <div className="flex justify-between gap-2 text-[11px] text-slate-700 mb-1">
            <span className="font-semibold" style={{ color: StageColor(s.stage) }}>
              {s.stage}
            </span>
            <span className="tabular-nums text-slate-600">
              {s.sharePct}% · {s.adCount} ads
            </span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(100, s.sharePct)}%`,
                background: `linear-gradient(90deg, ${StageColor(s.stage)}cc, ${StageColor(s.stage)})`,
              }}
            />
          </div>
          {s.platforms.length > 0 ? (
            <p className="text-[9px] text-slate-500 mt-0.5">{s.platforms.join(" · ")}</p>
          ) : null}
          {s.exampleSnippet ? (
            <p className="text-[9px] text-slate-400 mt-0.5 line-clamp-2 italic">&ldquo;{s.exampleSnippet}…&rdquo;</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function StrategyInsightView({ insights, selectedPlatform }: Props) {
  const selectedAngle = useStrategyOverviewUi((s) => s.selectedAngle);
  const setSelectedAngle = useStrategyOverviewUi((s) => s.setSelectedAngle);

  const budgetData = useMemo(() => {
    return insights.budget_allocation.segments.map((s) => ({
      name: s.label,
      value: s.pct,
      platform: s.platform,
    }));
  }, [insights.budget_allocation.segments]);

  const dim = (platform: string) => Boolean(selectedPlatform && selectedPlatform !== platform);

  const timelineData = useMemo(
    () =>
      insights.library_activity_timeline.months.map((row) => ({
        label: formatMonthYm(row.month),
        launch: row.launchCount,
        detection: row.detectionCount,
      })),
    [insights.library_activity_timeline.months]
  );

  const competitorTone = insights.voice_tone_position.competitor;
  const userPt = insights.voice_tone_position.userBrand;

  const dq = insights.library_activity_timeline.dataQuality;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <CardShell
          title={insights.platform_footprint.title}
          subtitle={insights.platform_footprint.subtitle}
          tooltip={insights.platform_footprint.tooltip}
          narrative={insights.platform_footprint.aiNarrative}
        >
          {insights.platform_footprint.platforms.length === 0 ? (
            <InsufficientPlaceholder message="No platform footprint — run a scrape with ads first." />
          ) : (
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-left text-slate-400 border-b border-slate-100">
                    <th className="pb-1.5 font-medium pr-2">Platform</th>
                    <th className="pb-1.5 font-medium pr-2 tabular-nums">Ads</th>
                    <th className="pb-1.5 font-medium pr-2">Stage</th>
                    <th className="pb-1.5 font-medium tabular-nums">Modeled €/mo (range)</th>
                    <th className="pb-1.5 font-medium tabular-nums text-right">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {insights.platform_footprint.platforms.map((row) => (
                    <tr
                      key={row.platform}
                      className={`border-b border-slate-50 ${dim(row.platform) ? "opacity-35" : ""}`}
                    >
                      <td className="py-1.5 pr-2 text-slate-800">{row.label}</td>
                      <td className="py-1.5 pr-2 text-slate-600 tabular-nums">{row.activeAds}</td>
                      <td className="py-1.5 pr-2 text-slate-500">{row.funnelStage}</td>
                      <td className="py-1.5 pr-2 text-slate-600 tabular-nums">
                        {fmtEurRange(
                          row.estSpendEurLow ?? row.estSpendEur,
                          row.estSpendEurHigh ?? row.estSpendEur
                        )}
                      </td>
                      <td className="py-1.5 text-slate-600 tabular-nums text-right">{row.spendShare}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-[9px] text-slate-500 mt-2">
                Total {insights.platform_footprint.totalActiveAds} active ads · modeled monthly range ca. €
                {fmtEurRange(
                  insights.platform_footprint.totalEstSpendEurLow ?? insights.platform_footprint.totalEstSpendEur,
                  insights.platform_footprint.totalEstSpendEurHigh ?? insights.platform_footprint.totalEstSpendEur
                )}
                /mo combined (benchmarks; not platform-disclosed spend)
              </p>
            </div>
          )}
        </CardShell>

        <CardShell
          title={insights.budget_allocation.title}
          subtitle={insights.budget_allocation.subtitle}
          tooltip={insights.budget_allocation.tooltip}
          narrative={insights.budget_allocation.aiNarrative}
        >
          {insights.budget_allocation.segments.length === 0 ? (
            <InsufficientPlaceholder message="No spend segments to chart." />
          ) : (
            <>
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={budgetData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="44%"
                      innerRadius={48}
                      outerRadius={72}
                      paddingAngle={2}
                    >
                      {budgetData.map((entry, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} opacity={dim(entry.platform) ? 0.28 : 1} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => [`${v ?? 0}%`, "Share"]} />
                    <Legend
                      layout="horizontal"
                      verticalAlign="bottom"
                      align="center"
                      wrapperStyle={{ fontSize: 10, paddingTop: 8 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[11px] text-slate-600 text-center font-medium">{insights.budget_allocation.insight}</p>
            </>
          )}
        </CardShell>

        <CardShell
          title={insights.library_activity_timeline.title}
          subtitle={insights.library_activity_timeline.subtitle}
          tooltip={insights.library_activity_timeline.tooltip}
          narrative={insights.library_activity_timeline.aiNarrative}
        >
          {dq.warning && dq.qualityLabel !== "high" ? (
            <div className="mb-2 flex gap-2 rounded-lg border border-amber-100 bg-amber-50/80 px-2 py-1.5 text-[10px] text-amber-900">
              <Layers className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden />
              <span>{dq.warning}</span>
            </div>
          ) : null}
          {timelineData.length === 0 ? (
            <InsufficientPlaceholder message="No months in range for this competitor." />
          ) : (
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timelineData} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 9 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 9 }} stroke="#94a3b8" width={36} allowDecimals={false} />
                  <Tooltip
                    formatter={(v, name) => [
                      `${v ?? 0} ads`,
                      typeof name === "string" && name.includes("Detections")
                        ? "Detection (library)"
                        : "Launch date (reported)",
                    ]}
                    labelStyle={{ fontSize: 11 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Line
                    type="monotone"
                    dataKey="launch"
                    name="Launches (reported)"
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "#2563eb" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="detection"
                    name="Detections (proxy)"
                    stroke="#94a3b8"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    dot={{ r: 3, fill: "#94a3b8" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          <p className="text-[9px] text-slate-500 text-center mt-1">
            {dq.realLaunchPct}% of ads have a platform-reported launch date ({dq.qualityLabel} confidence)
          </p>
        </CardShell>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <CardShell
          title={insights.funnel_distribution.title}
          subtitle={insights.funnel_distribution.subtitle}
          tooltip={insights.funnel_distribution.tooltip}
          narrative={insights.funnel_distribution.aiNarrative}
        >
          {insights.funnel_distribution.insufficientData ? (
            <InsufficientPlaceholder message="Insufficient enrichment data — fewer than 5 ads have a classified funnel stage." />
          ) : (
            <FunnelDistributionVisual stages={insights.funnel_distribution.stages} />
          )}
        </CardShell>

        <CardShell
          title={insights.angle_clustering.title}
          subtitle={insights.angle_clustering.subtitle}
          tooltip={insights.angle_clustering.tooltip}
          narrative={insights.angle_clustering.aiNarrative}
        >
          {insights.angle_clustering.angles.length === 0 ? (
            <InsufficientPlaceholder message="No angle clusters for this library." />
          ) : (
            <>
              {insights.angle_clustering.insufficientData ? (
                <div className="mb-2 flex gap-2 rounded-lg border border-amber-100 bg-amber-50/80 px-2 py-1.5 text-[10px] text-amber-900">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span>
                    Over 80% of ads are “Unclassified” — enrichment may need a refresh or stronger copy signals.
                  </span>
                </div>
              ) : null}
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="text-left text-slate-400 border-b border-slate-100">
                      <th className="pb-1.5 font-medium pr-2">Angle</th>
                      <th className="pb-1.5 font-medium pr-2">Ads</th>
                      <th className="pb-1.5 font-medium">Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {insights.angle_clustering.angles.slice(0, 8).map((r) => (
                      <tr
                        key={r.angle}
                        className="border-b border-slate-50 cursor-pointer hover:bg-slate-50/80"
                        onClick={() => setSelectedAngle(r.angle === selectedAngle ? null : r.angle)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setSelectedAngle(r.angle === selectedAngle ? null : r.angle);
                          }
                        }}
                        tabIndex={0}
                        role="button"
                      >
                        <td className="py-1.5 pr-2 text-slate-800 max-w-[140px] truncate" title={r.angle}>
                          {r.angle}
                        </td>
                        <td className="py-1.5 pr-2 text-slate-500 tabular-nums">{r.adCount}</td>
                        <td className="py-1.5">
                          <div className="h-2 rounded-full bg-slate-100 overflow-hidden min-w-[64px]">
                            <div
                              className="h-full rounded-full bg-indigo-500"
                              style={{ width: `${Math.min(100, r.sharePct)}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardShell>

        <CardShell
          title={insights.voice_tone_position.title}
          subtitle={insights.voice_tone_position.subtitle}
          tooltip={insights.voice_tone_position.tooltip}
          narrative={insights.voice_tone_position.aiNarrative}
        >
          {!competitorTone ? (
            <InsufficientPlaceholder message="Awaiting enrichment data — need at least 3 ads with voice_tone scores." />
          ) : (
            <>
              {competitorTone.insufficientData ? (
                <div className="mb-2 flex gap-2 rounded-lg border border-amber-100 bg-amber-50/80 px-2 py-1.5 text-[10px] text-amber-900">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span>
                    Small sample ({insights.voice_tone_position.sampleSize} ads) — treat position as directional.
                  </span>
                </div>
              ) : null}
              <div className="relative h-[140px] rounded-xl bg-gradient-to-br from-slate-50 to-slate-100/80 border border-slate-100 overflow-hidden">
                <span className="absolute bottom-2 left-2 text-[9px] text-slate-500 font-medium">
                  Casual ← → Formal
                </span>
                <span className="absolute top-2 right-2 text-[9px] text-slate-500 font-medium">
                  Rational ↑ / Emotional ↓
                </span>
                <div
                  className="absolute w-3.5 h-3.5 rounded-full bg-slate-900 border-2 border-white shadow-md z-10"
                  style={{
                    left: `${Math.min(92, Math.max(8, competitorTone.formal * 100))}%`,
                    top: `${Math.min(88, Math.max(8, (1 - competitorTone.emotional) * 100))}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                  title={`Competitor · conf. ≈ ${competitorTone.confidence}`}
                />
                {userPt ? (
                  <div
                    className="absolute w-3.5 h-3.5 rounded-full bg-sky-500 border-2 border-white shadow-md z-10"
                    style={{
                      left: `${Math.min(92, Math.max(8, userPt.formal * 100))}%`,
                      top: `${Math.min(88, Math.max(8, (1 - userPt.emotional) * 100))}%`,
                      transform: "translate(-50%, -50%)",
                    }}
                    title="Your brand"
                  />
                ) : null}
                <div className="absolute bottom-1 right-2 flex gap-3 text-[9px] text-slate-600">
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-2 w-2 rounded-full bg-slate-900" /> Competitor
                  </span>
                  {userPt ? (
                    <span className="flex items-center gap-1">
                      <span className="inline-block h-2 w-2 rounded-full bg-sky-500" /> Your brand
                    </span>
                  ) : null}
                </div>
              </div>
            </>
          )}
        </CardShell>
      </div>

      <div className="grid grid-cols-1 gap-4 max-w-3xl mx-auto">
        <CardShell
          title={insights.ad_format_mix.title}
          subtitle={insights.ad_format_mix.subtitle}
          tooltip={insights.ad_format_mix.tooltip}
          narrative={insights.ad_format_mix.aiNarrative}
        >
          {insights.ad_format_mix.formats.length === 0 ? (
            <InsufficientPlaceholder message="No format data in this library." />
          ) : (
            <div className="space-y-2 py-1">
              {insights.ad_format_mix.formats.map((f, i) => (
                <div key={`${f.format}-${i}`} className="flex items-center gap-2">
                  <BarChart3 className="h-3.5 w-3.5 text-slate-400 shrink-0" aria-hidden />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-[11px] text-slate-700 gap-2">
                      <span className="truncate capitalize">{f.format}</span>
                      <span className="tabular-nums text-slate-500 shrink-0">
                        {f.sharePct}% · {f.count}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 mt-0.5 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-violet-500"
                        style={{ width: `${Math.min(100, f.sharePct)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardShell>
      </div>
    </div>
  );
}
