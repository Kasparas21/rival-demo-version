"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { Trophy } from "lucide-react";

import { ComparisonPlatformIcon } from "@/components/comparison/platform-icon";
import { parseAngleForDisplay } from "@/lib/comparison/stealable-angle-present";
import { cn } from "@/lib/utils";
import type { StrategyPlatform } from "@/lib/strategy-overview/payload-types";

import type { TimelineAd, TimelineSort, TimelineZoom } from "./timeline-types";
import {
  barToneClasses,
  barToneForAd,
  buildTimelineTicks,
  DAY_MS,
  displayLifespanDays,
  effectiveBarEndMs,
  headlineForAd,
  platformLabel,
  platformSortIndex,
} from "./timeline-helpers";

const LABEL_COL = 280;
const ROW_H = 64;
const THUMB = 56;

type GanttRow = { type: "ad"; ad: TimelineAd } | { type: "platform"; platform: string };

function toGanttRows(ads: TimelineAd[], sort: TimelineSort): GanttRow[] {
  if (sort !== "platform") return ads.map((ad) => ({ type: "ad", ad }));
  const m = new Map<string, TimelineAd[]>();
  for (const ad of ads) {
    if (!m.has(ad.platform)) m.set(ad.platform, []);
    m.get(ad.platform)!.push(ad);
  }
  const keys = [...m.keys()].sort((a, b) => platformSortIndex(a) - platformSortIndex(b));
  const out: GanttRow[] = [];
  for (const k of keys) {
    out.push({ type: "platform", platform: k });
    for (const ad of m.get(k)!) out.push({ type: "ad", ad });
  }
  return out;
}

function TooltipPortal({
  open,
  anchorRef,
  scrollRootRef,
  children,
}: {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  scrollRootRef: RefObject<HTMLElement | null>;
  children: React.ReactNode;
}) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const update = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({ x: r.left + r.width / 2, y: r.top });
  }, [anchorRef]);

  useEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    update();
    const root = scrollRootRef.current;
    const onScroll = () => update();
    root?.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      root?.removeEventListener("scroll", onScroll);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [open, update, scrollRootRef]);

  if (!open || pos == null || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="pointer-events-none fixed z-[200] w-72"
      style={{ left: pos.x, top: pos.y - 8, transform: "translate(-50%, -100%)" }}
    >
      {children}
    </div>,
    document.body,
  );
}

function BarTip({ ad, lifespanDays }: { ad: TimelineAd; lifespanDays: number }) {
  const s = new Date(ad.first_seen_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const end = ad.is_killed
    ? new Date(ad.last_seen_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "Still running";
  return (
    <div className="rounded-lg bg-slate-900 p-3 text-xs text-white shadow-xl">
      <p className="line-clamp-2 font-semibold">{headlineForAd(ad)}</p>
      <p className="mt-2 text-slate-400">
        {s} → {end}
      </p>
      <p className="mt-1 font-semibold text-white">
        {lifespanDays === 0 ? "Single-day / brief appearance" : `${lifespanDays}d running`}
      </p>
    </div>
  );
}

type BarProps = {
  ad: TimelineAd;
  viewStart: number;
  viewEnd: number;
  viewSpan: number;
  trackWidthPx: number;
  minLifespan: number;
  maxLifespan: number;
  scrollRootRef: RefObject<HTMLDivElement | null>;
  onOpenAd: (id: string) => void;
};

function TimelineBar({
  ad,
  viewStart,
  viewEnd,
  viewSpan,
  trackWidthPx,
  minLifespan,
  maxLifespan,
  scrollRootRef,
  onOpenAd,
}: BarProps) {
  const barRef = useRef<HTMLDivElement | null>(null);
  const [hovered, setHovered] = useState(false);
  const nowMs = Date.now();

  const start = new Date(ad.first_seen_at).getTime();
  const end = effectiveBarEndMs(ad, viewEnd, nowMs);
  const lifespanDays = displayLifespanDays(ad, nowMs);

  const visibleStart = Math.max(start, viewStart);
  const visibleEnd = Math.min(end, viewEnd);
  let leftPct = ((visibleStart - viewStart) / viewSpan) * 100;
  let widthPct = ((visibleEnd - visibleStart) / viewSpan) * 100;
  leftPct = Math.min(100, Math.max(0, leftPct));
  widthPct = Math.min(100, Math.max(0, widthPct));

  const minPct = trackWidthPx > 0 ? (4 / trackWidthPx) * 100 : 0.8;
  const naturalPx = (widthPct / 100) * trackWidthPx;
  const spanDays = Math.max(viewSpan / DAY_MS, 1);
  const shareBoostPx = Math.min(trackWidthPx * 0.14, (lifespanDays / spanDays) * trackWidthPx * 0.12);
  const lifeRange = Math.max(1, maxLifespan - minLifespan);
  const rankSpreadPx =
    maxLifespan > minLifespan + 1 ? ((lifespanDays - minLifespan) / lifeRange) * 22 : lifespanDays * 0.16;
  const perDayPx = Math.min(26, lifespanDays * 0.22);
  const candidates = [
    naturalPx + shareBoostPx + rankSpreadPx,
    lifespanDays === 0 ? Math.max(naturalPx, 6) : naturalPx + perDayPx,
  ];
  if (lifespanDays > 0 && naturalPx < 16) {
    candidates.push(8 + lifespanDays * 0.58);
  }
  const renderPx = Math.max(...candidates);
  const renderWidth = Math.min(100 - leftPct, trackWidthPx > 0 ? (renderPx / trackWidthPx) * 100 : Math.max(widthPct, minPct));
  const isDot = lifespanDays === 0 && naturalPx < 1;

  const tone = barToneForAd(ad, nowMs);
  const bg = barToneClasses(tone);
  const textCls =
    tone === "killed_old" || tone === "brand_bid" ? "text-slate-800" : "text-white";

  const rounded = start < viewStart ? "rounded-l-none rounded-r-md" : "rounded-md";
  const fadeActive = !ad.is_killed ? "bg-gradient-to-r from-white/0 via-white/0 to-white/30" : "";

  return (
    <>
      <div
        ref={barRef}
        className={cn("absolute z-10 cursor-pointer transition-[box-shadow]", hovered && "rounded-md ring-2 ring-sky-500/35")}
        style={{
          left: `${leftPct}%`,
          top: "18px",
          width: `${renderWidth}%`,
          height: "28px",
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={(e) => {
          e.stopPropagation();
          onOpenAd(ad.id);
        }}
      >
        <div className={cn("relative flex h-full w-full items-center overflow-hidden px-2 shadow-sm ring-1 ring-slate-900/10", bg, rounded)}>
          {!isDot ? <span className={cn("truncate text-[10px] font-semibold", textCls)}>{lifespanDays}d</span> : null}
          <span className={cn("pointer-events-none absolute inset-0", fadeActive)} aria-hidden />
        </div>
      </div>
      <TooltipPortal open={hovered} anchorRef={barRef} scrollRootRef={scrollRootRef}>
        <BarTip ad={ad} lifespanDays={lifespanDays} />
      </TooltipPortal>
    </>
  );
}

type Props = {
  ads: TimelineAd[];
  viewStart: number;
  viewEnd: number;
  zoom: TimelineZoom;
  sort: TimelineSort;
  onOpenAd: (id: string) => void;
  sentinelRef?: RefObject<HTMLDivElement | null>;
};

export function TimelineGantt({ ads, viewStart, viewEnd, zoom, sort, onOpenAd, sentinelRef }: Props) {
  const scrollRootRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [trackW, setTrackW] = useState(640);

  useEffect(() => {
    const el = trackRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setTrackW(Math.max(200, el.clientWidth)));
    ro.observe(el);
    setTrackW(Math.max(200, el.clientWidth));
    return () => ro.disconnect();
  }, []);

  const viewSpan = Math.max(viewEnd - viewStart, 1);
  const maxTicks = Math.max(2, Math.floor(trackW / 80));
  const ticks = useMemo(
    () => buildTimelineTicks(viewStart, viewEnd, maxTicks, zoom),
    [viewStart, viewEnd, maxTicks, zoom],
  );

  const rows = useMemo(() => toGanttRows(ads, sort), [ads, sort]);

  const { minLifespan, maxLifespan } = useMemo(() => {
    const lives = ads.map((a) => displayLifespanDays(a, Date.now()));
    if (!lives.length) return { minLifespan: 0, maxLifespan: 1 };
    return { minLifespan: Math.min(...lives), maxLifespan: Math.max(...lives) };
  }, [ads]);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex border-b border-slate-200 bg-slate-50">
        <div style={{ width: LABEL_COL }} className="shrink-0 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Ad</p>
        </div>
        <div ref={trackRef} className="relative h-10 flex-1 overflow-hidden">
          {ticks.map((tk, i) => (
            <div
              key={`${tk.t}-${i}`}
              className="absolute bottom-0 top-0 border-l border-slate-300/90 pl-1 pt-2 text-[11px] font-medium text-slate-600"
              style={{ left: `${tk.pct}%` }}
            >
              <span className="whitespace-nowrap">{tk.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div ref={scrollRootRef} className="max-h-[min(70vh,720px)] overflow-y-auto">
        {rows.map((row, idx) => {
          if (row.type === "platform") {
            return (
              <div
                key={`p-${row.platform}-${idx}`}
                className="sticky top-0 z-20 flex border-b border-slate-200 bg-slate-100/90"
              >
                <div
                  style={{ width: LABEL_COL }}
                  className="shrink-0 px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-700"
                >
                  {platformLabel(row.platform)}
                </div>
                <div className="h-9 flex-1 border-l border-slate-200/80" />
              </div>
            );
          }
          const ad = row.ad;
          const parsed = parseAngleForDisplay(ad.ai_extracted_angle ?? "");
          const hook = parsed.hook || parsed.rawHead;
          const angleLine = hook ? `${hook.slice(0, 42)}${hook.length > 42 ? "…" : ""}` : "—";
          const tone = barToneForAd(ad, Date.now());
          const statusLabel = ad.is_killed ? "Retired" : "Active";
          const dotCls =
            tone === "winner_active"
              ? "bg-slate-800"
              : tone === "active"
                ? "bg-sky-700"
                : tone === "killed_recent"
                  ? "bg-slate-500"
                  : tone === "brand_bid"
                    ? "bg-slate-300"
                    : "bg-slate-400";

          return (
            <div
              key={ad.id}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onOpenAd(ad.id);
                }
              }}
              onClick={() => onOpenAd(ad.id)}
              className="flex cursor-pointer items-stretch border-b border-slate-100 transition-colors hover:bg-slate-50"
              style={{ minHeight: ROW_H }}
            >
              <div
                style={{ width: LABEL_COL }}
                className="flex shrink-0 gap-3 border-r border-slate-200 bg-white px-3 py-3"
              >
                <div className="relative shrink-0 overflow-hidden rounded-lg bg-slate-100" style={{ width: THUMB, height: THUMB }}>
                  {ad.ad_creative_url ? (
                    <img
                      src={ad.ad_creative_url}
                      alt=""
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <ComparisonPlatformIcon platform={ad.platform as StrategyPlatform} className="h-6 w-6 opacity-40" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1 truncate text-sm font-medium text-slate-900">
                    <span className="truncate">{headlineForAd(ad)}</span>
                    {ad.is_winner ? <Trophy className="h-3.5 w-3.5 shrink-0 text-slate-600" aria-hidden /> : null}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-slate-600">
                    <ComparisonPlatformIcon platform={ad.platform as StrategyPlatform} className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{angleLine}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs font-semibold text-slate-700">
                    <span className={cn("h-2 w-2 shrink-0 rounded-full", dotCls)} aria-hidden />
                    <span>
                      {statusLabel} · {displayLifespanDays(ad, Date.now())}d
                    </span>
                    {ad.format ? (
                      <>
                        <span className="text-slate-300">·</span>
                        <span className="capitalize text-slate-500">{ad.format}</span>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="relative flex min-h-[64px] flex-1 items-stretch bg-white">
                {ticks.map((tk, i) => (
                  <div
                    key={`g-${tk.t}-${i}`}
                    className="pointer-events-none absolute bottom-0 top-0 border-l border-slate-200/90"
                    style={{ left: `${tk.pct}%` }}
                  />
                ))}
                <div className="relative w-full">
                  <TimelineBar
                    ad={ad}
                    viewStart={viewStart}
                    viewEnd={viewEnd}
                    viewSpan={viewSpan}
                    trackWidthPx={trackW}
                    minLifespan={minLifespan}
                    maxLifespan={maxLifespan}
                    scrollRootRef={scrollRootRef}
                    onOpenAd={onOpenAd}
                  />
                </div>
              </div>
            </div>
          );
        })}
        {sentinelRef ? <div ref={sentinelRef} className="h-4 w-full" aria-hidden /> : null}
      </div>
    </div>
  );
}
