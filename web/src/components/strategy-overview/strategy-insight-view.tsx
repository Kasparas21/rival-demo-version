"use client";

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
import { useMemo } from "react";
import { Info, Radar, Target, Users } from "lucide-react";

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

function CardShell({
  title,
  children,
  narrative,
}: {
  title: string;
  children: React.ReactNode;
  narrative?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)] flex flex-col min-h-[200px] hover:shadow-md transition-shadow">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-3">{title}</p>
      <div className="flex-1 min-h-0">{children}</div>
      {narrative ? (
        <div className="mt-3 pt-2 border-t border-slate-100 flex gap-1.5 items-start">
          <Info className="h-3.5 w-3.5 shrink-0 text-slate-400 mt-0.5" aria-hidden />
          <p className="text-[10px] text-slate-500 leading-snug">{narrative}</p>
        </div>
      ) : null}
    </div>
  );
}

function FunnelVisual({
  layers,
}: {
  layers: InsightCardsPayload["funnel_architecture"]["layers"];
}) {
  const maxW = 100;
  return (
    <div className="flex flex-col items-center gap-2 py-1">
      {layers.map((L, i) => {
        const w = maxW - i * 18;
        const color = StageColor(L.stage);
        return (
          <div key={L.stage} className="flex w-full items-stretch gap-3">
            <div
              className="flex flex-col justify-center rounded-lg px-3 py-2 text-white shadow-sm transition-transform mx-auto"
              style={{
                width: `${w}%`,
                background: `linear-gradient(135deg, ${color}ee, ${color})`,
                minHeight: 44,
              }}
            >
              <p className="text-[11px] font-bold leading-tight">{L.stage}</p>
              <p className="text-[10px] opacity-95 leading-snug line-clamp-2">
                {L.platforms.join(" · ") || "—"}
              </p>
              {L.exampleSnippet ? (
                <p className="text-[9px] opacity-90 mt-0.5 line-clamp-1 italic">&ldquo;{L.exampleSnippet}…&rdquo;</p>
              ) : null}
            </div>
            {L.dropOffPct != null ? (
              <div className="flex w-[52px] shrink-0 flex-col justify-center text-right">
                <span className="text-[9px] text-slate-400">Drop-off</span>
                <span className="text-[12px] font-bold text-slate-700 tabular-nums">{L.dropOffPct}%</span>
              </div>
            ) : (
              <div className="w-[52px] shrink-0" />
            )}
          </div>
        );
      })}
    </div>
  );
}

function AudienceBullseye({ signals }: { signals: { label: string; strength: number }[] }) {
  const sorted = [...signals].sort((a, b) => b.strength - a.strength).slice(0, 5);
  return (
    <div className="flex items-center justify-center gap-4 py-2">
      <div className="relative h-[120px] w-[120px] shrink-0">
        <div className="absolute inset-0 rounded-full border-2 border-sky-100 bg-sky-50/40" />
        <div className="absolute inset-[14%] rounded-full border-2 border-indigo-100 bg-indigo-50/50" />
        <div className="absolute inset-[28%] rounded-full border-2 border-violet-200 bg-violet-100/60 flex items-center justify-center">
          <Users className="h-6 w-6 text-violet-700 opacity-90" aria-hidden />
        </div>
      </div>
      <ul className="min-w-0 flex-1 space-y-1.5">
        {sorted.map((s) => (
          <li key={s.label} className="flex items-center justify-between gap-2 text-[11px] text-slate-700">
            <span className="flex items-center gap-1.5 min-w-0">
              <Target className="h-3 w-3 shrink-0 text-slate-400" aria-hidden />
              <span className="truncate">{s.label}</span>
            </span>
            <span className="shrink-0 font-mono text-[10px] text-slate-500 tabular-nums">
              {Math.round(s.strength * 100)}%
            </span>
          </li>
        ))}
      </ul>
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

  const cadenceLineData = useMemo(
    () =>
      insights.creative_cadence.months.map((m, i) => ({
        m,
        launches: insights.creative_cadence.launches[i] ?? 0,
      })),
    [insights.creative_cadence.months, insights.creative_cadence.launches]
  );

  const pulseLineData = useMemo(
    () =>
      insights.performance_pulse.weeks.map((w, i) => ({
        w,
        vol: insights.performance_pulse.volume[i] ?? 0,
      })),
    [insights.performance_pulse.weeks, insights.performance_pulse.volume]
  );

  const competitor = insights.voice_tone_fingerprint.competitor;
  const userPt = insights.voice_tone_fingerprint.userBrand;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <CardShell title="Funnel architecture" narrative={insights.funnel_architecture.aiNarrative}>
          <FunnelVisual layers={insights.funnel_architecture.layers} />
        </CardShell>

        <CardShell title="Budget allocation" narrative={insights.budget_allocation.aiNarrative}>
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
                <Tooltip
                  formatter={(v) => [`${v ?? 0}%`, "Share"]}
                />
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
        </CardShell>

        <CardShell title="Creative cadence" narrative={insights.creative_cadence.aiNarrative}>
          <div className="h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cadenceLineData} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="m" tick={{ fontSize: 9 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 9 }} stroke="#94a3b8" width={36} allowDecimals={false} />
                <Tooltip
                  formatter={(v) => [`${v ?? 0} ads`, "First seen in month"]}
                  labelStyle={{ fontSize: 11 }}
                />
                <Line
                  type="monotone"
                  dataKey="launches"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#6366f1", strokeWidth: 0 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[9px] text-slate-500 text-center mt-1">
            Raw counts from your library (ads newly &quot;seen&quot; per month — not % of volume)
          </p>
        </CardShell>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <CardShell title="Audience signal map" narrative={insights.audience_signal_map.aiNarrative}>
          <AudienceBullseye signals={insights.audience_signal_map.signals} />
        </CardShell>

        <CardShell title="Angle clustering" narrative={insights.angle_clustering.aiNarrative}>
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-100">
                  <th className="pb-1.5 font-medium pr-2">Angle</th>
                  <th className="pb-1.5 font-medium pr-2">Ads</th>
                  <th className="pb-1.5 font-medium">Signal</th>
                </tr>
              </thead>
              <tbody>
                {insights.angle_clustering.rows.slice(0, 8).map((r) => (
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
                          className={`h-full rounded-full ${
                            r.longevityScore >= 70 ? "bg-emerald-500" : r.longevityScore >= 45 ? "bg-amber-400" : "bg-slate-400"
                          }`}
                          style={{ width: `${Math.min(100, r.longevityScore)}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardShell>

        <CardShell title="Voice & tone fingerprint" narrative={insights.voice_tone_fingerprint.aiNarrative}>
          <div className="relative h-[140px] rounded-xl bg-gradient-to-br from-slate-50 to-slate-100/80 border border-slate-100 overflow-hidden">
            <span className="absolute bottom-2 left-2 text-[9px] text-slate-500 font-medium">Casual ← → Formal</span>
            <span className="absolute top-2 right-2 text-[9px] text-slate-500 font-medium">Rational ↑ / Emotional ↓</span>
            <div
              className="absolute w-3.5 h-3.5 rounded-full bg-slate-900 border-2 border-white shadow-md z-10"
              style={{
                left: `${Math.min(92, Math.max(8, competitor.formal * 100))}%`,
                top: `${Math.min(88, Math.max(8, (1 - competitor.emotional) * 100))}%`,
                transform: "translate(-50%, -50%)",
              }}
              title="Competitor"
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
        </CardShell>

        <CardShell title="Performance pulse" narrative={insights.performance_pulse.aiNarrative}>
          <div className="flex items-center gap-2 mb-1">
            <Radar className="h-4 w-4 text-teal-600" aria-hidden />
            <p className="text-[12px] font-semibold text-slate-800 capitalize">Trend: {insights.performance_pulse.trend}</p>
          </div>
          <div className="h-[130px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={pulseLineData} margin={{ top: 4, right: 8, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="w" tick={{ fontSize: 8 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 8 }} stroke="#94a3b8" width={32} allowDecimals={false} />
                <Tooltip
                  formatter={(v) => [`${v ?? 0} ads`, "First seen in week"]}
                  labelStyle={{ fontSize: 11 }}
                />
                <Line
                  type="monotone"
                  dataKey="vol"
                  stroke="#0d9488"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#0d9488" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[9px] text-slate-500 text-center mt-1">
            W1 = oldest week in window · counts are raw detections from first-seen dates
          </p>
        </CardShell>
      </div>
    </div>
  );
}
