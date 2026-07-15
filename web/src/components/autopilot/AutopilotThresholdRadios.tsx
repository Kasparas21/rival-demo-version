"use client";

import { useEffect, useState, type ComponentProps } from "react";

import {
  WATCH_MIN_SCORE_MAX,
  WATCH_MIN_SCORE_MIN,
  alertVolumeToMinScore,
  minScoreToAlertVolume,
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

function volumeFillPercent(volume: number): number {
  const span = WATCH_MIN_SCORE_MAX - WATCH_MIN_SCORE_MIN;
  if (span <= 0) return 0;
  return ((volume - WATCH_MIN_SCORE_MIN) / span) * 100;
}

type AlertVolumeRangeProps = {
  fillPercent: number;
  variant: "modal" | "page";
  disabled?: boolean;
  rangeInputProps: Omit<ComponentProps<"input">, "type" | "className" | "style" | "disabled">;
};

function AlertVolumeRange({ fillPercent, variant, disabled, rangeInputProps }: AlertVolumeRangeProps) {
  const fillClass =
    variant === "page"
      ? "bg-gradient-to-r from-slate-700 to-slate-900"
      : "bg-gradient-to-r from-emerald-500 to-emerald-600";

  return (
    <div className="relative flex h-5 w-full items-center">
      <div className="pointer-events-none absolute inset-x-0 h-2 rounded-full bg-slate-200/80" aria-hidden>
        <div
          className={cn(
            "h-full rounded-full motion-safe:transition-[width] motion-safe:duration-150 motion-safe:ease-out",
            fillClass,
          )}
          style={{ width: `${fillPercent}%` }}
        />
      </div>
      <input
        type="range"
        {...rangeInputProps}
        disabled={disabled}
        className={cn(
          "relative z-10 h-5 w-full cursor-pointer appearance-none bg-transparent disabled:cursor-not-allowed disabled:opacity-50",
          "[&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-transparent",
          "[&::-webkit-slider-thumb]:-mt-1 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md",
          variant === "page"
            ? "[&::-webkit-slider-thumb]:bg-slate-900 [&::-moz-range-thumb]:bg-slate-900"
            : "[&::-webkit-slider-thumb]:bg-emerald-600 [&::-moz-range-thumb]:bg-emerald-600",
          "[&::-moz-range-track]:h-2 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-transparent",
          "[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0",
        )}
      />
    </div>
  );
}

export function AutopilotThresholdSlider({
  value,
  disabled,
  variant = "modal",
  onChange,
}: AutopilotThresholdSliderProps) {
  const clampedMinScore = Math.min(WATCH_MIN_SCORE_MAX, Math.max(WATCH_MIN_SCORE_MIN, Math.round(value)));
  const [dragVolume, setDragVolume] = useState<number | null>(null);
  const alertVolume = minScoreToAlertVolume(clampedMinScore);
  const displayedVolume = dragVolume ?? alertVolume;
  const displayedMinScore = alertVolumeToMinScore(displayedVolume);

  useEffect(() => {
    setDragVolume(null);
  }, [clampedMinScore]);

  const commit = (nextVolume: number) => {
    const volume = Math.min(WATCH_MIN_SCORE_MAX, Math.max(WATCH_MIN_SCORE_MIN, Math.round(nextVolume)));
    const score = alertVolumeToMinScore(volume);
    setDragVolume(null);
    onChange(score, {
      watch_min_score: score,
      watch_sensitivity: watchSensitivityForMinScore(score),
    });
  };

  const rangeInputProps = {
    min: WATCH_MIN_SCORE_MIN,
    max: WATCH_MIN_SCORE_MAX,
    step: 1 as const,
    value: displayedVolume,
    disabled,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setDragVolume(Number(e.target.value)),
    onPointerUp: (e: React.PointerEvent<HTMLInputElement>) => commit(Number(e.currentTarget.value)),
    onKeyUp: (e: React.KeyboardEvent<HTMLInputElement>) => commit(Number(e.currentTarget.value)),
    "aria-label": "How many competitor alerts you receive",
    "aria-valuemin": WATCH_MIN_SCORE_MIN,
    "aria-valuemax": WATCH_MIN_SCORE_MAX,
    "aria-valuenow": displayedVolume,
  };

  const fillPercent = volumeFillPercent(displayedVolume);

  if (variant === "page") {
    return (
      <div className="space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-semibold text-[#111827]">{watchThresholdLabel(displayedMinScore)}</p>
          <p className="text-sm font-bold tabular-nums text-[#111827]">{displayedVolume}/10</p>
        </div>
        <AlertVolumeRange
          fillPercent={fillPercent}
          variant="page"
          disabled={disabled}
          rangeInputProps={rangeInputProps}
        />
        <div className="flex justify-between text-[11px] text-[#6B7280]">
          <span>Fewer alerts</span>
          <span>More alerts</span>
        </div>
        <p className="text-xs text-[#6B7280]">{watchThresholdHint(displayedMinScore)}</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3 p-3.5", autopilotGlassCardClass)}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-[#1a1a2e]">{watchThresholdLabel(displayedMinScore)}</p>
          <p className="mt-0.5 text-[11px] text-[#71717a]">{watchThresholdHint(displayedMinScore)}</p>
        </div>
        <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-300/40">
          <span className="text-[15px] font-bold tabular-nums leading-none text-emerald-800">{displayedVolume}</span>
          <span className="mt-0.5 text-[8px] font-semibold uppercase tracking-wide text-emerald-700/80">volume</span>
        </div>
      </div>

      <AlertVolumeRange
        fillPercent={fillPercent}
        variant="modal"
        disabled={disabled}
        rangeInputProps={rangeInputProps}
      />

      <div className="flex justify-between text-[10px] font-medium text-[#a1a1aa]">
        <span>Fewer alerts</span>
        <span>More alerts</span>
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
