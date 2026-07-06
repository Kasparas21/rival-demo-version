"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { JourneyChartSlice } from "@/lib/strategy-overview/journey-goal-analytics";

const GRID = "#e2e8f0";

function ChartCard({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-slate-200/90 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${className ?? ""}`}>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      {children}
    </div>
  );
}

function MiniTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { name: string; value: number; payload: { name: string; value: number } }[];
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] shadow-md">
      <p className="font-semibold text-slate-900">{payload[0].name}</p>
      <p className="text-slate-600">{payload[0].value}%</p>
    </div>
  );
}

function CountTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { name: string; value: number }[];
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] shadow-md">
      <p className="font-semibold text-slate-900">{payload[0].name}</p>
      <p className="text-slate-600">{payload[0].value}</p>
    </div>
  );
}

export function ConfidenceGauge({ pct }: { pct: number }) {
  const clamped = Math.min(100, Math.max(0, pct));
  const label = clamped >= 75 ? "High" : clamped >= 50 ? "Medium" : "Low";
  return (
    <div className="relative flex h-14 w-14 shrink-0 items-center justify-center">
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(#e11d48 ${clamped * 3.6}deg, #e2e8f0 0deg)`,
        }}
      />
      <div className="absolute inset-[5px] flex flex-col items-center justify-center rounded-full bg-white">
        <span className="text-[13px] font-bold tabular-nums text-slate-900">{clamped}%</span>
      </div>
      <span className="sr-only">{label} confidence</span>
    </div>
  );
}

export function JourneyFlowSteps({ steps }: { steps: string[] }) {
  if (steps.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {steps.map((step, i) => (
        <div key={`${step}-${i}`} className="flex items-center gap-1">
          <span
            className={`rounded-lg px-2 py-1 text-[10px] font-semibold ${
              i === steps.length - 1
                ? "bg-rose-100 text-rose-800 ring-1 ring-rose-200"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            {step}
          </span>
          {i < steps.length - 1 ? <span className="text-[10px] text-slate-400">→</span> : null}
        </div>
      ))}
    </div>
  );
}

export function PathMixDonut({ data }: { data: JourneyChartSlice[] }) {
  if (data.length === 0) return <p className="text-[11px] text-slate-500">No path data</p>;
  return (
    <ResponsiveContainer width="100%" height={140}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={36} outerRadius={56} paddingAngle={2}>
          {data.map((entry) => (
            <Cell key={entry.key ?? entry.name} fill={entry.fill} stroke="transparent" />
          ))}
        </Pie>
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const row = payload[0];
            return (
              <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] shadow-md">
                <p className="font-semibold text-slate-900">{row.name}</p>
                <p className="text-slate-600">{row.value}%</p>
              </div>
            );
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function ShareBarChart({
  data,
  dataKey = "share",
  height = 140,
}: {
  data: { name: string; share: number; ads?: number }[];
  dataKey?: string;
  height?: number;
}) {
  if (data.length === 0) return <p className="text-[11px] text-slate-500">No data</p>;
  const chartHeight = Math.max(height, data.length * 28 + 20);
  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={GRID} />
        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} unit="%" />
        <YAxis
          type="category"
          dataKey="name"
          width={88}
          tick={{ fontSize: 10, fill: "#475569" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<MiniTooltip />} cursor={{ fill: "rgba(148,163,184,0.1)" }} />
        <Bar dataKey={dataKey} fill="#334155" radius={[0, 4, 4, 0]} maxBarSize={14} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DealSourceChart({ data }: { data: JourneyChartSlice[] }) {
  if (data.length === 0) return null;
  return (
    <ResponsiveContainer width="100%" height={100}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={40}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.fill} stroke="transparent" />
          ))}
        </Pie>
        <Tooltip content={<CountTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function PlatformMixBars({ data }: { data: JourneyChartSlice[] }) {
  if (data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-1.5">
      {data.map((d) => (
        <div key={d.key ?? d.name} className="flex items-center gap-2">
          <span className="w-14 shrink-0 truncate text-[10px] font-medium text-slate-600">{d.name}</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${(d.value / max) * 100}%`, backgroundColor: d.fill }}
            />
          </div>
          <span className="w-6 shrink-0 text-right text-[10px] tabular-nums text-slate-500">{d.value}</span>
        </div>
      ))}
    </div>
  );
}

export function AlignmentBar({ direct, supporting }: { direct: number; supporting: number }) {
  const total = direct + supporting;
  if (total === 0) return null;
  const directPct = Math.round((direct / total) * 100);
  return (
    <div>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div className="bg-emerald-500 transition-all" style={{ width: `${directPct}%` }} title={`${direct} direct`} />
        <div className="bg-slate-400 transition-all" style={{ width: `${100 - directPct}%` }} title={`${supporting} supporting`} />
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] text-slate-500">
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          {direct} direct ({directPct}%)
        </span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
          {supporting} supporting
        </span>
      </div>
    </div>
  );
}

export function ChannelPulseRow({
  organicPostsPerWeek,
  emailPerWeek,
  emailOfferSharePct,
  organicPlatforms,
}: {
  organicPostsPerWeek: number | null;
  emailPerWeek: number | null;
  emailOfferSharePct: number | null;
  organicPlatforms: number;
}) {
  const hasAny =
    (organicPostsPerWeek != null && organicPostsPerWeek > 0) ||
    (emailPerWeek != null && emailPerWeek > 0);
  if (!hasAny) return null;

  return (
    <div className="grid grid-cols-2 gap-2">
      {organicPostsPerWeek != null && organicPostsPerWeek > 0 ? (
        <div className="rounded-xl border border-violet-200/80 bg-violet-50/50 px-3 py-2">
          <p className="text-[10px] font-medium text-violet-700">Organic cadence</p>
          <p className="mt-0.5 text-[15px] font-bold tabular-nums text-violet-950">
            {organicPostsPerWeek.toFixed(1)}
            <span className="text-[11px] font-medium text-violet-700">/wk</span>
          </p>
          <p className="text-[10px] text-violet-600">{organicPlatforms} platform{organicPlatforms === 1 ? "" : "s"}</p>
        </div>
      ) : null}
      {emailPerWeek != null && emailPerWeek > 0 ? (
        <div className="rounded-xl border border-rose-200/80 bg-rose-50/50 px-3 py-2">
          <p className="text-[10px] font-medium text-rose-700">Email cadence</p>
          <p className="mt-0.5 text-[15px] font-bold tabular-nums text-rose-950">
            {emailPerWeek.toFixed(1)}
            <span className="text-[11px] font-medium text-rose-700">/wk</span>
          </p>
          {emailOfferSharePct != null ? (
            <p className="text-[10px] text-rose-600">{Math.round(emailOfferSharePct)}% carry offers</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export { ChartCard };
