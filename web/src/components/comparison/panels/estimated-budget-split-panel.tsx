"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";

import type { CompetitorStrategyOverviewPayload, StrategyPlatform } from "@/lib/strategy-overview/payload-types";
import { COMPARISON_PLATFORM_ORDER } from "@/components/comparison/platform-icon";
import { ComparisonInsufficient, ComparisonPanelShell } from "@/components/comparison/panel-shell";

const BAR_COLORS: Record<StrategyPlatform, string> = {
  meta: "#1877F2",
  google: "#22C55E",
  tiktok: "#FF0050",
  linkedin: "#0A66C2",
  pinterest: "#E60023",
  snapchat: "#D3AF37",
};

type Props = {
  left: { name: string; payload: CompetitorStrategyOverviewPayload | null };
  right: { name: string; payload: CompetitorStrategyOverviewPayload | null };
};

type Seg = { platform: StrategyPlatform; pct: number; estEur: number; adCount: number; label: string };

function segmentsFromPayload(payload: CompetitorStrategyOverviewPayload | null): Seg[] {
  if (!payload) return [];
  return payload.insights.budget_allocation.segments.map((s) => ({
    platform: s.platform,
    pct: s.pct,
    estEur: Math.round((s.pct / 100) * (payload.insights.budget_allocation.totalEstSpendEur || 0)),
    adCount: s.adCount,
    label: s.label,
  }));
}

function dominantPlatform(segments: Seg[]): { platform: StrategyPlatform; pct: number } | null {
  let best: { platform: StrategyPlatform; pct: number } | null = null;
  for (const s of segments) {
    if (!best || s.pct > best.pct) best = { platform: s.platform, pct: s.pct };
  }
  return best;
}

function budgetInsight(params: {
  leftName: string;
  rightName: string;
  leftTotal: number;
  rightTotal: number;
  leftSeg: Seg[];
  rightSeg: Seg[];
}): string {
  const { leftName, rightName, leftTotal, rightTotal, leftSeg, rightSeg } = params;
  const maxT = Math.max(leftTotal, rightTotal, 1);
  const spendGapPct = (Math.abs(leftTotal - rightTotal) / maxT) * 100;

  let maxPlGap = 0;
  let gapPlatform: StrategyPlatform | null = null;
  let leader: "left" | "right" | "tie" = "tie";

  for (const pl of COMPARISON_PLATFORM_ORDER) {
    const lp = leftSeg.find((s) => s.platform === pl)?.pct ?? 0;
    const rp = rightSeg.find((s) => s.platform === pl)?.pct ?? 0;
    const g = Math.abs(lp - rp);
    if (g > maxPlGap) {
      maxPlGap = g;
      gapPlatform = pl;
      if (lp > rp + 5) leader = "left";
      else if (rp > lp + 5) leader = "right";
      else leader = "tie";
    }
  }

  const domL = dominantPlatform(leftSeg);
  const domR = dominantPlatform(rightSeg);
  const leadPl = domL && domR && domL.pct >= domR.pct ? domL : domR ?? domL;

  const platLabel = leadPl ? leadPl.platform.charAt(0).toUpperCase() + leadPl.platform.slice(1) : "Meta";

  if (spendGapPct < 4 && maxPlGap < 15) {
    return `Similar mix. Both brands lead with ${platLabel} (~${Math.round(leadPl?.pct ?? 60)}% share). Total modeled spend is within a few points — competitive intensity looks matched.`;
  }

  if (maxPlGap > 30 && gapPlatform && leader !== "tie") {
    const side = leader === "left" ? leftName : rightName;
    const other = leader === "left" ? rightName : leftName;
    const pname = gapPlatform.charAt(0).toUpperCase() + gapPlatform.slice(1);
    return `${side} outspends ${other} by roughly ${Math.round(maxPlGap)} pts on modeled ${pname} share — the biggest channel skew between you.`;
  }

  if (maxPlGap >= 15 && gapPlatform) {
    const pname = gapPlatform.charAt(0).toUpperCase() + gapPlatform.slice(1);
    const heavier = leader === "left" ? leftName : leader === "right" ? rightName : "One brand";
    return `${heavier} leans more heavily on ${pname} than the other (${
      leader === "tie" ? "channel tilt is visible" : "check whether that matches your customer journeys"
    }).`;
  }

  return `Modeled budgets are close; ${platLabel} still carries the majority of weight on both sides.`;
}

function StackedRow({
  titleLine,
  segments,
  totalEur,
  reduce,
}: {
  titleLine: string;
  segments: Seg[];
  totalEur: number;
  reduce: boolean;
}) {
  const has = segments.some((s) => s.pct > 0);

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-slate-900">{titleLine}</p>
      {!has ? (
        <div className="flex h-12 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-xs text-slate-500">
          No modeled split yet
        </div>
      ) : (
        <div className="flex h-12 w-full overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-200/80">
          {segments
            .filter((s) => s.pct > 0.5)
            .map((s, i) => (
              <motion.div
                key={s.platform}
                className="relative flex h-full items-center justify-center overflow-hidden text-[10px] font-semibold text-white/95"
                style={{ backgroundColor: BAR_COLORS[s.platform] ?? "#64748b" }}
                initial={reduce ? { width: `${s.pct}%` } : { width: 0 }}
                animate={{ width: `${s.pct}%` }}
                transition={{ duration: 0.55, delay: reduce ? 0 : i * 0.1, ease: "easeOut" }}
              >
                {s.pct >= 15 ? <span className="z-10 px-1 text-center leading-tight drop-shadow-sm">{s.label}</span> : null}
              </motion.div>
            ))}
        </div>
      )}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
        {segments
          .filter((s) => s.pct > 0.5)
          .map((s) => (
            <span key={s.platform} className="tabular-nums">
              <span className="font-medium capitalize text-slate-800">{s.platform}</span> €{s.estEur.toLocaleString()} (
              {Math.round(s.pct)}%)
            </span>
          ))}
      </div>
      <p className="text-[11px] text-slate-500">Total modeled monthly spend: €{Math.round(totalEur).toLocaleString()}</p>
    </div>
  );
}

export function EstimatedBudgetSplitPanel({ left, right }: Props) {
  const rm = useReducedMotion() ?? false;

  const leftSegments = useMemo(() => segmentsFromPayload(left.payload), [left.payload]);
  const rightSegments = useMemo(() => segmentsFromPayload(right.payload), [right.payload]);

  const leftTotal = left.payload?.insights.budget_allocation.totalEstSpendEur ?? 0;
  const rightTotal = right.payload?.insights.budget_allocation.totalEstSpendEur ?? 0;

  const insight = useMemo(
    () =>
      budgetInsight({
        leftName: left.name,
        rightName: right.name,
        leftTotal,
        rightTotal,
        leftSeg: leftSegments,
        rightSeg: rightSegments,
      }),
    [left.name, right.name, leftTotal, rightTotal, leftSegments, rightSegments]
  );

  return (
    <ComparisonPanelShell
      title="Budget allocation"
      subtitle="Where each brand puts its modeled monthly spend"
      tooltip={left.payload?.insights.budget_allocation.tooltip ?? "Estimated spend share."}
    >
      {!left.payload && !right.payload ? (
        <ComparisonInsufficient message="Budget comparison needs strategy payloads for both brands." />
      ) : (
        <div className="flex flex-col gap-8">
          <StackedRow
            titleLine={`YOU · ${left.name.toUpperCase()} · €${Math.round(leftTotal).toLocaleString()}/mo`}
            segments={leftSegments}
            totalEur={leftTotal}
            reduce={rm}
          />
          <StackedRow
            titleLine={`THEM · ${right.name.toUpperCase()} · €${Math.round(rightTotal).toLocaleString()}/mo`}
            segments={rightSegments}
            totalEur={rightTotal}
            reduce={rm}
          />
          <div className="rounded-r-lg border-l-4 border-blue-400 bg-blue-50/90 p-3 text-sm leading-snug text-blue-950">
            <span className="font-semibold text-blue-900">Insight · </span>
            {insight}
          </div>
        </div>
      )}
    </ComparisonPanelShell>
  );
}
