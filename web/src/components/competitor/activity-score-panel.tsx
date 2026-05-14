"use client";

import { useCallback, useState } from "react";
import { Check, ChevronDown, ChevronUp, Loader2, RefreshCw } from "lucide-react";

import type { ActivityScoreResult, ActivitySignalName } from "@/lib/activity-score/types";
import { CacheRevalidatingDot, DataFreshnessBadge } from "@/components/competitor/data-freshness-badge";
import { useScrapeKeyedCache } from "@/lib/cache/use-scrape-keyed-cache";

type ApiPayload = ActivityScoreResult & {
  ok?: boolean;
  error?: string;
  calculatedAt?: string | null;
  calculated_at?: string | null;
  staleRefreshing?: boolean;
};

const SIGNAL_ORDER: ActivitySignalName[] = [
  "production_value",
  "creative_diversity",
  "refresh_velocity",
  "format_sophistication",
  "landing_infra",
  "copy_sophistication",
  "product_depth",
  "activity_duration",
];

const SIGNAL_LABEL: Record<ActivitySignalName, string> = {
  production_value: "Production value",
  creative_diversity: "Creative diversity",
  refresh_velocity: "Refresh velocity",
  format_sophistication: "Format sophistication",
  landing_infra: "Landing infrastructure",
  copy_sophistication: "Copy sophistication",
  product_depth: "Product portfolio depth",
  activity_duration: "Sustained activity duration",
};

function formatSpendBand(min: number, max: number | null): string {
  const fmt = (n: number) =>
    n >= 1000 ? `€${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K` : `€${Math.round(n).toLocaleString()}`;
  if (max == null) return `${fmt(min)}+/mo in this market`;
  return `${fmt(min)}–${fmt(max)}/mo in this market`;
}

function tierBadgeClass(tier: number): string {
  switch (tier) {
    case 1:
      return "bg-slate-200 text-slate-700 border-slate-300";
    case 2:
      return "bg-slate-300 text-slate-900 border-slate-400";
    case 3:
      return "bg-blue-100 text-blue-900 border-blue-300";
    case 4:
      return "bg-indigo-100 text-indigo-900 border-indigo-300";
    case 5:
      return "bg-purple-100 text-purple-900 border-purple-300";
    case 6:
      return "bg-gradient-to-r from-amber-100 to-amber-200 text-amber-950 border-amber-400/80";
    default:
      return "bg-slate-100 text-slate-800 border-slate-200";
  }
}

type Props = {
  competitorId: string;
  /** Normalized competitor domain for cache namespacing + scrape invalidation. */
  cacheDomainNorm: string;
  enabled?: boolean;
  variant?: "card" | "analytics";
  lastScrapedAt?: string | null;
  onFreshnessRefresh?: () => void;
};

export function ActivityScorePanel({
  competitorId,
  cacheDomainNorm,
  enabled = true,
  variant = "card",
  lastScrapedAt = null,
  onFreshnessRefresh,
}: Props) {
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const domainKey = cacheDomainNorm.trim().toLowerCase();
  const cacheKey = `${domainKey}:activity-score:${competitorId}`;

  const { data, loading, isValidating, error, refetch } = useScrapeKeyedCache<ApiPayload>({
    cacheKey,
    enabled: enabled && !!competitorId && !!domainKey,
    fetcher: async () => {
      const res = await fetch(
        `/api/competitor/activity-score?competitorId=${encodeURIComponent(competitorId)}`
      );
      const json = (await res.json()) as ApiPayload & { ok?: boolean; error?: string };
      if (json.ok === false) {
        throw new Error(json.error ?? `Failed: ${res.status}`);
      }
      return json;
    },
    validateCached: (cached) =>
      cached != null &&
      typeof cached === "object" &&
      (typeof cached.calculatedAt === "string" || typeof cached.calculated_at === "string"),
  });

  const forceRecompute = useCallback(async () => {
    if (!competitorId) return;
    setRefreshing(true);
    try {
      const res = await fetch("/api/competitor/activity-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ competitorId }),
      });
      const json = (await res.json()) as ApiPayload & { ok?: boolean; error?: string };
      if (json.ok === false) {
        throw new Error(json.error ?? "Refresh failed");
      }
      await refetch();
    } catch {
      /* surfaced via next GET error state */
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [competitorId, refetch]);

  if (!enabled || !competitorId) {
    return null;
  }

  const isAnalytics = variant === "analytics";

  if (loading && !data) {
    return (
      <div
        className={
          isAnalytics
            ? "py-4 text-[11px] italic text-[#94a3b8]"
            : "rounded-2xl border border-[#e5e7eb]/90 bg-white/90 p-5 shadow-sm"
        }
      >
        <div className={`flex items-center gap-2 ${isAnalytics ? "" : "text-[13px] text-[#71717a]"}`}>
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
          Loading activity score…
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div
        className={
          isAnalytics
            ? "rounded-lg border border-red-200/90 bg-red-50/70 px-3 py-2.5 text-[12px] text-red-900"
            : "rounded-2xl border border-red-200 bg-red-50/80 p-4 text-[13px] text-red-900 shadow-sm"
        }
      >
        {error?.message ?? "Unable to load activity score."}
        <button
          type="button"
          className="mt-2 block text-[12px] font-semibold underline"
          onClick={() => void refetch()}
        >
          Retry
        </button>
      </div>
    );
  }

  const d = data;
  const prorate = d.rawMetrics.refreshProrateNote as string | undefined;
  const staleNote = d.staleRefreshing ? "Refreshing score in the background…" : null;

  const shell = isAnalytics
    ? "min-w-0"
    : "relative rounded-2xl border border-[#e5e7eb]/90 bg-white/95 p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]";

  const scoreColor = isAnalytics ? "text-[#343434]" : "text-[color:var(--rival-primary)]";
  const subtext = isAnalytics ? "text-[#64748b]" : "text-[#71717a]";
  const barTrack = isAnalytics ? "bg-[#e8eff5]" : "bg-[#f4f4f5]";
  const barFill = isAnalytics ? "#2563eb" : "var(--rival-primary)";
  const headline = isAnalytics ? "text-[#0f172a]" : "text-[#3f3f46]";
  const whyBox = isAnalytics
    ? "rounded-lg border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2.5"
    : "rounded-xl border border-[color:var(--rival-accent-blue)]/35 bg-[color:var(--rival-accent-blue)]/25 px-3 py-2.5";
  const whyTitle = isAnalytics ? "text-[#64748b]" : "text-[#52525b]";
  const reasonText = isAnalytics ? "text-[#334155]" : "text-[#3f3f46]";
  const breakdownHover = isAnalytics ? "hover:text-[#2563eb]" : "hover:text-[color:var(--rival-primary)]";
  const breakdownBorder = isAnalytics ? "border-[#e2e8f0]" : "border-[#f4f4f5]";
  const signalBar = isAnalytics ? "bg-[#2563eb]/90" : "bg-[color:var(--rival-primary)]/85";
  const refreshBtn = isAnalytics
    ? "rounded-full border border-[#e2e8f0] bg-white p-1.5 text-[#64748b] shadow-sm hover:bg-[#f8fafc] disabled:opacity-50"
    : "rounded-full border border-[#e4e4e7] bg-white p-1.5 text-[#52525b] hover:bg-[#fafafa] disabled:opacity-50";

  return (
    <div className={shell}>
      <CacheRevalidatingDot show={isValidating && !!data} />
      <div className={`flex items-start justify-between gap-2 ${isAnalytics ? "mb-2" : "mb-3"}`}>
        <div className="min-w-0 flex-1">
          {!isAnalytics ? (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#71717a]">Activity score</p>
              {staleNote ? <p className="text-[10px] text-indigo-600 mt-0.5">{staleNote}</p> : null}
            </>
          ) : staleNote ? (
            <p className="text-[10px] text-[#2563eb]">{staleNote}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {!isAnalytics ? (
            <DataFreshnessBadge lastScrapedAt={lastScrapedAt} onRefresh={onFreshnessRefresh} />
          ) : null}
          <button
            type="button"
            title="Refresh score"
            aria-label="Refresh activity score"
            disabled={refreshing}
            onClick={() => void forceRecompute()}
            className={`shrink-0 ${refreshBtn}`}
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <RefreshCw className="h-4 w-4" aria-hidden />
            )}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-2 sm:gap-3 mb-2">
        <p
          className={`font-bold tabular-nums leading-none ${scoreColor} ${isAnalytics ? "text-[26px]" : "text-[28px]"}`}
        >
          {d.score}
          <span className={`font-semibold ${subtext} ${isAnalytics ? "text-[13px]" : "text-[14px]"}`}>/100</span>
        </p>
        <span
          className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${tierBadgeClass(d.tier)}`}
        >
          Tier {d.tier}
        </span>
        {d.confidence === "insufficient" ? null : d.confidence === "low" ? (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200/90">
            Limited data
          </span>
        ) : d.confidence === "high" ? (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/90 flex items-center gap-0.5">
            <Check className="h-3 w-3" aria-hidden /> High confidence
          </span>
        ) : null}
      </div>

      <div className={`h-2 rounded-full ${barTrack} overflow-hidden mb-2`}>
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{
            width: `${d.score}%`,
            backgroundColor: barFill,
          }}
        />
      </div>

      <p className={`font-semibold ${headline} ${isAnalytics ? "text-[13px]" : "text-[14px]"}`}>
        {d.tierLabel} — {formatSpendBand(d.spendRange.min, d.spendRange.max)}
      </p>

      <p className={`text-[11px] ${subtext} mt-2 leading-snug`}>
        Based on operational footprint visible in scraped ads. Actual spend is not publicly disclosed by ad libraries.
      </p>

      {d.confidence === "insufficient" ? (
        <p
          className={`text-[12px] text-amber-950 border rounded-lg px-2.5 py-2 mt-3 ${
            isAnalytics ? "bg-amber-50/90 border-amber-200/80" : "text-amber-900 bg-amber-50/90 border-amber-200/80"
          }`}
        >
          Not enough ads scraped yet to compute a meaningful score. We need at least 3 ads. Try scraping more data or
          wait for the next library update.
        </p>
      ) : null}

      {prorate ? <p className={`text-[10px] ${subtext} mt-2 italic`}>{prorate}</p> : null}

      <div className={`mt-4 ${whyBox}`}>
        <p className={`text-[10px] font-bold uppercase tracking-wide ${whyTitle} mb-2`}>Why this score</p>
        <ul className="space-y-1.5">
          {d.topReasons.slice(0, 5).map((r, i) => (
            <li key={`${r.signal}-${i}`} className={`text-[12px] ${reasonText} leading-snug flex gap-1.5`}>
              <span className={`shrink-0 ${isAnalytics ? "text-[#64748b]" : ""}`} aria-hidden>
                {r.type === "positive" ? "✓" : "✗"}
              </span>
              <span>{r.text}</span>
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={`mt-3 flex w-full items-center justify-between text-left text-[12px] font-semibold ${subtext} ${breakdownHover}`}
      >
        <span>View signal breakdown</span>
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {expanded ? (
        <div className={`mt-3 space-y-3 border-t ${breakdownBorder} pt-3`}>
          {SIGNAL_ORDER.map((key) => {
            const block = d.signals[key];
            const label = SIGNAL_LABEL[key];
            const pct = block.score;
            return (
              <div key={key}>
                <div className="flex justify-between gap-2 text-[11px] mb-0.5">
                  <span className={`${isAnalytics ? "text-[#0f172a]" : "text-[#3f3f46]"} font-medium`}>{label}</span>
                  <span className={`tabular-nums ${subtext}`}>
                    {pct}/100 · weight {Math.round(block.weight * 100)}% · +{block.contribution.toFixed(1)} pts
                  </span>
                </div>
                <div className={`h-1.5 rounded-full ${barTrack} overflow-hidden`}>
                  <div className={`h-full rounded-full ${signalBar}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
