"use client";

import { Globe2, GitCompareArrows } from "lucide-react";

import {
  PATTERNS_TIMEZONE_OPTIONS,
  resolvePatternsTimezone,
  type PatternsDisplayPrefs,
} from "@/lib/discovery/pattern-display-utils";
import { glassSelectClass } from "@/components/ui/glass-styles";
import { cn } from "@/lib/utils";

type Props = {
  prefs: PatternsDisplayPrefs;
  onChange: (prefs: PatternsDisplayPrefs) => void;
  weekRangeLabel: string;
  className?: string;
};

function TogglePill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition-all duration-200",
        active
          ? "bg-slate-900 text-white shadow-[0_8px_24px_-8px_rgba(15,23,42,0.45)]"
          : "border border-white/70 bg-white/40 text-slate-600 hover:bg-white/60",
      )}
    >
      {children}
    </button>
  );
}

export function DiscoveryPatternsControls({ prefs, onChange, weekRangeLabel, className }: Props) {
  const resolvedTz = resolvePatternsTimezone(prefs.timezone);
  const tzLabel =
    PATTERNS_TIMEZONE_OPTIONS.find((o) => o.id === prefs.timezone)?.label ??
    prefs.timezone;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/70 bg-white/40 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_8px_32px_-12px_rgba(74,127,165,0.12)] backdrop-blur-xl backdrop-saturate-150 ring-1 ring-white/55",
        className,
      )}
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-800">{weekRangeLabel}</p>
        <p className="text-xs text-slate-500">Weeks start Monday 00:00 UTC · shown in {tzLabel}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <TogglePill
          active={prefs.compare}
          onClick={() => onChange({ ...prefs, compare: !prefs.compare })}
        >
          <GitCompareArrows className="h-4 w-4" aria-hidden />
          Compare prior week
        </TogglePill>

        <label className="relative inline-flex items-center gap-2">
          <Globe2 className="h-4 w-4 text-slate-500" aria-hidden />
          <select
            value={prefs.timezone}
            onChange={(e) => onChange({ ...prefs, timezone: e.target.value })}
            className={cn(glassSelectClass, "h-10 min-w-[9rem] py-2 text-sm")}
            aria-label="Chart timezone"
          >
            {PATTERNS_TIMEZONE_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <span className="sr-only">Resolved timezone: {resolvedTz}</span>
    </div>
  );
}
