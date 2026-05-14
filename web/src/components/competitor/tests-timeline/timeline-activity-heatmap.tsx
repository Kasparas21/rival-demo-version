"use client";

import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

import { maxWeekMetric, type WeekBucket } from "./timeline-helpers";

type Props = {
  buckets: WeekBucket[];
  selectedWeekStart: number | null;
  onSelectWeek: (weekStart: number | null) => void;
};

function pickInsight(buckets: WeekBucket[]): string {
  if (buckets.length < 3) return "";
  const totalLaunch = buckets.reduce((s, b) => s + b.launches, 0);
  const weeksWithLaunch = buckets.filter((b) => b.launches > 0).length || 1;
  const avg = totalLaunch / weeksWithLaunch;
  let best = buckets[0]!;
  for (const b of buckets) {
    if (b.launches > best.launches) best = b;
  }
  if (best.launches >= Math.max(3, avg * 1.6)) {
    const m = new Date(best.weekStart).toLocaleDateString("en-US", { month: "long" });
    return `Heaviest testing in ${m} (${best.launches} launches that week).`;
  }
  const recent = buckets.slice(-3);
  const retireSum = recent.reduce((s, b) => s + b.retirements, 0);
  if (retireSum >= 4) {
    return `Recent wave: ${retireSum} ads retired in recent weeks.`;
  }
  if (avg >= 0.5 && weeksWithLaunch >= 2) {
    return `Steady cadence: about ${avg.toFixed(1)} launches per active week.`;
  }
  return "";
}

export function TimelineActivityHeatmap({ buckets, selectedWeekStart, onSelectWeek }: Props) {
  if (buckets.length < 2) return null;

  const maxV = maxWeekMetric(buckets);

  const monthLabels: { idx: number; label: string }[] = [];
  let lastMonth = -1;
  buckets.forEach((b, idx) => {
    const d = new Date(b.weekStart);
    const m = d.getMonth();
    if (m !== lastMonth) {
      lastMonth = m;
      monthLabels.push({ idx, label: d.toLocaleDateString("en-US", { month: "short" }) });
    }
  });

  const insight = pickInsight(buckets);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Activity</p>
      <h3 className="mt-1 text-lg font-semibold text-slate-900">Launches & retirements per week</h3>

      <div className="relative mt-4 flex h-[76px] flex-col justify-end gap-1.5 rounded-lg border border-slate-100 bg-slate-50/60 px-1 py-2">
        <div className="flex h-[30px] w-full items-end gap-px">
          {buckets.map((b, i) => {
            const hPct = maxV > 0 ? Math.round((b.launches / maxV) * 100) : 0;
            const selected = selectedWeekStart === b.weekStart;
            return (
              <button
                key={b.key}
                type="button"
                title={`Week of ${new Date(b.weekStart).toLocaleDateString()}: ${b.launches} launches`}
                className="flex h-full min-w-[3px] flex-1 flex-col justify-end"
                onClick={() => onSelectWeek(selected ? null : b.weekStart)}
              >
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(14, hPct)}%` }}
                  transition={{ delay: i * 0.03, duration: 0.4, ease: "easeOut" }}
                  className={cn(
                    "w-full rounded-t-sm bg-gradient-to-t from-slate-700 to-slate-500",
                    selected && "ring-1 ring-slate-900/35",
                  )}
                />
              </button>
            );
          })}
        </div>
        <div className="flex h-[30px] w-full items-end gap-px">
          {buckets.map((b, i) => {
            const hPct = maxV > 0 ? Math.round((b.retirements / maxV) * 100) : 0;
            const selected = selectedWeekStart === b.weekStart;
            return (
              <button
                key={`r-${b.key}`}
                type="button"
                title={`Week of ${new Date(b.weekStart).toLocaleDateString()}: ${b.retirements} retirements`}
                className="flex h-full min-w-[3px] flex-1 flex-col justify-end"
                onClick={() => onSelectWeek(selected ? null : b.weekStart)}
              >
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(14, hPct)}%` }}
                  transition={{ delay: i * 0.03 + 0.05, duration: 0.4, ease: "easeOut" }}
                  className={cn(
                    "w-full rounded-t-sm bg-gradient-to-t from-slate-500 to-slate-400",
                    selected && "ring-1 ring-slate-700/40",
                  )}
                />
              </button>
            );
          })}
        </div>
      </div>

      <div className="relative mt-3 h-4 w-full">
        {monthLabels.map((m, i) => (
          <span
            key={`${m.label}-${m.idx}-${i}`}
            className="absolute text-[10px] font-medium text-slate-500"
            style={{
              left: `${buckets.length <= 1 ? 0 : (m.idx / (buckets.length - 1)) * 100}%`,
              transform: "translateX(-50%)",
            }}
          >
            {m.label}
          </span>
        ))}
      </div>

      <p className="mt-2 text-[10px] uppercase tracking-wide text-slate-400">
        <span className="mr-1 inline-block h-2 w-2 rounded-sm bg-slate-700 align-middle" /> Launches
        <span className="mx-2 text-slate-300">·</span>
        <span className="mr-1 inline-block h-2 w-2 rounded-sm bg-slate-400 align-middle" /> Retirements
      </p>

      {selectedWeekStart ? (
        <button
          type="button"
          className="mt-2 text-xs font-semibold text-slate-700 underline"
          onClick={() => onSelectWeek(null)}
        >
          Clear week filter
        </button>
      ) : null}

      {insight ? (
        <div className="mt-4 rounded-r-lg border-l-4 border-slate-600 bg-slate-50 p-3 text-sm text-slate-800">{insight}</div>
      ) : null}
    </div>
  );
}
