"use client";

import { useEffect, useId, useState } from "react";

import {
  ORGANIC_SCORE_LABELS,
  type OrganicPostScores,
} from "@/lib/organic-content/organic-post-ai-analysis-types";
import { aiGlassShellClass } from "@/lib/ad-detail/ad-preview-analysis-styles";

const SIZE = 240;
const CX = SIZE / 2;
const CY = SIZE / 2;
const MAX_R = 72;
const LABEL_R = 102;
const VIEW_PAD = 28;

function polarToCartesian(angleRad: number, radius: number): { x: number; y: number } {
  return {
    x: CX + radius * Math.cos(angleRad),
    y: CY + radius * Math.sin(angleRad),
  };
}

function scorePolygonPoints(scores: OrganicPostScores): string {
  const keys = ORGANIC_SCORE_LABELS.map((l) => l.key);
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
  scores: OrganicPostScores;
  animate?: boolean;
};

export function OrganicPostRadarChart({ scores, animate = true }: Props) {
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
        className={`relative mx-auto w-full max-w-[280px] ${mounted ? "ai-radar-expand" : "scale-[0.08] opacity-0"}`}
      >
        <svg
          viewBox={`${-VIEW_PAD} ${-VIEW_PAD} ${SIZE + VIEW_PAD * 2} ${SIZE + VIEW_PAD * 2}`}
          className="h-auto w-full overflow-visible"
          role="img"
          aria-label="Organic content analysis radar chart"
        >
          <defs>
            <linearGradient id={`organic-radar-fill-${gradientId}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(149,193,75,0.38)" />
              <stop offset="55%" stopColor="rgba(221,241,253,0.55)" />
              <stop offset="100%" stopColor="rgba(52,52,52,0.18)" />
            </linearGradient>
            <linearGradient id={`organic-radar-stroke-${gradientId}`} x1="0%" y1="0%" x2="100%" y2="0%">
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

          {ORGANIC_SCORE_LABELS.map((_, i) => {
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
            fill={`url(#organic-radar-fill-${gradientId})`}
            stroke={`url(#organic-radar-stroke-${gradientId})`}
            strokeWidth={2}
            strokeLinejoin="round"
          />

          <circle cx={CX} cy={CY} r={3} fill="#343434" opacity={0.35} />

          {ORGANIC_SCORE_LABELS.map(({ key, label }, i) => {
            const value = scores[key];
            const { x, y } = polarToCartesian(start + i * step, LABEL_R);
            const anchor = x < CX - 10 ? "end" : x > CX + 10 ? "start" : "middle";

            return (
              <g key={key}>
                <rect
                  x={anchor === "middle" ? x - 13 : anchor === "end" ? x - 26 : x}
                  y={y - 16}
                  width={26}
                  height={14}
                  rx={7}
                  fill="rgba(255,255,255,0.88)"
                  stroke="rgba(149,193,75,0.35)"
                  strokeWidth={0.75}
                />
                <text
                  x={x}
                  y={y - 6}
                  textAnchor={anchor}
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
