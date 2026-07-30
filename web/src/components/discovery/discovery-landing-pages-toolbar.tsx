"use client";

import { Globe } from "lucide-react";

import {
  CHANGE_FILTER_OPTIONS,
  type ChangeFilterKind,
} from "@/components/website-tracker/change-display";
import {
  DISCOVERY_LANDING_PAGES_WINDOWS,
  type DiscoveryToolbarState,
} from "@/components/discovery/discovery-types";
import { cn } from "@/lib/utils";

type Props = {
  state: DiscoveryToolbarState;
  onChange: (patch: Partial<DiscoveryToolbarState>) => void;
  total: number;
  filterCounts?: Partial<Record<ChangeFilterKind, number>>;
  className?: string;
};

export function DiscoveryLandingPagesToolbar({
  state,
  onChange,
  total,
  filterCounts,
  className,
}: Props) {
  const activeWindow =
    DISCOVERY_LANDING_PAGES_WINDOWS.find((w) => w.id === state.datePreset) ??
    DISCOVERY_LANDING_PAGES_WINDOWS.find((w) => w.id === "7d")!;

  const visibleChangeFilters = CHANGE_FILTER_OPTIONS.filter((opt) => {
    if (opt.id === "all") return true;
    const count = filterCounts?.[opt.id] ?? 0;
    return count > 0 || state.changeFilter === opt.id;
  });

  return (
    <section
      className={cn(
        "rounded-2xl border border-slate-200/80 bg-gradient-to-br from-emerald-50/70 to-white p-3 shadow-[0_4px_24px_rgba(15,23,42,0.04)]",
        className,
      )}
      aria-label="Landing page change filters"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <Globe className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
            Landing page changes
          </div>
          <p className="mt-1 text-sm text-slate-600">
            {total > 0
              ? `${total.toLocaleString()} change${total === 1 ? "" : "s"} ${activeWindow.description.toLowerCase()}`
              : `No changes ${activeWindow.description.toLowerCase()}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {DISCOVERY_LANDING_PAGES_WINDOWS.map((window) => {
            const selected = state.datePreset === window.id;
            return (
              <button
                key={window.id}
                type="button"
                title={window.description}
                onClick={() => onChange({ datePreset: window.id })}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors",
                  selected
                    ? "bg-slate-900 text-white shadow-sm"
                    : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
                )}
              >
                {window.label}
              </button>
            );
          })}
        </div>
      </div>

      {visibleChangeFilters.length > 1 ? (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-200/70 pt-3">
          {visibleChangeFilters.map((opt) => {
            const active = state.changeFilter === opt.id;
            const count =
              opt.id === "all"
                ? (filterCounts?.all ?? total)
                : (filterCounts?.[opt.id] ?? 0);
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChange({ changeFilter: opt.id })}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors",
                  active
                    ? opt.activeClass
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
                )}
              >
                {opt.label}
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                    active ? "bg-white/20 text-inherit" : "bg-slate-100 text-slate-500",
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
