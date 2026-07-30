"use client";

import { Sparkles } from "lucide-react";

import {
  DISCOVERY_WHATS_NEW_WINDOWS,
  type DiscoveryToolbarState,
} from "@/components/discovery/discovery-types";
import { cn } from "@/lib/utils";

type Props = {
  state: DiscoveryToolbarState;
  onChange: (patch: Partial<DiscoveryToolbarState>) => void;
  total: number;
  className?: string;
};

export function DiscoveryWhatsNewToolbar({ state, onChange, total, className }: Props) {
  const activeWindow =
    DISCOVERY_WHATS_NEW_WINDOWS.find((w) => w.id === state.datePreset) ??
    DISCOVERY_WHATS_NEW_WINDOWS.find((w) => w.id === "7d")!;

  return (
    <section
      className={cn(
        "rounded-2xl border border-slate-200/80 bg-gradient-to-br from-sky-50/70 to-white p-3 shadow-[0_4px_24px_rgba(15,23,42,0.04)]",
        className,
      )}
      aria-label="What's new filters"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <Sparkles className="h-3.5 w-3.5 text-sky-600" aria-hidden />
            What&apos;s new
          </div>
          <p className="mt-1 text-sm text-slate-600">
            {total > 0
              ? `${total.toLocaleString()} ad${total === 1 ? "" : "s"} launched ${activeWindow.description.toLowerCase()}`
              : `No launches ${activeWindow.description.toLowerCase()}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {DISCOVERY_WHATS_NEW_WINDOWS.map((window) => {
            const selected = state.datePreset === window.id;
            return (
              <button
                key={window.id}
                type="button"
                title={window.description}
                onClick={() =>
                  onChange({
                    datePreset: window.id,
                    dateFilterMode: "launched",
                    sort: "newest",
                  })
                }
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
    </section>
  );
}
