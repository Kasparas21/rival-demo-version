"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Check,
  ChevronDown,
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

import type { DiscoveryPatternInsights, DiscoveryPatternItem } from "@/lib/discovery/pattern-types";
import type {
  DiscoveryPatternAngleMix,
  DiscoveryPatternMetrics,
  DiscoveryPatternReportDto,
} from "@/lib/discovery/types";
import {
  aiGlassCardClass,
  aiGlassInsetClass,
  aiGlassShellClass,
} from "@/lib/ad-detail/ad-preview-analysis-styles";
import {
  formatDelta,
  formatWeekLabel,
  formatWeekRange,
  findPriorWeekMetrics,
  loadPatternsDisplayPrefs,
  resolvePatternsTimezone,
  savePatternsDisplayPrefs,
  type PatternsDisplayPrefs,
} from "@/lib/discovery/pattern-display-utils";
import { cn } from "@/lib/utils";
import { PatternDrilldownPanel } from "@/components/discovery/pattern-drilldown-panel";
import { DiscoveryPatternsControls } from "@/components/discovery/discovery-patterns-controls";

const GRID = "rgba(148,163,184,0.25)";
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

function GlassTooltip({
  title,
  rows,
}: {
  title?: string;
  rows: { label: string; value: string | number; color?: string }[];
}) {
  return (
    <div className="rounded-xl border border-white/80 bg-white/90 px-3 py-2 shadow-[0_12px_40px_-12px_rgba(15,23,42,0.25)] backdrop-blur-xl">
      {title ? <p className="mb-1 text-sm font-semibold text-slate-900">{title}</p> : null}
      {rows.map((row) => (
        <p key={row.label} className="text-xs text-slate-600">
          <span className="font-medium" style={row.color ? { color: row.color } : undefined}>
            {row.label}:
          </span>{" "}
          {row.value}
        </p>
      ))}
    </div>
  );
}

function StatCell({
  label,
  value,
  delta,
  compare,
}: {
  label: string;
  value: string;
  delta?: number | null;
  compare: boolean;
}) {
  const showDelta = compare && delta != null && delta !== 0;
  const up = (delta ?? 0) > 0;

  return (
    <div className={cn(aiGlassCardClass, "min-w-[148px] flex-1 px-5 py-4 transition-transform duration-200 hover:-translate-y-0.5")}>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-slate-900">{value}</p>
      {showDelta ? (
        <p className={cn("mt-1.5 inline-flex items-center gap-1 text-sm font-semibold", up ? "text-emerald-700" : "text-rose-700")}>
          {up ? <ArrowUp className="h-3.5 w-3.5" aria-hidden /> : <ArrowDown className="h-3.5 w-3.5" aria-hidden />}
          {formatDelta(delta!)} vs prior week
        </p>
      ) : compare ? (
        <p className="mt-1.5 text-sm font-medium text-slate-400">Flat vs prior week</p>
      ) : null}
    </div>
  );
}

function TemperatureBadge({
  temperature,
}: {
  temperature: DiscoveryPatternInsights["market_temperature"];
}) {
  if (temperature === "heating_up") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/80 bg-amber-50/80 px-3 py-1.5 text-sm font-semibold text-amber-800 backdrop-blur-sm">
        <Flame className="h-4 w-4" aria-hidden />
        Heating up
      </span>
    );
  }
  if (temperature === "cooling_down") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200/80 bg-sky-50/80 px-3 py-1.5 text-sm font-semibold text-sky-800 backdrop-blur-sm">
        <Snowflake className="h-4 w-4" aria-hidden />
        Cooling down
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/60 px-3 py-1.5 text-sm font-semibold text-slate-700 backdrop-blur-sm">
      <Minus className="h-4 w-4" aria-hidden />
      Steady
    </span>
  );
}

function TrendIcon({ direction }: { direction: DiscoveryPatternItem["trend_direction"] }) {
  if (direction === "rising") return <ArrowUp className="h-3.5 w-3.5 text-emerald-600" aria-hidden />;
  if (direction === "falling") return <ArrowDown className="h-3.5 w-3.5 text-rose-600" aria-hidden />;
  return <ArrowRight className="h-3.5 w-3.5 text-slate-500" aria-hidden />;
}

function ChartCard({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(aiGlassShellClass, "p-5", className)}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold tracking-tight text-slate-900">{title}</h3>
        {subtitle ? <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {children}
    </div>
  );
}

function FormatDonut({ data, title }: { data: { name: string; value: number; fill: string }[]; title: string }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) {
    return (
      <div className={cn(aiGlassInsetClass, "p-4 text-center")}>
        <p className="text-sm font-semibold text-slate-700">{title}</p>
        <p className="mt-2 text-sm text-slate-500">No data</p>
      </div>
    );
  }
  const primary = data[0];
  const primaryPct = primary ? Math.round((primary.value / total) * 100) : 0;
  return (
    <div className={cn(aiGlassInsetClass, "p-4")}>
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      <div className="relative mt-2">
        <ResponsiveContainer width="100%" height={150}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={42} outerRadius={62} paddingAngle={3}>
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} stroke="transparent" />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const row = payload[0];
                return (
                  <GlassTooltip
                    rows={[{ label: String(row.name), value: String(row.value) }]}
                  />
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-slate-900">{primaryPct}%</span>
          <span className="text-xs font-medium text-slate-500">{primary?.name}</span>
        </div>
      </div>
    </div>
  );
}

function truncateAngle(angle: string, max = 72): string {
  const trimmed = angle.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

function AngleMixPanel({
  angles,
  maxCount,
  brandId,
  weekStart,
  onOpenAd,
}: {
  angles: DiscoveryPatternAngleMix[];
  maxCount: number;
  brandId: string;
  weekStart: string;
  onOpenAd: (id: string) => void;
}) {
  const [expandedAngle, setExpandedAngle] = useState<string | null>(null);

  if (!angles.length) return null;

  return (
    <div className="space-y-2">
      {angles.map((item) => {
        const widthPct = maxCount > 0 ? Math.max(8, Math.round((item.count / maxCount) * 100)) : 0;
        const isOpen = expandedAngle === item.angle;
        const adIds = item.ad_ids?.length ? item.ad_ids : undefined;

        return (
          <div key={item.angle} className={cn(aiGlassCardClass, "overflow-hidden transition-all duration-200", isOpen && "ring-2 ring-slate-900/10")}>
            <button
              type="button"
              onClick={() => setExpandedAngle(isOpen ? null : item.angle)}
              className="flex w-full items-start gap-3 px-4 py-3.5 text-left"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-snug text-slate-900" title={item.angle}>
                  {truncateAngle(item.angle, 90)}
                </p>
                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200/60">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-slate-600 to-slate-400 transition-all duration-500"
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-600">{item.count} ads</p>
              </div>
              <ChevronDown
                className={cn(
                  "mt-1 h-5 w-5 shrink-0 text-slate-500 transition-transform duration-200",
                  isOpen ? "rotate-180" : "",
                )}
                aria-hidden
              />
            </button>
            {isOpen ? (
              <div className="border-t border-white/60 px-4 pb-4 pt-3">
                <PatternDrilldownPanel
                  query={{
                    brandId,
                    weekStart,
                    title: item.angle,
                    angle: item.angle,
                    adIds,
                  }}
                  onOpenAd={onOpenAd}
                />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function RecommendedTestCard({
  test,
  index,
  brandId,
  weekStart,
  onOpenAd,
}: {
  test: DiscoveryPatternInsights["recommended_tests"][number];
  index: number;
  brandId: string;
  weekStart: string;
  onOpenAd: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const inspiredIds = test.inspired_by_ad_ids ?? [];

  return (
    <article className={cn(aiGlassCardClass, "p-5 transition-transform duration-200 hover:-translate-y-0.5")}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Test {index + 1}</p>
      <p className="mt-2 text-base font-semibold text-slate-900">{test.idea}</p>
      <p className="mt-2 text-sm leading-relaxed text-slate-600 line-clamp-3">{test.rationale}</p>
      {inspiredIds.length > 0 ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 hover:text-slate-900"
        >
          <ChevronDown
            className={cn("h-3.5 w-3.5 transition-transform", expanded ? "rotate-180" : "")}
            aria-hidden
          />
          {expanded ? "Hide" : "Show"} inspiration ads ({inspiredIds.length})
        </button>
      ) : null}
      {expanded && inspiredIds.length > 0 ? (
        <PatternDrilldownPanel
          className="mt-2"
          query={{
            brandId,
            weekStart,
            title: test.idea,
            adIds: inspiredIds,
          }}
          onOpenAd={onOpenAd}
        />
      ) : null}
    </article>
  );
}

function PatternCard({
  pattern,
  brandId,
  weekStart,
  onOpenAd,
}: {
  pattern: DiscoveryPatternItem;
  brandId: string;
  weekStart: string;
  onOpenAd: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const evidenceIds = pattern.evidence_ad_ids ?? [];

  return (
    <article className={cn(aiGlassCardClass, "p-5 transition-transform duration-200 hover:-translate-y-0.5")}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold uppercase", CATEGORY_STYLES[pattern.category])}>
          {pattern.category.replace("_", " ")}
        </span>
        <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold capitalize", CONFIDENCE_STYLES[pattern.confidence])}>
          {pattern.confidence}
        </span>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600">
          <TrendIcon direction={pattern.trend_direction} />
          {pattern.trend_direction}
        </span>
      </div>
      <h3 className="mt-3 text-lg font-semibold text-slate-900">{pattern.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600 line-clamp-4">{pattern.description}</p>
      {evidenceIds.length > 0 ? (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 hover:text-slate-900"
          >
            <ChevronDown
              className={cn("h-3.5 w-3.5 transition-transform", expanded ? "rotate-180" : "")}
              aria-hidden
            />
            {expanded ? "Hide" : "Show"} supporting ads ({evidenceIds.length})
          </button>
          {expanded ? (
            <PatternDrilldownPanel
              className="mt-2"
              query={{
                brandId,
                weekStart,
                title: pattern.title,
                adIds: evidenceIds,
              }}
              onOpenAd={onOpenAd}
            />
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function ReportDashboard({
  brandId,
  report,
  history,
  prefs,
  onPrefsChange,
  onRefresh,
  refreshing,
  onOpenAd,
}: {
  brandId: string;
  report: DiscoveryPatternReportDto;
  history: DiscoveryPatternMetrics[];
  prefs: PatternsDisplayPrefs;
  onPrefsChange: (prefs: PatternsDisplayPrefs) => void;
  onRefresh: () => void;
  refreshing: boolean;
  onOpenAd: (adId: string) => void;
}) {
  const { metrics, insights } = report;
  const [expandedCompetitorId, setExpandedCompetitorId] = useState<string | null>(null);
  const timeZone = resolvePatternsTimezone(prefs.timezone);
  const compare = prefs.compare;
  const priorMetrics = useMemo(
    () => findPriorWeekMetrics(history, report.week_start),
    [history, report.week_start],
  );
  const priorCompetitorMap = useMemo(
    () => new Map(priorMetrics?.competitors.map((c) => [c.competitor_id, c]) ?? []),
    [priorMetrics],
  );
  const series = useMemo(
    () =>
      metrics.weekly_series.map((w, i, arr) => {
        const prev = i > 0 ? arr[i - 1] : null;
        return {
          ...w,
          label: formatWeekLabel(w.week_start, timeZone),
          launches_prev: prev?.launches ?? 0,
          retirements_prev: prev?.retirements ?? 0,
        };
      }),
    [metrics.weekly_series, timeZone],
  );

  const competitorChart = useMemo(
    () =>
      [...metrics.competitors]
        .sort((a, b) => b.aggression_score - a.aggression_score)
        .slice(0, 8)
        .map((c) => {
          const prev = priorCompetitorMap.get(c.competitor_id);
          return {
            id: c.competitor_id,
            name: c.name.length > 16 ? `${c.name.slice(0, 15)}…` : c.name,
            fullName: c.name,
            launched: c.launched_this_week,
            killed: c.killed_this_week,
            launched_prev: prev?.launched_this_week ?? 0,
            killed_prev: prev?.killed_this_week ?? 0,
            active: c.active_ads,
            aggression: c.aggression_score,
          };
        }),
    [metrics.competitors, priorCompetitorMap],
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

  const angleMaxCount = useMemo(
    () => Math.max(...metrics.angle_mix.map((a) => a.count), 1),
    [metrics.angle_mix],
  );

  return (
    <div className="mt-4 space-y-5">
      <section className={cn(aiGlassShellClass, "p-6 sm:p-7")}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <TemperatureBadge temperature={insights.market_temperature} />
            </div>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{insights.headline}</h2>
            <p className="mt-2 max-w-3xl text-base leading-relaxed text-slate-600">{insights.temperature_reason}</p>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-white/70 bg-white/50 px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm backdrop-blur-sm transition hover:bg-white/70 disabled:opacity-60"
          >
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <RefreshCw className="h-4 w-4" aria-hidden />}
            Refresh
          </button>
        </div>
      </section>

      <DiscoveryPatternsControls
        prefs={prefs}
        onChange={onPrefsChange}
        weekRangeLabel={`Week of ${formatWeekRange(report.week_start, timeZone)}`}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCell
          label="New launches"
          value={metrics.new_this_week.toLocaleString()}
          delta={metrics.new_this_week - metrics.new_prev_week}
          compare={compare}
        />
        <StatCell
          label="Retired"
          value={metrics.killed_this_week.toLocaleString()}
          delta={metrics.killed_this_week - metrics.killed_prev_week}
          compare={compare}
        />
        <StatCell
          label="Net change"
          value={formatDelta(metrics.net_change)}
          delta={compare ? metrics.net_change - (priorMetrics ? priorMetrics.net_change : 0) : null}
          compare={compare && priorMetrics != null}
        />
        <StatCell
          label="New winners"
          value={metrics.new_ultimate_winners_this_week.toLocaleString()}
          delta={
            compare && priorMetrics
              ? metrics.new_ultimate_winners_this_week - priorMetrics.new_ultimate_winners_this_week
              : null
          }
          compare={compare && priorMetrics != null}
        />
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <ChartCard title="Launch vs retirement" subtitle={compare ? "Solid = this period · faded = prior week per bar" : undefined}>
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={series} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: SLATE }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: SLATE }} axisLine={false} tickLine={false} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <GlassTooltip
                      title={String(label)}
                      rows={payload.map((p) => ({
                        label: String(p.name),
                        value: String(p.value),
                        color: p.color,
                      }))}
                    />
                  );
                }}
              />
              {compare ? (
                <>
                  <Bar dataKey="launches_prev" name="Launches (prior)" fill={EMERALD} fillOpacity={0.25} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="retirements_prev" name="Retirements (prior)" fill={ROSE} fillOpacity={0.25} radius={[4, 4, 0, 0]} />
                </>
              ) : null}
              <Bar dataKey="launches" name="Launches" fill={EMERALD} radius={[4, 4, 0, 0]} />
              <Bar dataKey="retirements" name="Retirements" fill={ROSE} radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="active_total" name="Active total" stroke={SLATE} strokeWidth={2.5} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Clinic activity" subtitle="Tap a bar to drill into ads">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={competitorChart} layout="vertical" margin={{ top: 4, right: 8, left: 4, bottom: 0 }}>
              <CartesianGrid stroke={GRID} horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 12, fill: SLATE }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={92} tick={{ fontSize: 12, fill: SLATE }} axisLine={false} tickLine={false} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const row = payload[0]?.payload as (typeof competitorChart)[number];
                  const rows = [
                    { label: "Active", value: row.active },
                    { label: "Launched", value: row.launched },
                    { label: "Retired", value: row.killed },
                  ];
                  if (compare) {
                    rows.push(
                      { label: "Launched (prior)", value: row.launched_prev },
                      { label: "Retired (prior)", value: row.killed_prev },
                    );
                  }
                  return <GlassTooltip title={row.fullName} rows={rows} />;
                }}
              />
              {compare ? (
                <>
                  <Bar dataKey="launched_prev" name="Launched (prior)" stackId="prev" fill={EMERALD} fillOpacity={0.28} />
                  <Bar dataKey="killed_prev" name="Retired (prior)" stackId="prev" fill={ROSE} fillOpacity={0.28} />
                </>
              ) : null}
              <Bar
                dataKey="launched"
                name="Launched"
                stackId="a"
                fill={EMERALD}
                radius={[0, 0, 0, 0]}
                cursor="pointer"
                onClick={(data) => {
                  const row = data?.payload as (typeof competitorChart)[number] | undefined;
                  if (row?.id) {
                    setExpandedCompetitorId((current) => (current === row.id ? null : row.id));
                  }
                }}
              />
              <Bar
                dataKey="killed"
                name="Killed"
                stackId="a"
                fill={ROSE}
                radius={[0, 4, 4, 0]}
                cursor="pointer"
                onClick={(data) => {
                  const row = data?.payload as (typeof competitorChart)[number] | undefined;
                  if (row?.id) {
                    setExpandedCompetitorId((current) => (current === row.id ? null : row.id));
                  }
                }}
              />
            </BarChart>
          </ResponsiveContainer>
          {expandedCompetitorId ? (
            <div className="mt-4 border-t border-white/60 pt-4">
              <PatternDrilldownPanel
                query={{
                  brandId,
                  weekStart: report.week_start,
                  competitorId: expandedCompetitorId,
                  title:
                    metrics.competitors.find((c) => c.competitor_id === expandedCompetitorId)?.name ??
                    "Competitor ads",
                }}
                onOpenAd={onOpenAd}
              />
            </div>
          ) : null}
        </ChartCard>

        <ChartCard title="Format mix">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormatDonut data={activeFormatData} title="Active ads" />
            <FormatDonut data={newFormatData} title="New launches" />
          </div>
        </ChartCard>

        {metrics.angle_mix.length > 0 ? (
          <ChartCard title="Creative themes" subtitle="Tap to expand ads by clinic" className="lg:col-span-2">
            <AngleMixPanel
              angles={metrics.angle_mix}
              maxCount={angleMaxCount}
              brandId={brandId}
              weekStart={report.week_start}
              onOpenAd={onOpenAd}
            />
          </ChartCard>
        ) : null}
      </div>

      {insights.patterns.length > 0 ? (
        <section className="space-y-4">
          <h3 className="text-xl font-semibold text-slate-900">Patterns</h3>
          <div className="grid gap-4 lg:grid-cols-2">
            {insights.patterns.map((pattern, i) => (
              <PatternCard
                key={`${pattern.title}-${i}`}
                pattern={pattern}
                brandId={brandId}
                weekStart={report.week_start}
                onOpenAd={onOpenAd}
              />
            ))}
          </div>
        </section>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <section className={cn(aiGlassShellClass, "p-5")}>
          <h3 className="text-lg font-semibold text-slate-900">Winners playbook</h3>
          <ul className="mt-4 space-y-3">
            {insights.winners_playbook.map((item, i) => (
              <li key={i} className="flex gap-3 text-base text-slate-700">
                <Check className="mt-1 h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className={cn(aiGlassShellClass, "p-5")}>
          <h3 className="text-lg font-semibold text-slate-900">Graveyard lessons</h3>
          <ul className="mt-4 space-y-3">
            {insights.graveyard_lessons.map((item, i) => (
              <li key={i} className="flex gap-3 text-base text-slate-700">
                <X className="mt-1 h-5 w-5 shrink-0 text-rose-600" aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {insights.recommended_tests.length > 0 ? (
        <section className="space-y-4">
          <h3 className="text-xl font-semibold text-slate-900">Tests to run</h3>
          <div className="grid gap-4 lg:grid-cols-3">
            {insights.recommended_tests.map((test, i) => (
              <RecommendedTestCard
                key={i}
                test={test}
                index={i}
                brandId={brandId}
                weekStart={report.week_start}
                onOpenAd={onOpenAd}
              />
            ))}
          </div>
        </section>
      ) : null}

      {insights.competitor_spotlight ? (
        <section className={cn(aiGlassShellClass, "border-amber-200/50 bg-gradient-to-br from-amber-50/70 to-white/50 p-5")}>
          <p className="text-sm font-semibold text-amber-800">Competitor spotlight</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">{insights.competitor_spotlight.name}</p>
          <p className="mt-2 text-base text-slate-700">{insights.competitor_spotlight.observation}</p>
        </section>
      ) : null}

      <p className="text-center text-xs text-slate-400">
        {new Date(report.created_at).toLocaleString(timeZone)} · Meta ads from tracked competitors
      </p>
    </div>
  );
}

export function DiscoveryPatternsView({ brandId, brandName, onOpenAd }: Props) {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<DiscoveryPatternReportDto | null>(null);
  const [history, setHistory] = useState<DiscoveryPatternMetrics[]>([]);
  const [prefs, setPrefs] = useState<PatternsDisplayPrefs>(() => loadPatternsDisplayPrefs(brandId));

  const handlePrefsChange = useCallback(
    (next: PatternsDisplayPrefs) => {
      setPrefs(next);
      savePatternsDisplayPrefs(brandId, next);
    },
    [brandId],
  );

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
      setHistory(json.history ?? []);
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
      brandId={brandId}
      report={report}
      history={history}
      prefs={prefs}
      onPrefsChange={handlePrefsChange}
      onRefresh={() => void generate(true)}
      refreshing={generating}
      onOpenAd={onOpenAd}
    />
  );
}
