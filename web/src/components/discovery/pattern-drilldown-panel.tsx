"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Loader2, Trophy } from "lucide-react";

import type {
  PatternDrilldownAd,
  PatternDrilldownCompetitorGroup,
  PatternDrilldownResult,
} from "@/lib/discovery/types";
import { aiGlassCardClass, aiGlassInsetClass } from "@/lib/ad-detail/ad-preview-analysis-styles";
import { cn } from "@/lib/utils";

type DrilldownQuery = {
  brandId: string;
  weekStart: string;
  title?: string;
  angle?: string;
  adIds?: string[];
  competitorId?: string;
  launchedOnly?: boolean;
  killedOnly?: boolean;
};

type Props = {
  query: DrilldownQuery;
  onOpenAd: (adId: string) => void;
  className?: string;
};

const STATUS_LABELS: Record<PatternDrilldownAd["status"], string> = {
  new_this_week: "New this week",
  active: "Still running",
  ultimate_winner: "Ultimate winner",
  killed_this_week: "Turned off this week",
  killed: "Previously retired",
};

const STATUS_STYLES: Record<PatternDrilldownAd["status"], string> = {
  new_this_week: "bg-emerald-100 text-emerald-800",
  active: "bg-sky-100 text-sky-800",
  ultimate_winner: "bg-amber-100 text-amber-800",
  killed_this_week: "bg-rose-100 text-rose-800",
  killed: "bg-slate-100 text-slate-600",
};

function buildDrilldownUrl(query: DrilldownQuery): string {
  const params = new URLSearchParams({
    brandId: query.brandId,
    weekStart: query.weekStart,
  });
  if (query.title) params.set("title", query.title);
  if (query.angle) params.set("angle", query.angle);
  if (query.competitorId) params.set("competitorId", query.competitorId);
  if (query.adIds?.length) params.set("adIds", query.adIds.join(","));
  if (query.launchedOnly) params.set("launchedOnly", "1");
  if (query.killedOnly) params.set("killedOnly", "1");
  return `/api/discovery/patterns/drilldown?${params.toString()}`;
}

function AdRow({ ad, onOpenAd }: { ad: PatternDrilldownAd; onOpenAd: (id: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpenAd(ad.id)}
      className={cn(aiGlassInsetClass, "flex w-full items-start gap-2 px-3 py-2.5 text-left transition hover:bg-white/80")}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm font-semibold text-slate-900">{ad.competitor_name}</span>
          <span
            className={cn(
              "rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase",
              STATUS_STYLES[ad.status],
            )}
          >
            {STATUS_LABELS[ad.status]}
          </span>
          {ad.is_ultimate_winner ? (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-amber-700">
              <Trophy className="h-3 w-3" aria-hidden />
              Winner
            </span>
          ) : null}
        </div>
        <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-slate-600">{ad.preview}</p>
        <p className="mt-1 text-xs text-slate-400">
          {ad.format || "ad"} · {ad.days_running}d running
          {ad.impressions_index != null ? ` · index ${ad.impressions_index}` : ""}
          {ad.launched ? ` · launched ${ad.launched}` : ""}
        </p>
      </div>
      <ChevronRight className="mt-1 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
    </button>
  );
}

function CompetitorGroup({
  group,
  onOpenAd,
}: {
  group: PatternDrilldownCompetitorGroup;
  onOpenAd: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className={cn(aiGlassCardClass, "overflow-hidden")}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
      >
        <span className="text-sm font-semibold text-slate-800">
          {group.name}
          <span className="ml-1.5 font-normal text-slate-500">({group.ads.length})</span>
        </span>
        <ChevronDown
          className={cn("h-3.5 w-3.5 text-slate-500 transition-transform", open ? "rotate-180" : "")}
          aria-hidden
        />
      </button>
      {open ? (
        <div className="space-y-1.5 px-2 pb-2">
          {group.ads.map((ad) => (
            <AdRow key={ad.id} ad={ad} onOpenAd={onOpenAd} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function StatusSummary({ result }: { result: PatternDrilldownResult }) {
  const items = [
    { label: "New", count: result.groups.new_this_week.length, className: "text-emerald-700" },
    { label: "Running", count: result.groups.active.length, className: "text-sky-700" },
    { label: "Killed", count: result.groups.killed_this_week.length, className: "text-rose-700" },
    { label: "Retired", count: result.groups.killed.length, className: "text-slate-600" },
  ].filter((item) => item.count > 0);

  if (!items.length) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span key={item.label} className={cn("text-sm font-semibold", item.className)}>
          {item.count} {item.label.toLowerCase()}
        </span>
      ))}
    </div>
  );
}

export function PatternDrilldownPanel({ query, onOpenAd, className }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PatternDrilldownResult | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(buildDrilldownUrl(query), { credentials: "include", cache: "no-store" });
      const json = (await res.json()) as PatternDrilldownResult & { ok: boolean; error?: string };
      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? "Failed to load ads");
      }
      const { ok: _ok, error: _error, ...result } = json;
      setResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load ads");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className={cn("flex items-center gap-2 py-3 text-sm text-slate-500", className)}>
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        Loading ads…
      </div>
    );
  }

  if (error) {
    return <p className={cn("py-2 text-xs text-red-600", className)}>{error}</p>;
  }

  if (!result || result.total === 0) {
    return <p className={cn("py-2 text-xs text-slate-500", className)}>No matching ads found.</p>;
  }

  return (
    <div className={cn("space-y-3", className)}>
      <StatusSummary result={result} />
      <div className="space-y-2">
        {result.by_competitor.map((group) => (
          <CompetitorGroup key={group.competitor_id} group={group} onOpenAd={onOpenAd} />
        ))}
      </div>
    </div>
  );
}
