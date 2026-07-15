"use client";

import { useEffect, useId, useState } from "react";

import type { AdPreviewPsychologicalScores } from "@/lib/ad-detail/ad-ai-analysis-types";
import { PSYCHOLOGICAL_SCORE_LABELS } from "@/lib/ad-detail/ad-ai-analysis-types";
import { aiGlassShellClass } from "@/lib/ad-detail/ad-preview-analysis-styles";

const SIZE = 240;
const CX = SIZE / 2;
const CY = SIZE / 2;
const MAX_R = 72;
const LABEL_R = 102;
const VIEW_PAD = 28;
const SCORE_PILL_W = 26;
const SCORE_PILL_H = 14;

function labelTextAnchor(x: number): "start" | "middle" | "end" {
  if (x < CX - 10) return "end";
  if (x > CX + 10) return "start";
  return "middle";
}

function polarToCartesian(angleRad: number, radius: number): { x: number; y: number } {
  return {
    x: CX + radius * Math.cos(angleRad),
    y: CY + radius * Math.sin(angleRad),
  };
}

function scorePolygonPoints(scores: AdPreviewPsychologicalScores): string {
  const keys = PSYCHOLOGICAL_SCORE_LABELS.map((l) => l.key);
  const step = (2 * Math.PI) / keys.length;
  const start = -Math.PI / 2;

  return keys
    .map((key, i) => {
      const value = scores[key];
      const r = (Math.max(0, Math.min(100, value)) / 100) * MAX_R;
      const { x, y } = polarToCartesian(start + i * step, r);
      return `${x},${y}`;
    })
    .join(" ");
}

function gridRingPoints(fraction: number): string {
  const step = (2 * Math.PI) / 6;
  const start = -Math.PI / 2;
  const r = MAX_R * fraction;
  return Array.from({ length: 6 }, (_, i) => {
    const { x, y } = polarToCartesian(start + i * step, r);
    return `${x},${y}`;
  }).join(" ");
}

type Props = {
  scores: AdPreviewPsychologicalScores;
  animate?: boolean;
};

export function PsychologicalRadarChart({ scores, animate = true }: Props) {
  const gradientId = useId().replace(/:/g, "");
  const step = (2 * Math.PI) / 6;
  const start = -Math.PI / 2;
  const [mounted, setMounted] = useState(!animate);

  useEffect(() => {
    if (!animate) {
      setMounted(true);
      return;
    }
    setMounted(false);
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => setMounted(true));
    });
    return () => cancelAnimationFrame(frame);
  }, [animate, scores]);

  return (
    <div className={`${aiGlassShellClass} p-4`}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/95 to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-[color-mix(in_srgb,var(--rival-success)_22%,transparent)] blur-2xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-[color-mix(in_srgb,var(--rival-accent-blue)_45%,transparent)] blur-2xl"
      />

      <div className={`relative mx-auto w-full max-w-[280px] ${mounted ? "ai-radar-expand" : "scale-[0.08] opacity-0"}`}>
        <svg
          viewBox={`${-VIEW_PAD} ${-VIEW_PAD} ${SIZE + VIEW_PAD * 2} ${SIZE + VIEW_PAD * 2}`}
          className="h-auto w-full overflow-visible"
          role="img"
          aria-label="Psychological analysis radar chart"
        >
          <defs>
            <linearGradient id={`radar-fill-${gradientId}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(149,193,75,0.38)" />
              <stop offset="55%" stopColor="rgba(221,241,253,0.55)" />
              <stop offset="100%" stopColor="rgba(52,52,52,0.18)" />
            </linearGradient>
            <linearGradient id={`radar-stroke-${gradientId}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#343434" />
              <stop offset="50%" stopColor="#95C14B" />
              <stop offset="100%" stopColor="#343434" />
            </linearGradient>
          </defs>

          {[0.25, 0.5, 0.75, 1].map((f) => (
            <polygon
              key={f}
              points={gridRingPoints(f)}
              fill="none"
              stroke="rgba(203,213,225,0.65)"
              strokeWidth={1}
            />
          ))}

          {PSYCHOLOGICAL_SCORE_LABELS.map((_, i) => {
            const { x, y } = polarToCartesian(start + i * step, MAX_R);
            return (
              <line
                key={i}
                x1={CX}
                y1={CY}
                x2={x}
                y2={y}
                stroke="rgba(203,213,225,0.55)"
                strokeWidth={1}
              />
            );
          })}

          <polygon
            points={scorePolygonPoints(scores)}
            fill={`url(#radar-fill-${gradientId})`}
            stroke={`url(#radar-stroke-${gradientId})`}
            strokeWidth={2}
            strokeLinejoin="round"
          />

          <circle cx={CX} cy={CY} r={3} fill="#343434" opacity={0.35} />

          {PSYCHOLOGICAL_SCORE_LABELS.map(({ key, label }, i) => {
            const value = scores[key];
            const { x, y } = polarToCartesian(start + i * step, LABEL_R);
            const anchor = labelTextAnchor(x);
            const pillY = y - 16;
            const pillX =
              anchor === "middle" ? x - SCORE_PILL_W / 2 : anchor === "end" ? x - SCORE_PILL_W : x;
            const scoreX = pillX + SCORE_PILL_W / 2;
            const scoreY = pillY + SCORE_PILL_H / 2 + 3.5;

            return (
              <g key={key}>
                <rect
                  x={pillX}
                  y={pillY}
                  width={SCORE_PILL_W}
                  height={SCORE_PILL_H}
                  rx={7}
                  fill="rgba(255,255,255,0.88)"
                  stroke="rgba(149,193,75,0.35)"
                  strokeWidth={0.75}
                />
                <text
                  x={scoreX}
                  y={scoreY}
                  textAnchor="middle"
                  className="fill-slate-900 text-[9px] font-bold"
                >
                  {value}
                </text>
                <text
                  x={x}
                  y={y + 8}
                  textAnchor={anchor}
                  className="fill-slate-500 text-[6.5px] font-bold uppercase tracking-[0.08em]"
                >
                  {label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
