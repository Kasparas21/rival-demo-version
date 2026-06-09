"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import {
  ArrowRight,
  BarChart3,
  Layers,
  RefreshCw,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";

import { BenchmarkBrandLogo } from "@/components/benchmark/benchmark-brand-logo";
import {
  ActiveAdsChart,
  ActivityScoreChart,
  BENCHMARK_PLATFORM_COLORS,
  InlineBar,
  NewAdsChart,
  PlatformRadarChart,
  RankRing,
} from "@/components/benchmark/benchmark-charts";
import {
  benchmarkBrandYouChipClass,
  benchmarkCompetitorChipClass,
  benchmarkCtaClass,
  benchmarkGlassCardClass,
  benchmarkGlassIconWrapClass,
  benchmarkGlassKpiClass,
  benchmarkGlassTableClass,
  benchmarkInsightBehindClass,
  benchmarkInsightOppClass,
  benchmarkInsightWinClass,
  benchmarkOwnRowClass,
  benchmarkPageBgClass,
  benchmarkAngleCardClass,
  benchmarkWorkspaceLeftAccentClass,
  benchmarkWorkspaceTopSheenClass,
  benchmarkWorkspaceWellClass,
} from "@/components/benchmark/benchmark-styles";
import {
  BenchmarkAmbientBg,
  GlassPanel,
  parseAngleGap,
} from "@/components/benchmark/benchmark-glass";
import { COMPETITOR_PAGE_X } from "@/components/dashboard/competitor/competitor-page-layout";
import { BenchmarkSkeleton } from "@/components/ui/feature-skeleton";
import type { BenchmarkApiResponse, BenchmarkEntityMetrics, BenchmarkPayload } from "@/lib/benchmark/benchmark-types";
import {
  BENCHMARK_PLATFORM_LABELS,
  BENCHMARK_PLATFORMS,
  type BenchmarkPlatformId,
} from "@/lib/benchmark/benchmark-types";
import { useScrapeKeyedCache } from "@/lib/cache/use-scrape-keyed-cache";

type SortKey = "activityScore" | "activeAdCount" | "newAdsThisPeriod" | "creativeFreshnessDays" | "platformsActiveCount";

type Props = {
  fetchEnabled: boolean;
  brandId: string;
  cacheDomainNorm: string;
  lastScrapedAt?: string | null;
  onNavigate: (tab: string, sub?: string | null) => void;
};

export function BenchmarkTab({ fetchEnabled, brandId, cacheDomainNorm, lastScrapedAt = null, onNavigate }: Props) {
  const stamp = lastScrapedAt ?? "none";
  const cacheKey = useMemo(
    () => `${brandId}:${cacheDomainNorm.trim().toLowerCase()}:benchmark:v2:${stamp}`,
    [brandId, cacheDomainNorm, stamp],
  );

  const fetchBenchmark = useCallback(async (): Promise<BenchmarkApiResponse> => {
    const qs = brandId ? `?brandId=${encodeURIComponent(brandId)}` : "";
    const res = await fetch(`/api/brand/benchmark${qs}`, { credentials: "include" });
    return (await res.json()) as BenchmarkApiResponse;
  }, [brandId]);

  const { data, loading, error, refetch, isValidating } = useScrapeKeyedCache<BenchmarkApiResponse>({
    cacheKey,
    enabled: fetchEnabled && Boolean(cacheDomainNorm.trim()),
    persistAcrossTabs: true,
    validateCached: (c) => c.ok === true && Boolean(c.hero),
    fetcher: fetchBenchmark,
  });

  const payload = data?.ok === true ? data : null;
  const errMsg = data?.ok === false ? data.error : error?.message ?? null;
  const showSkeleton = (loading || isValidating) && !payload;

  if (showSkeleton) {
    return (
      <div className={`${benchmarkPageBgClass} min-h-[40vh]`}>
        <BenchmarkAmbientBg />
        <div className={`relative ${COMPETITOR_PAGE_X} py-8 pb-24`}>
          <BenchmarkSkeleton />
        </div>
      </div>
    );
  }

  if (errMsg && !payload) {
    return (
      <div className={`${benchmarkPageBgClass} min-h-[40vh]`}>
        <div className={`${COMPETITOR_PAGE_X} py-8`}>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[14px] text-slate-800 shadow-sm">
            {errMsg}
            {errMsg.includes("Add competitors") ? null : (
              <button type="button" className="mt-2 block text-[13px] font-medium text-sky-700 underline" onClick={() => refetch()}>
                Try again
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!payload) return null;

  const entities = payload.entities ?? [payload.ownBrand, ...payload.competitors];

  return (
    <div className={`${benchmarkPageBgClass} min-h-full`}>
      <BenchmarkAmbientBg />
      <div className={`relative ${COMPETITOR_PAGE_X} py-8 pb-24 space-y-5 animate-in fade-in duration-200`}>
        <BenchmarkHeader payload={payload} isValidating={isValidating} onRefresh={() => refetch()} />

        <KpiStrip payload={payload} />
        <RankRingsRow payload={payload} />

        <div className="grid gap-5 lg:grid-cols-2">
          <ChartPanel title="Activity score" icon={Zap} subtitle="Higher = more launch velocity">
            <ActivityScoreChart entities={entities} />
          </ChartPanel>
          <ChartPanel title="Active ads" icon={BarChart3} subtitle="Live creatives in library">
            <ActiveAdsChart entities={entities} />
          </ChartPanel>
        </div>

        <div className="grid gap-5 lg:grid-cols-5">
          <ChartPanel
            className="lg:col-span-3"
            title="New ads (7 days)"
            icon={TrendingUp}
            subtitle="Recent launch pace"
          >
            <NewAdsChart entities={entities} />
          </ChartPanel>
          <ChartPanel
            className="lg:col-span-2"
            title="Channel reach"
            icon={Layers}
            subtitle="You vs rival adoption"
          >
            <PlatformRadarChart ownBrand={payload.ownBrand} competitors={payload.competitors} />
            <div className="mt-2 flex justify-center gap-4 text-[11px] text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#2563eb]" /> You
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-slate-400" /> Rivals
              </span>
            </div>
          </ChartPanel>
        </div>

        <PlatformHeatmap payload={payload} />
        <MetricTable entities={entities} />
        <AiInsightGrid payload={payload} />
        <AngleGapsVisual payload={payload} />
        <RecommendedMovesGrid payload={payload} onNavigate={onNavigate} />
      </div>
    </div>
  );
}

function BenchmarkHeader({
  payload,
  isValidating,
  onRefresh,
}: {
  payload: BenchmarkPayload;
  isValidating: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-[22px] font-semibold tracking-tight text-sky-950">Brand benchmark</h2>
        <p className="mt-0.5 text-[12px] text-sky-800/55">
          {payload.competitors.length} competitors · {new Date(payload.computedAt).toLocaleDateString()}
          {payload.fromCache ? " · cached" : ""}
        </p>
      </div>
      <button
        type="button"
        disabled={isValidating}
        onClick={onRefresh}
        className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/55 px-3.5 py-2 text-[12px] font-medium text-sky-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_4px_16px_-6px_rgba(74,127,165,0.15)] backdrop-blur-md ring-1 ring-white/60 hover:bg-white/70 disabled:opacity-50"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${isValidating ? "animate-spin" : ""}`} />
        Refresh
      </button>
    </div>
  );
}

function KpiStrip({ payload }: { payload: BenchmarkPayload }) {
  const { hero, ownBrand } = payload;
  const leaderAds = Math.max(...payload.entities.map((e) => e.activeAdCount), 1);
  const leaderScore = hero.activityScoreLeader ?? 100;

  const cards = [
    {
      label: "Activity",
      value: hero.activityScoreYou != null ? String(hero.activityScoreYou) : "—",
      rank: hero.activityScoreRankLabel,
      pct: hero.activityScoreYou != null && leaderScore > 0 ? Math.round((hero.activityScoreYou / leaderScore) * 100) : 0,
      bar: "from-sky-400 to-sky-600",
    },
    {
      label: "Active ads",
      value: String(hero.activeAdsYou),
      rank: hero.activeAdsRankLabel,
      pct: Math.round((hero.activeAdsYou / leaderAds) * 100),
      bar: "from-sky-500 to-sky-700",
    },
    {
      label: "Platforms",
      value: hero.platformsYouLabel.split("/")[0] ?? hero.platformsYouLabel,
      rank: `${hero.platformsYouLabel} active`,
      pct: Math.round((ownBrand.platformsActiveCount / 6) * 100),
      bar: "from-sky-400 to-amber-400",
    },
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-3">
      {cards.map((c) => (
        <div key={c.label} className={`${benchmarkGlassKpiClass} p-4 pl-6 sm:p-5 sm:pl-7`}>
          <div className={benchmarkWorkspaceTopSheenClass} aria-hidden />
          <div className={benchmarkWorkspaceLeftAccentClass} aria-hidden />
          <p className="relative pl-2 text-[10px] font-bold uppercase tracking-[0.08em] text-sky-800/90">{c.label}</p>
          <p className="relative mt-1.5 pl-2 text-[34px] font-bold leading-none tabular-nums tracking-tight text-sky-950">
            {c.value}
          </p>
          <p className="relative mt-2 pl-2 text-[11px] font-medium text-sky-900/70">{c.rank}</p>
          <div className="relative mt-4 ml-2 h-2 overflow-hidden rounded-full border border-sky-200/60 bg-white/70">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${c.bar}`}
              style={{ width: `${Math.min(100, c.pct)}%` }}
            />
          </div>
        </div>
      ))}
    </section>
  );
}

function RankRingsRow({ payload }: { payload: BenchmarkPayload }) {
  const ownId = payload.ownBrand.id;
  const findRank = (key: keyof BenchmarkPayload["rankings"]) =>
    payload.rankings[key].find((r) => r.entityId === ownId);

  const rings = [
    { ...findRank("activityScore"), label: "Activity" },
    { ...findRank("activeAds"), label: "Active ads" },
    { ...findRank("platformsActive"), label: "Platforms" },
  ].filter((r): r is { rank: number; of: number; label: string } => r.rank != null && r.of != null);

  if (rings.length === 0) return null;

  return (
    <GlassPanel className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[1fr_auto] lg:items-center lg:gap-10 pl-6 sm:pl-8">
      <BiggestGapHero payload={payload} />
      <div className="flex shrink-0 flex-wrap items-center justify-center gap-5 border-t border-white/50 pt-5 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0 sm:gap-7">
        {rings.map((r) => (
          <RankRing key={r.label} rank={r.rank} of={r.of} label={r.label} />
        ))}
      </div>
    </GlassPanel>
  );
}

function BiggestGapHero({ payload }: { payload: BenchmarkPayload }) {
  const topPlatform = payload.platformOpportunities[0];
  if (topPlatform) {
    const rivalsOnPlatform = payload.competitors.filter((c) => c.platformsActive[topPlatform]);
    const platformLabel = BENCHMARK_PLATFORM_LABELS[topPlatform];
    const platformColor = BENCHMARK_PLATFORM_COLORS[topPlatform];
    const count = rivalsOnPlatform.length;

    return (
      <div className="relative min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-sky-700/70">Biggest gap</p>
        <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-1">
          <span className="text-[52px] sm:text-[60px] font-bold leading-none tabular-nums tracking-tight text-sky-950">
            {count}
          </span>
          <p className="pb-1.5 text-[20px] sm:text-[24px] font-semibold leading-tight text-slate-800">
            competitor{count === 1 ? "" : "s"} run{" "}
            <span className="font-bold" style={{ color: platformColor }}>
              {platformLabel}
            </span>{" "}
            ads
          </p>
        </div>
        <p className="mt-3 text-[16px] sm:text-[18px] font-medium text-slate-600">
          You don&apos;t —{" "}
          <span className="rounded-lg border border-sky-300/70 bg-gradient-to-r from-sky-50/80 to-sky-100/50 px-2.5 py-0.5 font-semibold text-sky-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
            expand channel coverage
          </span>
        </p>
        {rivalsOnPlatform.length > 0 ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mr-1">Active on {platformLabel}</span>
            {rivalsOnPlatform.map((rival) => (
              <span key={rival.id} className={benchmarkCompetitorChipClass}>
                <BenchmarkBrandLogo entity={rival} size="sm" className="h-6 w-6 rounded-[8px]" />
                {rival.name}
              </span>
            ))}
            <span className={benchmarkBrandYouChipClass} title="Your brand — not active on this channel">
              <BenchmarkBrandLogo entity={payload.ownBrand} size="sm" className="h-6 w-6 rounded-[8px] ring-0" />
              You
            </span>
          </div>
        ) : null}
        {payload.platformOpportunities.length > 1 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {payload.platformOpportunities.slice(1, 4).map((pl) => (
              <span
                key={pl}
                className="rounded-full border border-white/60 bg-white/40 px-2.5 py-1 text-[11px] font-medium text-slate-600 backdrop-blur-sm"
              >
                Also missing: {BENCHMARK_PLATFORM_LABELS[pl]}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="relative min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-sky-700/70">Key insight</p>
      <p className="mt-2 text-[22px] sm:text-[26px] font-semibold leading-snug text-slate-900">
        {payload.hero.biggestGapLine}
      </p>
    </div>
  );
}

function ChartPanel({
  title,
  subtitle,
  icon: Icon,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  icon: typeof BarChart3;
  children: ReactNode;
  className?: string;
}) {
  return (
    <GlassPanel className={`p-4 sm:p-5 pl-6 ${className}`}>
      <div className="relative mb-4 flex items-start gap-3">
        <div className={benchmarkGlassIconWrapClass}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[13px] font-bold text-sky-950">{title}</p>
          {subtitle ? <p className="text-[11px] text-sky-900/60">{subtitle}</p> : null}
        </div>
      </div>
      <div className={`relative ${benchmarkWorkspaceWellClass}`}>{children}</div>
    </GlassPanel>
  );
}

function PlatformHeatmap({ payload }: { payload: BenchmarkPayload }) {
  const rows = [payload.ownBrand, ...payload.competitors];
  const opportunityCols = new Set(payload.platformOpportunities);

  return (
    <GlassPanel className="p-4 sm:p-5 pl-6 overflow-hidden">
      <div className="relative mb-4 flex items-center gap-3">
        <div className={`${benchmarkGlassIconWrapClass} text-violet-700`}>
          <Layers className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[13px] font-semibold text-slate-900">Platform coverage</p>
          <p className="text-[11px] text-slate-500/90">Highlighted = rivals active, you&apos;re not</p>
        </div>
      </div>
      <div className={`relative overflow-x-auto ${benchmarkWorkspaceWellClass} -mx-0.5`}>
        <table className="min-w-[640px] w-full border-collapse">
          <thead>
            <tr>
              <th className="pb-3 pr-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                Brand
              </th>
              {BENCHMARK_PLATFORMS.map((pl) => (
                <th key={pl} className="pb-3 px-1 text-center">
                  <span
                    className={`inline-block rounded-lg px-2 py-1 text-[9px] font-bold uppercase tracking-wide backdrop-blur-sm ${
                      opportunityCols.has(pl)
                        ? "border border-sky-300/60 bg-sky-100/70 text-sky-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
                        : "border border-white/60 bg-white/40 text-slate-500"
                    }`}
                  >
                    {BENCHMARK_PLATFORM_LABELS[pl].slice(0, 4)}
                  </span>
                </th>
              ))}
              <th className="pb-3 pl-2 text-right text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className={row.isOwnBrand ? benchmarkOwnRowClass : ""}>
                <td className="py-2.5 pr-3 first:rounded-l-xl last:rounded-r-xl">
                  <div className="flex items-center gap-2.5">
                    <BenchmarkBrandLogo entity={row} size="sm" />
                    <span className="text-[12px] font-medium text-slate-900">
                      {row.name}
                      {row.isOwnBrand ? (
                        <span className={`ml-1.5 ${benchmarkBrandYouChipClass} py-0.5 pl-1.5 pr-2 text-[8px]`}>
                          You
                        </span>
                      ) : null}
                    </span>
                  </div>
                </td>
                {BENCHMARK_PLATFORMS.map((pl) => (
                  <td key={pl} className="py-2.5 px-1 text-center">
                    <PlatformDot
                      platform={pl}
                      active={row.platformsActive[pl]}
                      highlight={row.isOwnBrand && opportunityCols.has(pl)}
                    />
                  </td>
                ))}
                <td className="py-2.5 pl-2 text-right tabular-nums text-[12px] font-bold text-slate-700">
                  {row.platformsActiveCount}
                  <span className="text-slate-400 font-normal">/6</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlassPanel>
  );
}

function PlatformDot({
  platform,
  active,
  highlight,
}: {
  platform: BenchmarkPlatformId;
  active: boolean;
  highlight?: boolean;
}) {
  const color = BENCHMARK_PLATFORM_COLORS[platform];
  if (!active) {
    return (
      <span
        className="inline-block h-7 w-7 rounded-lg border border-white/50 bg-white/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] ring-1 ring-slate-200/50"
        title="Inactive"
      />
    );
  }
  return (
    <span
      className={`inline-block h-7 w-7 rounded-lg shadow-[0_2px_8px_-2px_rgba(15,23,42,0.25),inset_0_1px_0_rgba(255,255,255,0.35)] ring-2 ring-white/70 ${
        highlight ? "ring-offset-1 ring-offset-sky-100 ring-sky-400 scale-110" : ""
      }`}
      style={{ backgroundColor: color }}
      title={BENCHMARK_PLATFORM_LABELS[platform]}
    />
  );
}

function MetricTable({ entities }: { entities: BenchmarkEntityMetrics[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("activityScore");
  const [sortDesc, setSortDesc] = useState(true);

  const maxByKey = useMemo(() => {
    const m = (key: SortKey) =>
      Math.max(
        1,
        ...entities.map((e) => {
          const v = e[key];
          return typeof v === "number" && Number.isFinite(v) ? v : 0;
        }),
      );
    return {
      activityScore: m("activityScore"),
      activeAdCount: m("activeAdCount"),
      newAdsThisPeriod: m("newAdsThisPeriod"),
      creativeFreshnessDays: m("creativeFreshnessDays"),
      platformsActiveCount: m("platformsActiveCount"),
    };
  }, [entities]);

  const rows = useMemo(() => {
    return [...entities].sort((a, b) => {
      const av = metricValue(a, sortKey);
      const bv = metricValue(b, sortKey);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return sortDesc ? bv - av : av - bv;
    });
  }, [entities, sortKey, sortDesc]);

  const columns: { key: SortKey; label: string; bar?: boolean }[] = [
    { key: "activityScore", label: "Score", bar: true },
    { key: "activeAdCount", label: "Ads", bar: true },
    { key: "newAdsThisPeriod", label: "New 7d", bar: true },
    { key: "creativeFreshnessDays", label: "Fresh d", bar: false },
    { key: "platformsActiveCount", label: "Plat.", bar: true },
  ];

  return (
    <div className={`${benchmarkGlassTableClass} pl-5 sm:pl-6`}>
      <div className={benchmarkWorkspaceTopSheenClass} aria-hidden />
      <div className={benchmarkWorkspaceLeftAccentClass} aria-hidden />
      <div className="relative border-b border-sky-200/50 px-5 py-3.5 flex items-center gap-3">
        <div className={benchmarkGlassIconWrapClass}>
          <BarChart3 className="h-4 w-4" />
        </div>
        <p className="text-[13px] font-semibold text-slate-900">Full comparison</p>
      </div>
      <div className="relative overflow-x-auto">
        <table className="min-w-[680px] w-full text-[12px]">
          <thead className="bg-white/30 text-slate-500 backdrop-blur-sm">
            <tr>
              <th className="px-4 py-2.5 text-left font-semibold">Brand</th>
              {columns.map((col) => (
                <th key={col.key} className="px-3 py-2.5 text-right font-semibold">
                  <button
                    type="button"
                    className="inline-flex items-center gap-0.5 hover:text-slate-800"
                    onClick={() => {
                      if (sortKey === col.key) setSortDesc((d) => !d);
                      else {
                        setSortKey(col.key);
                        setSortDesc(true);
                      }
                    }}
                  >
                    {col.label}
                    {sortKey === col.key ? (sortDesc ? " ↓" : " ↑") : null}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className={`border-t border-white/40 ${row.isOwnBrand ? benchmarkOwnRowClass : "hover:bg-white/20"}`}
              >
                <td className="px-4 py-2.5 font-medium text-slate-900">
                  <span className="inline-flex items-center gap-2.5">
                    <BenchmarkBrandLogo entity={row} size="sm" />
                    {row.name}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <InlineBar
                    value={row.activityScore ?? 0}
                    max={maxByKey.activityScore}
                    color={row.isOwnBrand ? "#2563eb" : "#94a3b8"}
                  />
                </td>
                <td className="px-3 py-2">
                  <InlineBar value={row.activeAdCount} max={maxByKey.activeAdCount} color={row.isOwnBrand ? "#2563eb" : "#94a3b8"} />
                </td>
                <td className="px-3 py-2">
                  <InlineBar
                    value={row.newAdsThisPeriod}
                    max={maxByKey.newAdsThisPeriod}
                    color={row.isOwnBrand ? "#2563eb" : "#94a3b8"}
                  />
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">{fmt(row.creativeFreshnessDays)}</td>
                <td className="px-3 py-2">
                  <InlineBar
                    value={row.platformsActiveCount}
                    max={6}
                    color={row.isOwnBrand ? "#2563eb" : "#94a3b8"}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AiInsightGrid({ payload }: { payload: BenchmarkPayload }) {
  const { aiSummary } = payload;
  const cards = [
    {
      title: "Winning",
      icon: TrendingUp,
      tone: benchmarkInsightWinClass,
      iconTone: "border-sky-100 bg-gradient-to-br from-sky-100/90 to-amber-50/80 text-sky-800",
      items: aiSummary.winning.slice(0, 2),
    },
    {
      title: "Behind",
      icon: TrendingDown,
      tone: benchmarkInsightBehindClass,
      iconTone: "border-sky-100 bg-gradient-to-br from-sky-100/90 to-amber-50/80 text-amber-800",
      items: aiSummary.behind.slice(0, 2),
    },
    {
      title: "Opportunity",
      icon: Sparkles,
      tone: benchmarkInsightOppClass,
      iconTone: "border-sky-100 bg-gradient-to-br from-sky-100/90 to-amber-50/80 text-sky-800",
      items: [aiSummary.biggestOpportunity],
      footer: payload.platformOpportunities.slice(0, 3),
    },
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-3 sm:items-stretch">
      {cards.map((c) => (
        <div key={c.title} className={`relative flex h-full min-h-[168px] flex-col overflow-hidden p-4 sm:p-5 pl-6 ${c.tone}`}>
          <div className={benchmarkWorkspaceTopSheenClass} aria-hidden />
          <div className={benchmarkWorkspaceLeftAccentClass} aria-hidden />
          <div className="relative flex items-center gap-2.5">
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl border shadow-sm ${c.iconTone}`}>
              <c.icon className="h-4 w-4" />
            </div>
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-sky-800/90">{c.title}</p>
          </div>
          <ul className="relative mt-3 flex flex-1 flex-col gap-2 pl-1">
            {c.items.map((line, i) => (
              <li
                key={`${c.title}-${i}`}
                className="rounded-xl border border-sky-200/55 bg-white/75 px-3 py-2.5 text-[12px] leading-[1.45] text-sky-950 shadow-sm"
              >
                {line}
              </li>
            ))}
          </ul>
          {"footer" in c && c.footer && c.footer.length > 0 ? (
            <div className="relative mt-3 flex flex-wrap gap-1.5 border-t border-sky-200/45 pt-3 pl-1">
              {c.footer.map((pl) => (
                <span
                  key={pl}
                  className="inline-flex items-center gap-1 rounded-full border border-white/65 bg-white/50 py-0.5 pl-1 pr-2 text-[11px] font-semibold text-slate-700 backdrop-blur-sm"
                >
                  <span
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: BENCHMARK_PLATFORM_COLORS[pl] }}
                  />
                  {BENCHMARK_PLATFORM_LABELS[pl]}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </section>
  );
}

function AngleGapsVisual({ payload }: { payload: BenchmarkPayload }) {
  if (payload.angleGaps.length === 0) {
    return (
      <GlassPanel className="flex items-center gap-3 px-5 py-4 pl-7" accent={false}>
        <div className={`${benchmarkGlassIconWrapClass} text-emerald-700`}>
          <Target className="h-4 w-4" />
        </div>
        <p className="text-[13px] font-medium text-slate-700">You cover the messaging angles rivals use.</p>
      </GlassPanel>
    );
  }

  const parsed = payload.angleGaps.map((raw) => ({ raw, ...parseAngleGap(raw) }));

  return (
    <GlassPanel className="p-5 sm:p-6 pl-7">
      <div className="relative mb-4 flex items-center gap-3">
        <div className={`${benchmarkGlassIconWrapClass} text-violet-700`}>
          <Target className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[13px] font-semibold text-slate-900">Messaging gaps</p>
          <p className="text-[11px] text-slate-500">{parsed.length} angles rivals use that you don&apos;t</p>
        </div>
      </div>
      <div className="relative grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {parsed.map(({ raw, label, hook, body }) => (
          <div key={raw} className={`${benchmarkAngleCardClass} pl-5`}>
            <div className={benchmarkWorkspaceTopSheenClass} aria-hidden />
            <p className="relative text-[12px] font-bold text-violet-900">{label}</p>
            {hook ? (
              <p className="relative mt-1.5 text-[10px] leading-snug text-slate-600 line-clamp-2">
                <span className="font-semibold text-violet-700/80">Hook · </span>
                {hook}
              </p>
            ) : null}
            {body ? (
              <p className="relative mt-1 text-[10px] leading-snug text-slate-500 line-clamp-1">
                <span className="font-semibold text-slate-600">Body · </span>
                {body}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </GlassPanel>
  );
}

function RecommendedMovesGrid({
  payload,
  onNavigate,
}: {
  payload: BenchmarkPayload;
  onNavigate: (tab: string, sub?: string | null) => void;
}) {
  return (
    <GlassPanel className="p-5 sm:p-6 pl-7">
      <p className="relative mb-4 text-[13px] font-semibold text-slate-900">Next steps</p>
      <div className="relative grid gap-3 sm:grid-cols-2">
        {payload.recommendedMoves.map((move) => (
          <button
            key={move.title}
            type="button"
            onClick={() => onNavigate(move.tab, move.sub ?? null)}
            className={`${benchmarkGlassCardClass} group flex items-start gap-3 p-4 pl-5 text-left`}
          >
            <div className={benchmarkWorkspaceLeftAccentClass} aria-hidden />
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-800/90 bg-gradient-to-br from-slate-900 to-slate-700 text-white shadow-[0_4px_14px_-4px_rgba(15,23,42,0.4)]">
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </div>
            <div className="relative min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-slate-900">{move.title}</p>
              <p className="mt-0.5 text-[11px] leading-[1.45] text-slate-600">{move.detail}</p>
            </div>
          </button>
        ))}
      </div>
      <div className="relative mt-5 flex justify-end border-t border-white/50 pt-4">
        <button type="button" className={benchmarkCtaClass} onClick={() => onNavigate("ads library", "all")}>
          Open dashboard
        </button>
      </div>
    </GlassPanel>
  );
}

function metricValue(row: BenchmarkEntityMetrics, key: SortKey): number | null {
  const v = row[key];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function fmt(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return String(v);
}
