"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

export type TimelineStatSnapshot = {
  avgLifespan: number;
  medianLifespan: number;
  longestDays: number;
  longestHeadline: string;
  activeCount: number;
  platformDistinct: number;
  launched30d: number;
  mostRecentLaunchLabel: string;
  /** Ads used for stats (after brand filter). */
  sampleSize: number;
};

type Props = {
  stats: TimelineStatSnapshot;
};

function useInViewCount(target: number) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) setVisible(true);
      },
      { threshold: 0.2 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    const start = performance.now();
    const dur = 800;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - (1 - t) * (1 - t);
      setDisplay(target * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else setDisplay(target);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [visible, target]);

  const formatted = Math.round(Number.isFinite(display) ? display : 0).toString();

  return { ref, formatted };
}

function StatCard({
  label,
  annotation,
  numTarget,
  textValue,
  showDash,
}: {
  label: string;
  annotation: string;
  numTarget?: number;
  textValue?: string;
  showDash?: boolean;
}) {
  const { ref, formatted } = useInViewCount(numTarget ?? 0);
  const main = showDash ? "—" : textValue ?? formatted;
  return (
    <div ref={ref} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-slate-900">{main}</p>
      <p className="mt-2 text-xs text-slate-500 leading-snug">{annotation}</p>
    </div>
  );
}

export function TimelineStatsCards({ stats }: Props) {
  const longestAnn =
    stats.longestHeadline.length > 0
      ? stats.longestHeadline.slice(0, 36) + (stats.longestHeadline.length > 36 ? "…" : "")
      : "—";

  return (
    <div className={cn("grid gap-3 sm:grid-cols-2 lg:grid-cols-4")}>
      <StatCard
        label="Avg lifespan"
        numTarget={stats.avgLifespan}
        showDash={stats.sampleSize === 0}
        annotation={stats.sampleSize === 0 ? "—" : stats.medianLifespan > 0 ? `Median ${stats.medianLifespan}d` : "—"}
      />
      <StatCard
        label="Longest run"
        numTarget={stats.longestDays}
        showDash={stats.sampleSize === 0}
        annotation={longestAnn}
      />
      <StatCard
        label="Active now"
        numTarget={stats.activeCount}
        annotation={stats.platformDistinct > 0 ? `Across ${stats.platformDistinct} platforms` : "—"}
      />
      <StatCard
        label="Launched (30d)"
        numTarget={stats.launched30d}
        annotation={stats.mostRecentLaunchLabel ? `Most recent: ${stats.mostRecentLaunchLabel}` : "—"}
      />
    </div>
  );
}
