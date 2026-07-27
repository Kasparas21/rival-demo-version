"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { Image as ImageIcon, LayoutList, Minus, Plus, Sparkles, Trophy, Video } from "lucide-react";

import { ComparisonPlatformIcon } from "@/components/comparison/platform-icon";
import { CreativeTestPreviewThumb } from "@/components/competitor/tests-timeline/creative-test-preview-thumb";
import { parseAngleForDisplay } from "@/lib/comparison/stealable-angle-present";
import { cn } from "@/lib/utils";
import type { StrategyPlatform } from "@/lib/strategy-overview/payload-types";

import { DurationLifespanBar, formatLifespanLabel } from "./duration-lifespan-bar";
import type { TimelineAd, TimelineGanttRow, TimelineViewFields } from "./timeline-types";
import {
  buildDayColumns,
  buildMonthSpans,
  computeBarGeometry,
  displayLifespanDays,
  groupDuplicateAds,
  headlineForAd,
} from "./timeline-helpers";

const LABEL_COL = 300;
const ROW_H = 72;
const THUMB = 40;
const MIN_DAY_COL = 18;
const MAX_DAY_COL = 56;
const DEFAULT_DAY_COL = 28;

function timelineMediaIcon(format: string | null | undefined) {
  const f = (format ?? "").toLowerCase();
  if (f.includes("video") || f === "reels" || f === "story") {
    return <Video className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />;
  }
  return <ImageIcon className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />;
}

function adCopySnippet(ad: TimelineAd): string {
  const t = (ad.ad_text ?? "").replace(/\s+/g, " ").trim();
  if (!t) return "—";
  return t.length > 72 ? `${t.slice(0, 69)}…` : t;
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

function BarTip({ ad, lifespanDays, duplicateCount }: { ad: TimelineAd; lifespanDays: number; duplicateCount?: number }) {
  const s = new Date(ad.first_seen_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const end = ad.is_killed
    ? new Date(ad.last_seen_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "Still running";
  return (
    <div className="rounded-lg bg-slate-900 p-3 text-xs text-white shadow-xl">
      <p className="line-clamp-2 font-semibold">{headlineForAd(ad)}</p>
      {duplicateCount && duplicateCount > 1 ? (
        <p className="mt-1 text-slate-300">{duplicateCount} ads with the same creative</p>
      ) : null}
      <p className="mt-2 text-slate-400">
        {s} → {end}
      </p>
      <p className="mt-1 font-semibold text-white">
        {lifespanDays === 0 ? "Single-day / brief appearance" : formatLifespanLabel(lifespanDays)}
      </p>
    </div>
  );
}

type TimelineBarProps = {
  ad: TimelineAd;
  viewStart: number;
  viewEnd: number;
  dayColWidth: number;
  scrollRootRef: RefObject<HTMLDivElement | null>;
  onOpenAd: (id: string) => void;
  duplicateCount?: number;
};

function TimelineBar({ ad, viewStart, viewEnd, dayColWidth, scrollRootRef, onOpenAd, duplicateCount }: TimelineBarProps) {
  const barRef = useRef<HTMLDivElement | null>(null);
  const [hovered, setHovered] = useState(false);
  const nowMs = Date.now();

  const geometry = computeBarGeometry(ad, viewStart, viewEnd, dayColWidth, nowMs);
  if (!geometry) return null;

  const variant = ad.is_killed ? "inactive" : "active";
  const showLabel = geometry.widthPx >= 56;

  return (
    <>
      <div
        ref={barRef}
        className={cn(
          "absolute z-10 cursor-pointer py-[18px] transition-[box-shadow]",
          hovered && "rounded-full ring-2 ring-[#137333]/25",
        )}
        style={{
          left: geometry.leftPx,
          width: geometry.widthPx,
          top: 0,
          height: ROW_H,
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={(e) => {
          e.stopPropagation();
          onOpenAd(ad.id);
        }}
      >
        <div className="flex h-7 items-center">
          <DurationLifespanBar
            lifespanDays={geometry.lifespanDays}
            maxDays={geometry.lifespanDays}
            variant={variant}
            widthPct={100}
            minWidthPx={Math.min(geometry.widthPx, 56)}
            labelAlign="end"
            className={cn("h-full", !showLabel && "[&_span]:sr-only")}
          />
          {duplicateCount && duplicateCount > 1 ? (
            <span className="ml-1 shrink-0 rounded-full border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
              {duplicateCount}…
            </span>
          ) : null}
        </div>
      </div>
      <TooltipPortal open={hovered} anchorRef={barRef} scrollRootRef={scrollRootRef}>
        <BarTip ad={ad} lifespanDays={geometry.lifespanDays} duplicateCount={duplicateCount} />
      </TooltipPortal>
    </>
  );
}

type LabelProps = {
  ad: TimelineAd;
  viewFields: TimelineViewFields;
  duplicateCount?: number;
};

function RowLabel({ ad, viewFields, duplicateCount }: LabelProps) {
  const parsed = parseAngleForDisplay(ad.ai_extracted_angle ?? "");
  const hook = parsed.hook || parsed.rawHead;
  const angleLine = hook ? `${hook.slice(0, 48)}${hook.length > 48 ? "…" : ""}` : "—";
  const lifespanDays = displayLifespanDays(ad, Date.now());
  const statusLabel = ad.is_killed ? "Retired" : "Active";
  const statusDotCls = ad.is_killed ? "bg-slate-300" : "bg-[#34a853]";

  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border border-slate-200/80 bg-slate-100">
        <CreativeTestPreviewThumb
          creativeUrl={ad.ad_creative_url}
          archivedCreativeUrl={ad.archived_creative_url}
          platform={ad.platform}
        />
      </div>
      {timelineMediaIcon(ad.format)}
      <div className="min-w-0 flex-1">
        {viewFields.headlineCta ? (
          <p className="flex items-center gap-1 truncate text-[13px] font-medium text-slate-900">
            <span className="truncate">{headlineForAd(ad)}</span>
            {ad.is_ultimate_winner ? (
              <span
                className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0 text-[10px] font-bold text-amber-800"
                title="Ultimate winner — high impressions and long runtime"
              >
                <Sparkles className="h-3 w-3" aria-hidden />
                Ultimate
              </span>
            ) : null}
            {ad.is_winner ? <Trophy className="h-3.5 w-3.5 shrink-0 text-[#e37400]" aria-hidden /> : null}
            {duplicateCount && duplicateCount > 1 ? (
              <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0 text-[10px] font-bold text-slate-600">
                ×{duplicateCount}
              </span>
            ) : null}
          </p>
        ) : null}
        {viewFields.brandDetails ? (
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600">
            <ComparisonPlatformIcon platform={ad.platform as StrategyPlatform} className="h-3 w-3 shrink-0" />
            <span className="truncate">{angleLine}</span>
          </div>
        ) : null}
        {viewFields.adCopy ? (
          <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-500">{adCopySnippet(ad)}</p>
        ) : null}
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-slate-600">
          <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", statusDotCls)} aria-hidden />
          <span>
            {statusLabel} · {formatLifespanLabel(lifespanDays)}
          </span>
          {typeof ad.impressions_index === "number" && Number.isFinite(ad.impressions_index) ? (
            <span className="rounded-full bg-slate-100 px-1.5 py-0 text-[10px] font-semibold text-slate-600">
              Imp. band {ad.impressions_index}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

type Props = {
  ads: TimelineAd[];
  viewStart: number;
  viewEnd: number;
  groupDuplicates: boolean;
  viewFields: TimelineViewFields;
  onOpenAd: (adId: string) => void;
  sentinelRef?: RefObject<HTMLDivElement | null>;
};

export function TimelineGantt({
  ads,
  viewStart,
  viewEnd,
  groupDuplicates,
  viewFields,
  onOpenAd,
  sentinelRef,
}: Props) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [dayColWidth, setDayColWidth] = useState(DEFAULT_DAY_COL);
  const [scrollKey, setScrollKey] = useState(0);

  const dayColumns = useMemo(() => buildDayColumns(viewStart, viewEnd), [viewStart, viewEnd]);
  const monthSpans = useMemo(() => buildMonthSpans(dayColumns), [dayColumns]);
  const trackWidthPx = Math.max(dayColumns.length * dayColWidth, 120);

  const rows = useMemo(() => groupDuplicateAds(ads, groupDuplicates), [ads, groupDuplicates]);

  const scrollToEnd = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollLeft = Math.max(0, el.scrollWidth - el.clientWidth);
  }, []);

  useEffect(() => {
    scrollToEnd();
    setScrollKey((k) => k + 1);
  }, [viewStart, viewEnd, dayColWidth, ads.length, scrollToEnd]);

  const zoomIn = () => setDayColWidth((w) => Math.min(MAX_DAY_COL, w + 4));
  const zoomOut = () => setDayColWidth((w) => Math.max(MIN_DAY_COL, w - 4));

  const renderRow = (row: TimelineGanttRow, key: string) => {
    const ad = row.type === "ad" ? row.ad : row.representative;
    const duplicateCount = row.type === "duplicate-group" ? row.ads.length : undefined;

    return (
      <div
        key={key}
        role="button"
        tabIndex={0}
        onClick={() => onOpenAd(ad.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpenAd(ad.id);
          }
        }}
        className="flex cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50/70"
      >
        <div
          className="sticky left-0 z-20 shrink-0 border-r border-slate-200 bg-white px-3 py-3"
          style={{ width: LABEL_COL }}
        >
          <RowLabel ad={ad} viewFields={viewFields} duplicateCount={duplicateCount} />
        </div>
        <div className="relative shrink-0" style={{ width: trackWidthPx, height: ROW_H }}>
          {dayColumns.map((col) => (
            <div
              key={col.dayStartMs}
              className={cn(
                "pointer-events-none absolute bottom-0 top-0 border-l",
                col.isMonthStart ? "border-slate-300" : "border-slate-100",
              )}
              style={{ left: col.dayIndex * dayColWidth }}
            />
          ))}
          <TimelineBar
            ad={ad}
            viewStart={viewStart}
            viewEnd={viewEnd}
            dayColWidth={dayColWidth}
            scrollRootRef={scrollRef}
            onOpenAd={onOpenAd}
            duplicateCount={duplicateCount}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div ref={scrollRef} className="max-h-[min(72vh,760px)] overflow-auto">
        <div style={{ minWidth: LABEL_COL + trackWidthPx }}>
          <div className="sticky top-0 z-30 flex border-b border-slate-200 bg-slate-50">
            <div
              className="sticky left-0 z-40 shrink-0 border-r border-slate-200 bg-slate-50 px-3 py-2"
              style={{ width: LABEL_COL }}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-slate-800">
                  <LayoutList className="h-3.5 w-3.5 text-slate-500" aria-hidden />
                  Timeline
                </p>
                <div className="inline-flex overflow-hidden rounded-lg border border-slate-200 bg-white">
                  <button
                    type="button"
                    aria-label="Zoom out"
                    className="px-2 py-1 text-slate-600 hover:bg-slate-50"
                    onClick={zoomOut}
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Zoom in"
                    className="border-l border-slate-200 px-2 py-1 text-slate-600 hover:bg-slate-50"
                    onClick={zoomIn}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="relative shrink-0" style={{ width: trackWidthPx }}>
              {monthSpans.map((span) => (
                <div
                  key={span.monthKey}
                  className="absolute top-0 flex h-5 items-center border-b border-slate-200/80 pl-2 text-[11px] font-semibold text-slate-700"
                  style={{
                    left: span.startIndex * dayColWidth,
                    width: span.dayCount * dayColWidth,
                  }}
                >
                  {span.monthLabel}
                </div>
              ))}
              <div className="relative mt-5 flex h-7">
                {dayColumns.map((col) => (
                  <div
                    key={`d-${col.dayStartMs}`}
                    className={cn(
                      "flex shrink-0 items-center justify-center border-l text-[11px] font-medium text-slate-500",
                      col.isMonthStart ? "border-slate-300 text-slate-700" : "border-slate-100",
                    )}
                    style={{ width: dayColWidth }}
                  >
                    {col.dayOfMonth}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div key={scrollKey}>
            {rows.map((row, idx) =>
              renderRow(row, row.type === "ad" ? row.ad.id : `dup-${row.key}-${idx}`),
            )}
            {sentinelRef ? (
              <div ref={sentinelRef} className="flex border-b border-transparent">
                <div style={{ width: LABEL_COL }} />
                <div style={{ width: trackWidthPx, height: 8 }} />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
