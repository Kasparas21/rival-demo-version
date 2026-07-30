"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronRight, Loader2, Trophy } from "lucide-react";

import type { DiscoveryToolbarState } from "@/components/discovery/discovery-types";
import { aiGlassCardClass, aiGlassInsetClass } from "@/lib/ad-detail/ad-preview-analysis-styles";
import type {
  DiscoveryStatsDrilldownKind,
  DiscoveryStatsDrilldownRef,
  PatternDrilldownAd,
  PatternDrilldownResult,
} from "@/lib/discovery/types";
import { cn } from "@/lib/utils";

type StatsDrilldownQuery = {
  brandId: string;
  toolbar: DiscoveryToolbarState;
  allClientBrandIds: string[];
  kind: DiscoveryStatsDrilldownKind;
  competitorId?: string;
  adIds?: string[];
  title?: string;
};

function buildStatsDrilldownUrl(query: StatsDrilldownQuery): string {
  const params = new URLSearchParams({
    brandId: query.brandId,
    kind: query.kind,
    datePreset: query.toolbar.datePreset,
  });
  if (query.toolbar.statsDateFrom) params.set("statsDateFrom", query.toolbar.statsDateFrom);
  if (query.toolbar.statsDateTo) params.set("statsDateTo", query.toolbar.statsDateTo);
  if (query.title) params.set("title", query.title);
  if (query.competitorId) params.set("scopeCompetitorId", query.competitorId);
  if (query.adIds?.length) params.set("adIds", query.adIds.join(","));

  for (const id of query.toolbar.selectedCompetitorIds) {
    params.append("competitorId", id);
  }

  return `/api/discovery/stats/drilldown?${params.toString()}`;
}

const STATUS_LABELS: Record<PatternDrilldownAd["status"], string> = {
  new_this_week: "Launched in period",
  active: "Still running",
  ultimate_winner: "Ultimate winner",
  killed_this_week: "Turned off in period",
  killed: "Previously retired",
};

const STATUS_STYLES: Record<PatternDrilldownAd["status"], string> = {
  new_this_week: "bg-emerald-100 text-emerald-800",
  active: "bg-sky-100 text-sky-800",
  ultimate_winner: "bg-amber-100 text-amber-800",
  killed_this_week: "bg-rose-100 text-rose-800",
  killed: "bg-slate-100 text-slate-600",
};

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
        </p>
      </div>
      <ChevronRight className="mt-1 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
    </button>
  );
}

type Props = {
  brandId: string;
  toolbar: DiscoveryToolbarState;
  allClientBrandIds: string[];
  drilldown: DiscoveryStatsDrilldownRef & { title?: string };
  onOpenAd: (adId: string) => void;
  onClose: () => void;
};

export function StatsDrilldownPanel({
  brandId,
  toolbar,
  allClientBrandIds,
  drilldown,
  onOpenAd,
  onClose,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PatternDrilldownResult | null>(null);

  const url = buildStatsDrilldownUrl({
    brandId,
    toolbar,
    allClientBrandIds,
    kind: drilldown.kind,
    competitorId: drilldown.competitor_id,
    adIds: drilldown.ad_ids ?? (drilldown.ad_id ? [drilldown.ad_id] : undefined),
    title: drilldown.title,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(url, { credentials: "include", cache: "no-store" });
      const json = (await res.json()) as PatternDrilldownResult & { ok: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Failed to load ads");
      const { ok: _ok, error: _err, ...payload } = json;
      setResult(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load ads");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900">
          {drilldown.title ?? result?.title ?? "Matching ads"}
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100"
        >
          Close
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-3 text-sm text-slate-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          Loading ads…
        </div>
      ) : error ? (
        <p className="py-2 text-xs text-red-600">{error}</p>
      ) : !result || result.total === 0 ? (
        <p className="py-2 text-xs text-slate-500">No matching ads in this period.</p>
      ) : (
        <div className="space-y-2">
          {result.by_competitor.map((group) => (
            <div key={group.competitor_id} className={cn(aiGlassCardClass, "overflow-hidden")}>
              <p className="px-4 py-2.5 text-sm font-semibold text-slate-800">
                {group.name}
                <span className="ml-1.5 font-normal text-slate-500">({group.ads.length})</span>
              </p>
              <div className="space-y-1.5 px-2 pb-2">
                {group.ads.map((ad) => (
                  <AdRow key={ad.id} ad={ad} onOpenAd={onOpenAd} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
