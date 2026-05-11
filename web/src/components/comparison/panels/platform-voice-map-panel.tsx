"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";

import type { CompetitorStrategyOverviewPayload, StrategyPlatform } from "@/lib/strategy-overview/payload-types";
import { COMPARISON_PLATFORM_ORDER, ComparisonPlatformIcon } from "@/components/comparison/platform-icon";
import { ComparisonInsufficient, ComparisonPanelShell } from "@/components/comparison/panel-shell";

type Props = {
  left: { name: string; payload: CompetitorStrategyOverviewPayload | null };
  right: { name: string; payload: CompetitorStrategyOverviewPayload | null };
};

type Pt = { formal: number; emotional: number; platform: StrategyPlatform; n: number };

const WS = "#3B82F6";
const RIVAL = "#F97316";

function PlatformIconDot(props: {
  cx?: number;
  cy?: number;
  payload?: Pt;
  fill?: string;
}) {
  const { cx, cy, payload, fill } = props;
  if (cx == null || cy == null || !payload) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={14} fill={fill} fillOpacity={0.88} stroke="white" strokeWidth={2} />
      <foreignObject x={cx - 8} y={cy - 8} width={16} height={16}>
        <div className="flex h-4 w-4 items-center justify-center pointer-events-none overflow-visible">
          <ComparisonPlatformIcon platform={payload.platform} className="h-4 w-4" />
        </div>
      </foreignObject>
    </g>
  );
}

export function PlatformVoiceMapPanel({ left, right }: Props) {
  const leftPts = useMemo((): Pt[] => {
    const rows = left.payload?.insights.voice_tone_by_platform ?? [];
    return rows.map((r) => ({
      formal: r.formal,
      emotional: r.emotional,
      platform: r.platform,
      n: r.sampleSize,
    }));
  }, [left.payload]);

  const rightPts = useMemo((): Pt[] => {
    const rows = right.payload?.insights.voice_tone_by_platform ?? [];
    return rows.map((r) => ({
      formal: r.formal,
      emotional: r.emotional,
      platform: r.platform,
      n: r.sampleSize,
    }));
  }, [right.payload]);

  const connectorLines = useMemo(() => {
    const out: { x1: number; y1: number; x2: number; y2: number; key: string }[] = [];
    for (const pl of COMPARISON_PLATFORM_ORDER) {
      const ws = leftPts.find((p) => p.platform === pl);
      const cp = rightPts.find((p) => p.platform === pl);
      if (!ws || !cp) continue;
      out.push({
        key: pl,
        x1: ws.formal,
        y1: ws.emotional,
        x2: cp.formal,
        y2: cp.emotional,
      });
    }
    return out;
  }, [leftPts, rightPts]);

  const caption = useMemo(() => {
    let best: {
      platform: string;
      axis: "emotional" | "formal";
      delta: number;
      theirs: number;
      yours: number;
    } | null = null;
    for (const pl of COMPARISON_PLATFORM_ORDER) {
      const ws = leftPts.find((p) => p.platform === pl);
      const cp = rightPts.find((p) => p.platform === pl);
      if (!ws || !cp) continue;
      const de = Math.abs(cp.emotional - ws.emotional);
      const df = Math.abs(cp.formal - ws.formal);
      if (de >= df && de > (best?.delta ?? 0)) {
        best = {
          platform: pl,
          axis: "emotional",
          delta: de,
          theirs: cp.emotional,
          yours: ws.emotional,
        };
      } else if (df > de && df > (best?.delta ?? 0)) {
        best = {
          platform: pl,
          axis: "formal",
          delta: df,
          theirs: cp.formal,
          yours: ws.formal,
        };
      }
    }
    if (!best || best.delta < 0.08) return null;
    if (best.axis === "emotional") {
      if (best.theirs > best.yours + 0.05) {
        return `On ${best.platform}, they're more emotional (${best.theirs.toFixed(2)}) than you (${best.yours.toFixed(2)}).`;
      }
      if (best.yours > best.theirs + 0.05) {
        return `On ${best.platform}, they're more rational (${best.theirs.toFixed(2)}) than you (${best.yours.toFixed(2)}).`;
      }
    } else {
      if (best.theirs > best.yours + 0.05) {
        return `On ${best.platform}, they're more formal (${best.theirs.toFixed(2)}) than you (${best.yours.toFixed(2)}).`;
      }
      if (best.yours > best.theirs + 0.05) {
        return `On ${best.platform}, they're more casual (${best.theirs.toFixed(2)}) than you (${best.yours.toFixed(2)}).`;
      }
    }
    return `On ${best.platform}, voice positioning is close on this axis.`;
  }, [leftPts, rightPts]);

  const hasAny = leftPts.length > 0 || rightPts.length > 0;

  return (
    <ComparisonPanelShell
      title="Platform-specific voice map"
      subtitle="Formal vs emotional tone by platform (enriched averages)"
      tooltip="Each dot is one platform's average voice. X = formal (0 casual → 1 formal). Y = emotional (0 rational → 1 emotional)."
    >
      {!hasAny ? (
        <ComparisonInsufficient message="Need at least 3 enriched ads per platform with voice scores." />
      ) : (
        <div className="space-y-2">
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" dataKey="formal" name="Formal" domain={[0, 1]} tick={{ fontSize: 10 }} />
                <YAxis type="number" dataKey="emotional" name="Emotional" domain={[0, 1]} tick={{ fontSize: 10 }} />
                <ZAxis type="number" dataKey="n" range={[44, 120]} />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  labelFormatter={(_, payload) =>
                    payload?.[0]?.payload ? `${payload[0].payload.platform} · n=${payload[0].payload.n}` : ""
                  }
                />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                {connectorLines.map((ln) => (
                  <Line
                    key={ln.key}
                    type="linear"
                    data={[
                      { formal: ln.x1, emotional: ln.y1 },
                      { formal: ln.x2, emotional: ln.y2 },
                    ]}
                    dataKey="emotional"
                    stroke="#94a3b8"
                    strokeDasharray="4 4"
                    strokeOpacity={0.5}
                    dot={false}
                    legendType="none"
                    isAnimationActive={false}
                  />
                ))}
                <Scatter name={left.name} data={leftPts} fill={WS} shape={<PlatformIconDot fill={WS} />} />
                <Scatter name={right.name} data={rightPts} fill={RIVAL} shape={<PlatformIconDot fill={RIVAL} />} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          {caption ? <p className="text-[11px] text-slate-600 text-center leading-snug">{caption}</p> : null}
        </div>
      )}
    </ComparisonPanelShell>
  );
}
