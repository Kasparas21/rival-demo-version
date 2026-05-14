"use client";

import { ComparisonPlatformIcon } from "@/components/comparison/platform-icon";
import { cn } from "@/lib/utils";
import type { StrategyPlatform } from "@/lib/strategy-overview/payload-types";

import type { TimelineSort, TimelineZoom } from "./timeline-types";

type PlatformChip = { id: string; label: string; count: number };

type Props = {
  zoom: TimelineZoom;
  onZoom: (z: TimelineZoom) => void;
  platforms: PlatformChip[];
  selectedPlatforms: Set<string>;
  onTogglePlatform: (id: string) => void;
  showActive: boolean;
  showRetired: boolean;
  onShowActive: (v: boolean) => void;
  onShowRetired: (v: boolean) => void;
  showBrandBids: boolean;
  onShowBrandBids: (v: boolean) => void;
  hiddenBrandBidCount: number;
  sort: TimelineSort;
  onSort: (s: TimelineSort) => void;
};

const ZOOMS: { id: TimelineZoom; label: string }[] = [
  { id: "30d", label: "30D" },
  { id: "90d", label: "90D" },
  { id: "6mo", label: "6MO" },
  { id: "1y", label: "1Y" },
  { id: "all", label: "All time" },
];

export function TimelineFiltersBar(props: Props) {
  const {
    zoom,
    onZoom,
    platforms,
    selectedPlatforms,
    onTogglePlatform,
    showActive,
    showRetired,
    onShowActive,
    onShowRetired,
    showBrandBids,
    onShowBrandBids,
    hiddenBrandBidCount,
    sort,
    onSort,
  } = props;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="w-full text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 sm:w-auto">Range</span>
        <div className="inline-flex flex-wrap rounded-xl border border-slate-200 bg-slate-50/80 p-1">
          {ZOOMS.map((z) => (
            <button
              key={z.id}
              type="button"
              onClick={() => onZoom(z.id)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                zoom === z.id ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-white",
              )}
            >
              {z.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Platform</span>
        <div className="mt-2 flex flex-wrap gap-2">
          {platforms.map((p) => {
            const on = selectedPlatforms.has(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onTogglePlatform(p.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-semibold transition",
                  on ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                )}
              >
                <ComparisonPlatformIcon platform={p.id as StrategyPlatform} className="h-3.5 w-3.5" />
                {p.label}
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0 text-[10px] font-bold tabular-nums",
                    on ? "bg-white/15 text-white" : "bg-slate-100 text-slate-700",
                  )}
                >
                  {p.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Show</span>
          <div className="mt-2 flex flex-wrap gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 has-[:checked]:border-slate-900 has-[:checked]:bg-slate-900 has-[:checked]:text-white">
              <input
                type="checkbox"
                className="sr-only"
                checked={showActive}
                onChange={(e) => onShowActive(e.target.checked)}
              />
              Active
            </label>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 has-[:checked]:border-slate-900 has-[:checked]:bg-slate-900 has-[:checked]:text-white">
              <input
                type="checkbox"
                className="sr-only"
                checked={showRetired}
                onChange={(e) => onShowRetired(e.target.checked)}
              />
              Retired
            </label>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 has-[:checked]:border-slate-400 has-[:checked]:bg-slate-100">
              <input
                type="checkbox"
                className="sr-only"
                checked={showBrandBids}
                onChange={(e) => onShowBrandBids(e.target.checked)}
              />
              Brand bids
            </label>
          </div>
          {!showBrandBids && hiddenBrandBidCount > 0 ? (
            <p className="mt-2 text-xs text-slate-500">
              {hiddenBrandBidCount} brand-bid ads hidden · check “Brand bids” to show
            </p>
          ) : null}
        </div>

        <div className="min-w-[200px]">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Sort</span>
          <select
            value={sort}
            onChange={(e) => onSort(e.target.value as TimelineSort)}
            className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900"
          >
            <option value="newest">Newest first</option>
            <option value="longest">Longest running</option>
            <option value="recently_killed">Most recently killed</option>
            <option value="platform">Platform grouped</option>
          </select>
        </div>
      </div>
    </div>
  );
}
