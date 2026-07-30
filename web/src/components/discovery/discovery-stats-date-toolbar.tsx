"use client";

import { Calendar } from "lucide-react";

import { DISCOVERY_STATS_DATE_PRESETS } from "@/lib/discovery/discovery-stats-range";
import type { DiscoveryToolbarState } from "@/components/discovery/discovery-types";
import { cn } from "@/lib/utils";

type Props = {
  state: DiscoveryToolbarState;
  onChange: (patch: Partial<DiscoveryToolbarState>) => void;
  rangeLabel: string;
  className?: string;
};

export function DiscoveryStatsDateToolbar({ state, onChange, rangeLabel, className }: Props) {
  const hasCustom = Boolean(state.statsDateFrom || state.statsDateTo);

  return (
    <section
      className={cn(
        "rounded-2xl border border-slate-200/80 bg-gradient-to-br from-violet-50/70 to-white p-4 shadow-[0_4px_24px_rgba(15,23,42,0.04)]",
        className,
      )}
      aria-label="Stats date range"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <Calendar className="h-3.5 w-3.5 text-violet-600" aria-hidden />
            Time period
          </div>
          <p className="mt-1 text-sm font-medium text-slate-800">{rangeLabel}</p>
          <p className="mt-0.5 text-xs text-slate-500">All stats and leaderboards use this window</p>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">From</span>
            <input
              type="date"
              value={state.statsDateFrom ?? ""}
              onChange={(e) =>
                onChange({
                  statsDateFrom: e.target.value || null,
                })
              }
              className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-900"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">To</span>
            <input
              type="date"
              value={state.statsDateTo ?? ""}
              onChange={(e) =>
                onChange({
                  statsDateTo: e.target.value || null,
                })
              }
              className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-900"
            />
          </label>
          {hasCustom ? (
            <button
              type="button"
              onClick={() => onChange({ statsDateFrom: null, statsDateTo: null })}
              className="mb-0.5 h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Clear dates
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-200/70 pt-3">
        {DISCOVERY_STATS_DATE_PRESETS.map((preset) => {
          const selected = !hasCustom && state.datePreset === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() =>
                onChange({
                  datePreset: preset.id,
                  statsDateFrom: null,
                  statsDateTo: null,
                })
              }
              className={cn(
                "rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors",
                selected
                  ? "bg-slate-900 text-white shadow-sm"
                  : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
              )}
            >
              {preset.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
