"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ComparisonMoveRow } from "@/lib/comparison/comparison-move-types";

const DAY = 86_400_000;

function categoryForEvent(e: string): "angles" | "platform" | "budget" | "voice" | "other" {
  if (e === "new_angle" || e === "angle_migration") return "angles";
  if (e === "new_platform" || e === "dropped_platform") return "platform";
  if (e === "budget_shift") return "budget";
  if (e === "voice_shift") return "voice";
  return "other";
}

type WindowKey = "d7" | "d30" | "d90";

function bucketMoves(moves: ComparisonMoveRow[], now: number): Record<WindowKey, ComparisonMoveRow[]> {
  const out: Record<WindowKey, ComparisonMoveRow[]> = { d7: [], d30: [], d90: [] };
  for (const m of moves) {
    const t = Date.parse(m.detected_at);
    if (!Number.isFinite(t)) continue;
    const age = now - t;
    if (age <= 7 * DAY) out.d7.push(m);
    if (age <= 30 * DAY) out.d30.push(m);
    if (age <= 90 * DAY) out.d90.push(m);
  }
  return out;
}

type ColProps = {
  label: string;
  moves: ComparisonMoveRow[];
  reduceMotion: boolean;
};

function PulseColumn({ label, moves, reduceMotion }: ColProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [iv, setIv] = useState(false);
  const counts = useMemo(() => {
    let angles = 0;
    let platform = 0;
    let budget = 0;
    let voice = 0;
    for (const m of moves) {
      const c = categoryForEvent(m.event_type);
      if (c === "angles") angles += 1;
      else if (c === "platform") platform += 1;
      else if (c === "budget") budget += 1;
      else if (c === "voice") voice += 1;
    }
    return { angles, platform, budget, voice, total: moves.length };
  }, [moves]);

  useEffect(() => {
    const el = ref.current;
    if (!el || reduceMotion) {
      setIv(true);
      return;
    }
    const ob = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) setIv(true);
      },
      { threshold: 0.2 }
    );
    ob.observe(el);
    return () => ob.disconnect();
  }, [reduceMotion]);

  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (!iv) return;
    if (reduceMotion) {
      setDisplay(counts.total);
      return;
    }
    const target = counts.total;
    const start = performance.now();
    const dur = 600;
    let frame: number;
    const tick = (nowMs: number) => {
      const p = Math.min(1, (nowMs - start) / dur);
      const eased = 1 - (1 - p) * (1 - p);
      setDisplay(Math.round(target * eased));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [iv, counts.total, reduceMotion]);

  return (
    <div
      ref={ref}
      className="flex flex-1 flex-col gap-2 border-slate-100 px-4 py-4 text-center transition-colors hover:bg-slate-50/80 sm:border-r sm:last:border-r-0"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="text-2xl font-semibold tabular-nums text-slate-900">{display}</p>
      <p className="text-[10px] leading-relaxed text-slate-600">
        <span className={counts.angles ? "text-emerald-600" : "text-slate-400"}>
          ↑ {counts.angles} angles
        </span>
        <br />
        <span className={counts.platform ? "text-blue-600" : "text-slate-400"}>
          {counts.platform ? `↑ ${counts.platform} platform` : "→ no platform shifts"}
        </span>
        <br />
        <span className={counts.budget ? "text-amber-600" : "text-slate-400"}>
          ↑ {counts.budget} budget
        </span>
        <br />
        <span className={counts.voice ? "text-cyan-600" : "text-slate-400"}>↑ {counts.voice} voice</span>
      </p>
    </div>
  );
}

type Props = {
  moves: ComparisonMoveRow[];
};

export function ActivityPulseBar({ moves }: Props) {
  const reduceMotion =
    typeof window !== "undefined" ? Boolean(window.matchMedia("(prefers-reduced-motion: reduce)").matches) : false;

  const buckets = useMemo(() => bucketMoves(moves, Date.now()), [moves]);

  const callout = useMemo(() => {
    const now = Date.now();
    const w = buckets.d7.length;
    const last = moves[0];
    const lastT = last ? Date.parse(last.detected_at) : NaN;
    const daysSince = Number.isFinite(lastT) ? Math.floor((now - lastT) / DAY) : null;

    if (w > 0) {
      const types = new Set<string>();
      for (const m of buckets.d7) types.add(categoryForEvent(m.event_type));
      const parts = [
        types.has("angles") ? "angles" : null,
        types.has("platform") ? "platform" : null,
        types.has("budget") ? "budget" : null,
        types.has("voice") ? "voice" : null,
      ].filter(Boolean);
      return `💡 New competitor activity this week: ${w} move${w === 1 ? "" : "s"}${parts.length ? ` (${parts.join(", ")})` : ""}.`;
    }
    if (buckets.d30.length > 0 && daysSince != null) {
      return `📊 Quiet week — last change was ${daysSince} day${daysSince === 1 ? "" : "s"} ago.`;
    }
    return "💤 No detected changes in the last 30 days in this feed.";
  }, [buckets, moves]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white sm:flex-row sm:divide-x sm:divide-y-0">
        <PulseColumn label="Last 7 days" moves={buckets.d7} reduceMotion={reduceMotion} />
        <PulseColumn label="Last 30 days" moves={buckets.d30} reduceMotion={reduceMotion} />
        <PulseColumn label="Last 90 days" moves={buckets.d90} reduceMotion={reduceMotion} />
      </div>
      <div className="rounded-r-lg border-l-4 border-blue-400 bg-blue-50 p-3 text-sm leading-snug text-slate-800">
        {callout}
      </div>
    </div>
  );
}
