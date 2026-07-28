"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Check,
  Flame,
  Loader2,
  Minus,
  RefreshCw,
  Snowflake,
  Sparkles,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type {
  DiscoveryPatternInsights,
  DiscoveryPatternItem,
} from "@/lib/discovery/pattern-types";
import type { DiscoveryPatternMetrics, DiscoveryPatternReportDto } from "@/lib/discovery/types";
import { cn } from "@/lib/utils";

const GRID = "#e2e8f0";
const EMERALD = "#10b981";
const ROSE = "#f43f5e";
const SLATE = "#64748b";
const VIDEO_COLOR = "#2563eb";
const IMAGE_COLOR = "#94a3b8";

const CATEGORY_STYLES: Record<DiscoveryPatternItem["category"], string> = {
  offer: "bg-violet-100 text-violet-800",
  hook: "bg-sky-100 text-sky-800",
  format: "bg-indigo-100 text-indigo-800",
  creative: "bg-amber-100 text-amber-800",
  timing: "bg-teal-100 text-teal-800",
  competitor_move: "bg-rose-100 text-rose-800",
};

const CONFIDENCE_STYLES: Record<DiscoveryPatternItem["confidence"], string> = {
  high: "bg-emerald-100 text-emerald-800",
  medium: "bg-amber-100 text-amber-800",
  low: "bg-slate-100 text-slate-600",
};

type Props = {
  brandId: string;
  brandName: string;
  onOpenAd: (adId: string) => void;
};

type PatternsResponse = {
  ok: boolean;
  latest: DiscoveryPatternReportDto | null;
  history: DiscoveryPatternMetrics[];
  error?: string;
};

function formatDelta(delta: number): string {
  if (delta > 0) return `+${delta}`;
  return String(delta);
}

function formatWeekLabel(weekStart: string): string {
  const d = new Date(`${weekStart}T00:00:00.000Z`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function StatCell({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: React.ReactNode;
}) {
  return (
    <div className="min-w-[148px] flex-1 rounded-xl border border-slate-200/80 bg-white px-3.5 py-3 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1.5 text-xl font-semibold tabular-nums tracking-tight text-slate-900">{value}</p>
      {hint ? <div className="mt-1 min-h-[1rem]">{hint}</div> : null}
    </div>
  );
}

function WowHint({ current, previous, label }: { current: number; previous: number; label: string }) {
  const delta = current - previous;
  if (delta === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-slate-500">
        <Minus className="h-3 w-3" aria-hidden />
        Flat vs prior week
      </span>
    );
  }
  const up = delta > 0;
  const Icon = up ? ArrowUp : ArrowDown;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-[11px] font-semibold", up ? "text-emerald-700" : "text-rose-700")}>
      <Icon className="h-3 w-3" aria-hidden />
      {formatDelta(delta)} {label}
    </span>
  );
}

function TemperatureBadge({
  temperature,
}: {
  temperature: DiscoveryPatternInsights["market_temperature"];
}) {
  if (temperature === "heating_up") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
        <Flame className="h-3.5 w-3.5" aria-hidden />
        Heating up
      </span>
    );
  }
  if (temperature === "cooling_down") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-800">
        <Snowflake className="h-3.5 w-3.5" aria-hidden />
        Cooling down
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
      <Minus className="h-3.5 w-3.5" aria-hidden />
      Steady
    </span>
  );
}

function TrendIcon({ direction }: { direction: DiscoveryPatternItem["trend_direction"] }) {
  if (direction === "rising") return <ArrowUp className="h-3.5 w-3.5 text-emerald-600" aria-hidden />;
  if (direction === "falling") return <ArrowDown className="h-3.5 w-3.5 text-rose-600" aria-hidden />;
  return <ArrowRight className="h-3.5 w-3.5 text-slate-500" aria-hidden />;
}

function ChartCard({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm",
        className,
      )}
    >
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      {children}
    </div>
  );
}

function FormatDonut({ data, title }: { data: { name: string; value: number; fill: string }[]; title: string }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) {
    return (
      <div>
        <p className="mb-2 text-[11px] font-medium text-slate-600">{title}</p>
        <p className="text-sm text-slate-500">No data</p>
      </div>
    );
  }
  return (
    <div>
      <p className="mb-2 text-[11px] font-medium text-slate-600">{title}</p>
      <ResponsiveContainer width="100%" height={140}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={36} outerRadius={56} paddingAngle={2}>
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.fill} stroke="transparent" />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const row = payload[0];
              return (
                <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] shadow-md">
                  <p className="font-semibold text-slate-900">{row.name}</p>
                  <p className="text-slate-600">{row.value}</p>
                </div>
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function PatternCard({
  pattern,
  onOpenAd,
}: {
  pattern: DiscoveryPatternItem;
  onOpenAd: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const evidenceIds = pattern.evidence_ad_ids ?? [];

  return (
    <article className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase", CATEGORY_STYLES[pattern.category])}>
          {pattern.category.replace("_", " ")}
        </span>
        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize", CONFIDENCE_STYLES[pattern.confidence])}>
          {pattern.confidence}
        </span>
        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-slate-600">
          <TrendIcon direction={pattern.trend_direction} />
          {pattern.trend_direction}
        </span>
      </div>
      <h3 className="mt-2 text-base font-semibold text-slate-900">{pattern.title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{pattern.description}</p>
      {evidenceIds.length > 0 ? (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            Evidence ({evidenceIds.length})
          </button>
          {expanded ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {evidenceIds.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => onOpenAd(id)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-[10px] text-slate-700 hover:bg-slate-100"
                >
                  {id.slice(0, 8)}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function ReportDashboard({
  report,
  onRefresh,
  refreshing,
  onOpenAd,
}: {
  report: DiscoveryPatternReportDto;
  onRefresh: () => void;
  refreshing: boolean;
  onOpenAd: (id: string) => void;
}) {
  const { metrics, insights } = report;
  const series = useMemo(
    () =>
      metrics.weekly_series.map((w) => ({
        ...w,
        label: formatWeekLabel(w.week_start),
      })),
    [metrics.weekly_series],
  );

  const competitorChart = useMemo(
    () =>
      [...metrics.competitors]
        .sort((a, b) => b.aggression_score - a.aggression_score)
        .slice(0, 8)
        .map((c) => ({
          name: c.name.length > 18 ? `${c.name.slice(0, 17)}…` : c.name,
          fullName: c.name,
          launched: c.launched_this_week,
          killed: c.killed_this_week,
          active: c.active_ads,
          aggression: c.aggression_score,
        })),
    [metrics.competitors],
  );

  const activeFormatData = metrics.format_mix.map((f) => ({
    name: f.format === "video" ? "Video" : "Image",
    value: f.active,
    fill: f.format === "video" ? VIDEO_COLOR : IMAGE_COLOR,
  }));

  const newFormatData = metrics.format_mix.map((f) => ({
    name: f.format === "video" ? "Video" : "Image",
    value: f.new_this_week,
    fill: f.format === "video" ? VIDEO_COLOR : IMAGE_COLOR,
  }));

  return (
    <div className="mt-4 space-y-4">
      <section className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50/90 to-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Week of {formatWeekLabel(report.week_start)}
              </p>
              <TemperatureBadge temperature={insights.market_temperature} />
            </div>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">{insights.headline}</h2>
            <p className="mt-1 text-sm text-slate-600">{insights.temperature_reason}</p>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
          >
            {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <RefreshCw className="h-3.5 w-3.5" aria-hidden />}
            Refresh
          </button>
        </div>
      </section>

      <section className="flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <StatCell
          label="New this week"
          value={metrics.new_this_week.toLocaleString()}
          hint={<WowHint current={metrics.new_this_week} previous={metrics.new_prev_week} label="vs prior week" />}
        />
        <StatCell
          label="Killed this week"
          value={metrics.killed_this_week.toLocaleString()}
          hint={<WowHint current={metrics.killed_this_week} previous={metrics.killed_prev_week} label="vs prior week" />}
        />
        <StatCell label="Net change" value={formatDelta(metrics.net_change)} />
        <StatCell
          label="New ultimate winners"
          value={metrics.new_ultimate_winners_this_week.toLocaleString()}
          hint={<span className="text-[11px] text-slate-500">{metrics.ultimate_winners_total} total winners</span>}
        />
        <StatCell label="Fast kills" value={metrics.fast_kills_this_week.toLocaleString()} hint={<span className="text-[11px] text-slate-500">Retired within 7 days</span>} />
        <StatCell
          label="Median survival"
          value={metrics.median_run_days_of_killed != null ? `${metrics.median_run_days_of_killed}d` : "—"}
          hint={<span className="text-[11px] text-slate-500">Killed ads lifespan</span>}
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Launch vs retirement trend">
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={series} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: SLATE }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: SLATE }} axisLine={false} tickLine={false} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] shadow-md">
                      <p className="font-semibold text-slate-900">{label}</p>
                      {payload.map((p) => (
                        <p key={p.name} className="text-slate-600">
                          {p.name}: {p.value}
                        </p>
                      ))}
                    </div>
                  );
                }}
              />
              <Bar dataKey="launches" name="Launches" fill={EMERALD} radius={[4, 4, 0, 0]} />
              <Bar dataKey="retirements" name="Retirements" fill={ROSE} radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="active_total" name="Active total" stroke={SLATE} strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Competitor aggression">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={competitorChart} layout="vertical" margin={{ top: 4, right: 8, left: 4, bottom: 0 }}>
              <CartesianGrid stroke={GRID} horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: SLATE }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={88} tick={{ fontSize: 10, fill: SLATE }} axisLine={false} tickLine={false} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const row = payload[0]?.payload as (typeof competitorChart)[number];
                  return (
                    <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] shadow-md">
                      <p className="font-semibold text-slate-900">{row.fullName}</p>
                      <p className="text-slate-600">{row.active} active</p>
                      <p className="text-slate-600">{row.launched} launched · {row.killed} killed</p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="launched" name="Launched" stackId="a" fill={EMERALD} radius={[0, 0, 0, 0]} />
              <Bar dataKey="killed" name="Killed" stackId="a" fill={ROSE} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Format mix">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormatDonut data={activeFormatData} title="Active ads" />
            <FormatDonut data={newFormatData} title="This week's launches" />
          </div>
        </ChartCard>

        {metrics.angle_mix.length > 0 ? (
          <ChartCard title="Angle mix">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={metrics.angle_mix.map((a) => ({ name: a.angle, count: a.count }))}
                layout="vertical"
                margin={{ top: 4, right: 8, left: 4, bottom: 0 }}
              >
                <CartesianGrid stroke={GRID} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: SLATE }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10, fill: SLATE }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="count" fill={SLATE} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        ) : null}
      </div>

      {insights.patterns.length > 0 ? (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Market patterns</h3>
          <div className="grid gap-3 lg:grid-cols-2">
            {insights.patterns.map((pattern, i) => (
              <PatternCard key={`${pattern.title}-${i}`} pattern={pattern} onOpenAd={onOpenAd} />
            ))}
          </div>
        </section>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">Winners playbook</h3>
          <ul className="mt-3 space-y-2">
            {insights.winners_playbook.map((item, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-600">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">Graveyard lessons</h3>
          <ul className="mt-3 space-y-2">
            {insights.graveyard_lessons.map((item, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-600">
                <X className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {insights.recommended_tests.length > 0 ? (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Tests to run this week</h3>
          <div className="grid gap-3 lg:grid-cols-3">
            {insights.recommended_tests.map((test, i) => (
              <article key={i} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Test {i + 1}</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{test.idea}</p>
                <p className="mt-1.5 text-sm text-slate-600">{test.rationale}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {insights.competitor_spotlight ? (
        <section className="rounded-2xl border border-amber-200/80 bg-amber-50/50 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Competitor spotlight</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{insights.competitor_spotlight.name}</p>
          <p className="mt-1 text-sm text-slate-700">{insights.competitor_spotlight.observation}</p>
        </section>
      ) : null}

      <p className="text-center text-[11px] text-slate-400">
        Generated by DeepSeek · {new Date(report.created_at).toLocaleString()} · analyzes your tracked competitors&apos; Meta ads
      </p>
    </div>
  );
}

export function DiscoveryPatternsView({ brandId, brandName, onOpenAd }: Props) {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<DiscoveryPatternReportDto | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/discovery/patterns?brandId=${encodeURIComponent(brandId)}`, {
        credentials: "include",
        cache: "no-store",
      });
      const json = (await res.json()) as PatternsResponse;
      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? "Failed to load patterns report");
      }
      setReport(json.latest);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load patterns report");
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  useEffect(() => {
    void load();
  }, [load]);

  const generate = useCallback(
    async (force = false) => {
      setGenerating(true);
      setError(null);
      try {
        const res = await fetch("/api/discovery/patterns", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ brandId, brandName, force }),
        });
        const json = (await res.json()) as { ok: boolean; report?: DiscoveryPatternReportDto; error?: string };
        if (!res.ok || !json.ok || !json.report) {
          throw new Error(json.error ?? "Failed to generate patterns report");
        }
        setReport(json.report);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to generate patterns report");
      } finally {
        setGenerating(false);
      }
    },
    [brandId, brandName],
  );

  if (loading) {
    return (
      <div className="mt-10 flex items-center justify-center gap-2 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Loading weekly market analysis…
      </div>
    );
  }

  if (error && !report) {
    return (
      <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 px-4 py-6 text-center">
        <p className="text-sm text-red-700">{error}</p>
        <button
          type="button"
          onClick={() => void generate(false)}
          disabled={generating}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {generating ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />}
          Try again
        </button>
      </div>
    );
  }

  if (!report || (report.status === "done" && !report.insights?.headline)) {
    return (
      <div className="mt-10 rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center">
        <Sparkles className="mx-auto h-10 w-10 text-slate-300" aria-hidden />
        <p className="mt-3 text-base font-semibold text-slate-900">No weekly analysis yet</p>
        <p className="mt-1 text-sm text-slate-500">
          Generate an AI market-pattern report from your tracked competitors&apos; Meta ads.
        </p>
        <button
          type="button"
          onClick={() => void generate(false)}
          disabled={generating}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[color:var(--rival-primary)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {generating ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />}
          Generate this week&apos;s analysis
        </button>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      </div>
    );
  }

  if (report.status === "failed") {
    return (
      <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-6 text-center">
        <p className="text-sm font-semibold text-amber-900">Analysis failed</p>
        <p className="mt-1 text-sm text-amber-800">{report.error_text ?? "The AI could not produce a valid report."}</p>
        <button
          type="button"
          onClick={() => void generate(true)}
          disabled={generating}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {generating ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <RefreshCw className="h-4 w-4" aria-hidden />}
          Retry analysis
        </button>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      </div>
    );
  }

  return (
    <ReportDashboard
      report={report}
      onRefresh={() => void generate(true)}
      refreshing={generating}
      onOpenAd={onOpenAd}
    />
  );
}
