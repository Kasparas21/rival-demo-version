"use client";

import {
  WATCH_MIN_SCORE_MAX,
  WATCH_MIN_SCORE_MIN,
  watchSensitivityForMinScore,
  watchThresholdHint,
  watchThresholdLabel,
} from "@/lib/autopilot/watch-alert-score";
import { autopilotGlassCardClass } from "@/components/autopilot/autopilot-glass-ui";
import { cn } from "@/lib/utils";

type AutopilotThresholdSliderProps = {
  value: number;
  disabled?: boolean;
  variant?: "modal" | "page";
  onChange: (minScore: number, patch: { watch_min_score: number; watch_sensitivity: string }) => void;
};

export function AutopilotThresholdSlider({
  value,
  disabled,
  variant = "modal",
  onChange,
}: AutopilotThresholdSliderProps) {
  const clamped = Math.min(WATCH_MIN_SCORE_MAX, Math.max(WATCH_MIN_SCORE_MIN, Math.round(value)));

  const handleChange = (next: number) => {
    const score = Math.min(WATCH_MIN_SCORE_MAX, Math.max(WATCH_MIN_SCORE_MIN, Math.round(next)));
    onChange(score, {
      watch_min_score: score,
      watch_sensitivity: watchSensitivityForMinScore(score),
    });
  };

  if (variant === "page") {
    return (
      <div className="space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-semibold text-[#111827]">{watchThresholdLabel(clamped)}</p>
          <p className="text-sm font-bold tabular-nums text-[#111827]">{clamped}+</p>
        </div>
        <input
          type="range"
          min={WATCH_MIN_SCORE_MIN}
          max={WATCH_MIN_SCORE_MAX}
          step={1}
          value={clamped}
          disabled={disabled}
          onChange={(e) => handleChange(Number(e.target.value))}
          className="w-full accent-[#111827] disabled:opacity-50"
          aria-label="Alert threshold"
        />
        <div className="flex justify-between text-[11px] text-[#6B7280]">
          <span>1 · More alerts</span>
          <span>10 · Fewer alerts</span>
        </div>
        <p className="text-xs text-[#6B7280]">{watchThresholdHint(clamped)}</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3 p-3.5", autopilotGlassCardClass)}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-[#1a1a2e]">{watchThresholdLabel(clamped)}</p>
          <p className="mt-0.5 text-[11px] text-[#71717a]">{watchThresholdHint(clamped)}</p>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-300/40">
          <span className="text-[15px] font-bold tabular-nums text-emerald-800">{clamped}+</span>
        </div>
      </div>

      <input
        type="range"
        min={WATCH_MIN_SCORE_MIN}
        max={WATCH_MIN_SCORE_MAX}
        step={1}
        value={clamped}
        disabled={disabled}
        onChange={(e) => handleChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200/80 accent-emerald-600 disabled:cursor-not-allowed disabled:opacity-50 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-600 [&::-webkit-slider-thumb]:shadow-md"
        aria-label="Alert threshold"
        aria-valuemin={WATCH_MIN_SCORE_MIN}
        aria-valuemax={WATCH_MIN_SCORE_MAX}
        aria-valuenow={clamped}
      />

      <div className="flex justify-between text-[10px] font-medium text-[#a1a1aa]">
        <span>1 — sensitive</span>
        <span>10 — strict</span>
      </div>
    </div>
  );
}

/** @deprecated Use AutopilotThresholdSlider */
export const AutopilotThresholdRadios = AutopilotThresholdSlider;

export function AutopilotThresholdHeading({ variant = "modal" }: { variant?: "modal" | "page" }) {
  if (variant === "page") {
    return <div className="text-xs font-medium text-[#6B7280] mb-2 uppercase tracking-wide">Alert threshold</div>;
  }
  return null;
}
