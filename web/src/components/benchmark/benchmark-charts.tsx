"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { BenchmarkEntityMetrics, BenchmarkPlatformId } from "@/lib/benchmark/benchmark-types";
import { BENCHMARK_PLATFORM_LABELS, BENCHMARK_PLATFORMS } from "@/lib/benchmark/benchmark-types";

const OWN_COLOR = "#2563eb";
const RIVAL_COLOR = "#94a3b8";
const GRID = "#e2e8f0";

export const BENCHMARK_PLATFORM_COLORS: Record<BenchmarkPlatformId, string> = {
  meta: "#1877F2",
  google: "#34A853",
  tiktok: "#111827",
  linkedin: "#0A66C2",
  pinterest: "#E60023",
  snapchat: "#ca8a04",
};

type BrandBar = { name: string; shortName: string; value: number; isOwn: boolean };

function truncateLabel(name: string, max = 14): string {
  const n = name.trim();
  if (n.length <= max) return n;
  return `${n.slice(0, max - 1)}…`;
}

function brandBars(entities: BenchmarkEntityMetrics[], valueKey: keyof BenchmarkEntityMetrics): BrandBar[] {
  return entities.map((e) => {
    const raw = e[valueKey];
    const value = typeof raw === "number" && Number.isFinite(raw) ? raw : 0;
    return {
      name: e.name,
      shortName: truncateLabel(e.isOwnBrand ? `${e.name} (you)` : e.name),
      value,
      isOwn: e.isOwnBrand,
    };
  });
}

function ChartTooltip({
  active,
  payload,
  label,
  suffix = "",
}: {
  active?: boolean;
  payload?: { value: number; payload: BrandBar }[];
  label?: string;
  suffix?: string;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-xl border border-white/75 bg-white/70 px-3 py-2.5 text-[12px] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_8px_24px_-8px_rgba(74,127,165,0.18)] backdrop-blur-xl ring-1 ring-white/60">
      <p className="font-semibold text-slate-900">{row.name}</p>
      <p className="mt-0.5 tabular-nums text-slate-600">
        {payload[0].value}
        {suffix}
      </p>
    </div>
  );
}

export function ActivityScoreChart({ entities }: { entities: BenchmarkEntityMetrics[] }) {
  const data = useMemo(
    () =>
      [...brandBars(entities, "activityScore")]
        .filter((d) => d.value > 0)
        .sort((a, b) => b.value - a.value),
    [entities],
  );

  if (data.length === 0) {
    return <EmptyChart label="No activity scores yet" />;
  }

  const height = Math.max(180, data.length * 36 + 24);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={GRID} />
        <XAxis type="number" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="shortName"
          width={108}
          tick={{ fontSize: 11, fill: "#334155" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(148,163,184,0.12)" }} />
        <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={22}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.isOwn ? OWN_COLOR : RIVAL_COLOR} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ActiveAdsChart({ entities }: { entities: BenchmarkEntityMetrics[] }) {
  const data = useMemo(
    () => [...brandBars(entities, "activeAdCount")].sort((a, b) => b.value - a.value),
    [entities],
  );
  const height = Math.max(180, data.length * 36 + 24);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={GRID} />
        <XAxis type="number" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="shortName"
          width={108}
          tick={{ fontSize: 11, fill: "#334155" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<ChartTooltip suffix=" ads" />} cursor={{ fill: "rgba(148,163,184,0.12)" }} />
        <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={22}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.isOwn ? OWN_COLOR : RIVAL_COLOR} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function NewAdsChart({ entities }: { entities: BenchmarkEntityMetrics[] }) {
  const data = useMemo(
    () => [...brandBars(entities, "newAdsThisPeriod")].sort((a, b) => b.value - a.value),
    [entities],
  );
  const height = Math.max(160, data.length * 32 + 20);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} />
        <XAxis
          dataKey="shortName"
          tick={{ fontSize: 10, fill: "#64748b" }}
          axisLine={false}
          tickLine={false}
          interval={0}
          angle={-28}
          textAnchor="end"
          height={52}
        />
        <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} width={28} />
        <Tooltip content={<ChartTooltip suffix=" new (7d)" />} cursor={{ fill: "rgba(148,163,184,0.12)" }} />
        <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={36}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.isOwn ? OWN_COLOR : "#cbd5e1"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function PlatformRadarChart({
  ownBrand,
  competitors,
}: {
  ownBrand: BenchmarkEntityMetrics;
  competitors: BenchmarkEntityMetrics[];
}) {
  const data = useMemo(() => {
    const rivalCount = Math.max(1, competitors.length);
    return BENCHMARK_PLATFORMS.map((pl) => {
      const you = ownBrand.platformsActive[pl] ? 100 : 0;
      const rivalPct =
        (competitors.filter((c) => c.platformsActive[pl]).length / rivalCount) * 100;
      return {
        platform: BENCHMARK_PLATFORM_LABELS[pl],
        you,
        rivals: Math.round(rivalPct),
      };
    });
  }, [ownBrand, competitors]);

  return (
    <ResponsiveContainer width="100%" height={260}>
      <RadarChart data={data} cx="50%" cy="50%" outerRadius="72%">
        <PolarGrid stroke="#e2e8f0" />
        <PolarAngleAxis dataKey="platform" tick={{ fontSize: 10, fill: "#475569" }} />
        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
        <Radar
          name="You"
          dataKey="you"
          stroke={OWN_COLOR}
          fill={OWN_COLOR}
          fillOpacity={0.35}
          strokeWidth={2}
        />
        <Radar
          name="Rivals avg"
          dataKey="rivals"
          stroke="#94a3b8"
          fill="#94a3b8"
          fillOpacity={0.2}
          strokeWidth={2}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const row = payload[0].payload as { platform: string; you: number; rivals: number };
            return (
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] shadow-md">
                <p className="font-semibold text-slate-900">{row.platform}</p>
                <p className="text-sky-700">You: {row.you ? "Active" : "—"}</p>
                <p className="text-slate-600">Rivals: {row.rivals}% active</p>
              </div>
            );
          }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}

export function InlineBar({ value, max, color = OWN_COLOR }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="flex items-center gap-2 justify-end">
      <span className="tabular-nums text-slate-800 min-w-[2rem]">{value}</span>
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-[180px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-[13px] text-slate-500">
      {label}
    </div>
  );
}

export function RankRing({ rank, of, label }: { rank: number; of: number; label: string }) {
  const pct = of > 0 ? Math.round(((of - rank + 1) / of) * 100) : 0;
  const r = 30;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative rounded-full border border-white/70 bg-white/45 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_8px_24px_-10px_rgba(37,99,235,0.2)] backdrop-blur-md ring-1 ring-white/55">
        <svg width="76" height="76" viewBox="0 0 76 76">
          <circle cx="38" cy="38" r={r} fill="none" stroke="rgba(226,232,240,0.9)" strokeWidth="6" />
          <circle
            cx="38"
            cy="38"
            r={r}
            fill="none"
            stroke="url(#benchmark-ring-grad)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${c}`}
            transform="rotate(-90 38 38)"
          />
          <defs>
            <linearGradient id="benchmark-ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[20px] font-bold leading-none tabular-nums text-sky-950">#{rank}</span>
          <span className="text-[9px] font-medium text-slate-500">of {of}</span>
        </div>
      </div>
      <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</span>
    </div>
  );
}
