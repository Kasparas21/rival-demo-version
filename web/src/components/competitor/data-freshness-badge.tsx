"use client";

import { useMemo } from "react";

type Props = {
  lastScrapedAt: string | null;
  onRefresh?: () => void;
  className?: string;
};

function dayBucket(iso: string): { label: string; tone: "green" | "amber" | "red" } | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const days = Math.max(0, Math.floor((Date.now() - d.getTime()) / (24 * 60 * 60 * 1000)));
  const label =
    days === 0
      ? "today"
      : days === 1
        ? "1 day ago"
        : `${days} days ago`;
  const tone = days < 2 ? "green" : days <= 7 ? "amber" : "red";
  return { label, tone };
}

export function DataFreshnessBadge({ lastScrapedAt, onRefresh, className = "" }: Props) {
  const { pillClass, dotClass, tooltip } = useMemo(() => {
    if (!lastScrapedAt) {
      return {
        pillClass: "border-slate-200 bg-slate-50/90 text-slate-600",
        dotClass: "bg-slate-400",
        tooltip: "No scrape timestamp yet.",
      };
    }
    const b = dayBucket(lastScrapedAt);
    const pillClass =
      b?.tone === "green"
        ? "border-emerald-300/80 bg-emerald-50/90 text-emerald-900"
        : b?.tone === "amber"
          ? "border-amber-300/80 bg-amber-50/90 text-amber-950"
          : "border-red-300/80 bg-red-50/90 text-red-950";
    const dotClass =
      b?.tone === "green" ? "bg-emerald-500" : b?.tone === "amber" ? "bg-amber-500" : "bg-red-500";
    const d = new Date(lastScrapedAt);
    const days = Math.max(0, Math.floor((Date.now() - d.getTime()) / (24 * 60 * 60 * 1000)));
    const daysUntil = Math.max(0, 7 - days);
    const nextLine =
      daysUntil === 0
        ? "Next weekly-style refresh window is open; scrape anytime."
        : `Next auto-update: in about ${daysUntil} day${daysUntil === 1 ? "" : "s"} (estimated).`;
    return {
      pillClass,
      dotClass: dotClass ?? "bg-slate-400",
      tooltip: `Data from last scrape. ${nextLine}`,
    };
  }, [lastScrapedAt]);

  const label = lastScrapedAt ? dayBucket(lastScrapedAt)?.label ?? "unknown" : "no scrape yet";

  const inner = (
    <span
      title={tooltip}
      className={[
        "inline-flex items-center gap-1 rounded-full border px-[6px] py-[6px] text-[11px] font-medium leading-none",
        "border-[color:var(--rival-primary)]/35",
        pillClass,
        className,
      ].join(" ")}
    >
      <span className={`inline-block size-1.5 shrink-0 rounded-full ${dotClass}`} aria-hidden />
      <span>{label}</span>
    </span>
  );

  if (onRefresh) {
    return (
      <button type="button" onClick={onRefresh} className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--rival-accent-blue)]/40">
        {inner}
      </button>
    );
  }

  return inner;
}

/** Small pulsing corner indicator while a cached panel revalidates. */
export function CacheRevalidatingDot({ show, className = "" }: { show: boolean; className?: string }) {
  if (!show) return null;
  return (
    <span
      title="Checking for updates…"
      className={[
        "pointer-events-none absolute right-2 top-2 z-20 inline-flex size-2 rounded-full",
        "bg-[color:var(--rival-accent-blue)] motion-safe:animate-pulse shadow-sm ring-2 ring-white/90",
        className,
      ].join(" ")}
      aria-hidden
    />
  );
}
