"use client";

import { WATCH_THRESHOLD_OPTIONS, watchSensitivityForMinScore } from "@/lib/autopilot/watch-alert-score";
import { autopilotGlassCardClass, autopilotGlassCardActiveClass } from "@/components/autopilot/autopilot-glass-ui";
import { cn } from "@/lib/utils";

type AutopilotThresholdRadiosProps = {
  value: 6 | 8 | 9;
  disabled?: boolean;
  variant?: "modal" | "page";
  onChange: (minScore: 6 | 8 | 9, patch: { watch_min_score: number; watch_sensitivity: string }) => void;
};

const SCORE_BADGE: Record<6 | 8 | 9, string> = {
  6: "6+",
  8: "8+",
  9: "9+",
};

export function AutopilotThresholdRadios({
  value,
  disabled,
  variant = "modal",
  onChange,
}: AutopilotThresholdRadiosProps) {
  if (variant === "page") {
    return (
      <div className="grid gap-2 sm:grid-cols-3">
        {WATCH_THRESHOLD_OPTIONS.map((opt) => {
          const selected = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              disabled={disabled}
              onClick={() =>
                onChange(opt.value, {
                  watch_min_score: opt.value,
                  watch_sensitivity: watchSensitivityForMinScore(opt.value),
                })
              }
              className={`rounded-xl border px-3 py-3 text-left transition ${
                selected ? "border-[#111827] bg-[#F9FAFB]" : "border-[#E5E7EB] bg-white hover:border-[#D1D5DB]"
              } ${disabled ? "opacity-50" : ""}`}
            >
              <div className="text-sm font-medium text-[#111827]">{opt.label}</div>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {WATCH_THRESHOLD_OPTIONS.map((opt) => {
        const selected = value === opt.value;
        const shortLabel = opt.label.split(" — ")[0] ?? opt.label;
        return (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onClick={() =>
              onChange(opt.value, {
                watch_min_score: opt.value,
                watch_sensitivity: watchSensitivityForMinScore(opt.value),
              })
            }
            className={cn(
              autopilotGlassCardClass,
              "flex w-full items-center gap-3 p-2.5 text-left",
              selected && autopilotGlassCardActiveClass,
              disabled && "opacity-50",
            )}
          >
            <span
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold tabular-nums",
                selected
                  ? "bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-300/50"
                  : "bg-white/60 text-[#52525b] ring-1 ring-white/70",
              )}
            >
              {SCORE_BADGE[opt.value]}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-medium text-[#1a1a2e]">{shortLabel}</span>
              <span className="block text-[10px] text-[#71717a]">score {opt.value}+</span>
            </span>
            <span
              className={cn(
                "h-4 w-4 shrink-0 rounded-full border-2 transition",
                selected ? "border-emerald-500 bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.2)]" : "border-[#d4d4d8] bg-white/50",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

export function AutopilotThresholdHeading({ variant = "modal" }: { variant?: "modal" | "page" }) {
  if (variant === "page") {
    return <div className="text-xs font-medium text-[#6B7280] mb-2 uppercase tracking-wide">Alert threshold</div>;
  }
  return null;
}
