"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { CalendarRange, Trophy } from "lucide-react";
import { motion } from "framer-motion";

import { COMPARISON_PLATFORM_ORDER, ComparisonPlatformIcon } from "@/components/comparison/platform-icon";
import { CacheRevalidatingDot, DataFreshnessBadge } from "@/components/competitor/data-freshness-badge";
import { RivalLoadingBlock } from "@/components/ui/rival-loading";
import { useScrapeKeyedCache } from "@/lib/cache/use-scrape-keyed-cache";
import type { StrategyPlatform } from "@/lib/strategy-overview/payload-types";

type TimelineAd = {
  id: string;
  platform: string;
  ad_creative_url: string | null;
  ad_text: string;
  ai_extracted_angle: string | null;
  first_seen_at: string;
  last_seen_at: string;
  format: string;
  is_winner: boolean;
  is_killed: boolean;
};

type TimelineResponse = {
  ok: boolean;
  competitor?: { id: string; name: string; lastScrapedAt: string | null };
  ads?: TimelineAd[];
  platformCounts?: Record<string, number>;
  dateRange?: { earliest: string; latest: string };
  error?: string;
};

type ZoomLevel = "30d" | "90d" | "6mo" | "1y" | "all";

const ALL_PLATFORMS = [...COMPARISON_PLATFORM_ORDER, "youtube", "microsoft"] as const;

function computeLifespanDays(firstSeenAt: string, lastSeenAt: string): number {
  const start = new Date(firstSeenAt).getTime();
  const end = new Date(lastSeenAt).getTime();
  return Math.max(0, Math.floor((end - start) / (24 * 60 * 60 * 1000)));
}

const PLATFORM_LABELS: Record<string, string> = {
  meta: "Meta",
  google: "Google",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
  pinterest: "Pinterest",
  snapchat: "Snapchat",
  youtube: "YouTube",
  microsoft: "Microsoft",
};

function platformLabel(p: string): string {
  return PLATFORM_LABELS[p] ?? p.charAt(0).toUpperCase() + p.slice(1);
}

function platformSortIndex(p: string): number {
  const i = (ALL_PLATFORMS as readonly string[]).indexOf(p);
  return i === -1 ? 1000 : i;
}

type Props = {
  competitorId: string;
  competitorLabel: string;
  onOpenAd: (adId: string) => void;
  cacheDomainNorm: string;
  lastScrapedAt?: string | null;
  onFreshnessRescrape?: () => void;
};

export function TimelineTab({
  competitorId,
  competitorLabel,
  onOpenAd,
  cacheDomainNorm,
  lastScrapedAt = null,
  onFreshnessRescrape,
}: Props) {
  const domainKey = cacheDomainNorm.trim().toLowerCase();
  const stamp = lastScrapedAt ?? "none";
  const cacheKey = `${domainKey}:timeline:${competitorId}:${stamp}`;

  const { data, loading, isValidating, error: hookError, refetch } = useScrapeKeyedCache<TimelineResponse>({
    cacheKey,
    enabled: Boolean(competitorId && domainKey),
    validateCached: (c) => c.ok === true && Array.isArray(c.ads),
    fetcher: async () => {
      const r = await fetch(`/api/timeline?competitorId=${encodeURIComponent(competitorId)}`, {
        credentials: "include",
      });
      const res = (await r.json()) as TimelineResponse;
      if (!res.ok) {
        throw new Error(res.error ?? "Failed to load");
      }
      return res;
    },
  });

  const loadErr = hookError?.message ?? null;

  const [zoom, setZoom] = useState<ZoomLevel>("90d");
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!data?.ok || !data.platformCounts) return;
    const counts = data.platformCounts;
    const withData = Object.keys(counts)
      .filter((p) => (counts[p] ?? 0) > 0)
      .sort((a, b) => platformSortIndex(a) - platformSortIndex(b) || a.localeCompare(b));
    setSelectedPlatforms(new Set(withData));
  }, [data]);

  const viewWindow = useMemo(() => {
    if (!data?.dateRange) return null;
    const latest = new Date(data.dateRange.latest).getTime();

    if (zoom === "all") {
      const earliest = new Date(data.dateRange.earliest).getTime();
      return { start: earliest, end: latest };
    }

    let windowMs: number;
    switch (zoom) {
      case "30d":
        windowMs = 30 * 24 * 60 * 60 * 1000;
        break;
      case "90d":
        windowMs = 90 * 24 * 60 * 60 * 1000;
        break;
      case "6mo":
        windowMs = 180 * 24 * 60 * 60 * 1000;
        break;
      case "1y":
        windowMs = 365 * 24 * 60 * 60 * 1000;
        break;
      default:
        windowMs = 90 * 24 * 60 * 60 * 1000;
    }
    return { start: latest - windowMs, end: latest };
  }, [data, zoom]);

  const visibleAds = useMemo(() => {
    if (!data?.ads || !viewWindow) return [];
    return data.ads.filter((ad) => {
      if (!selectedPlatforms.has(ad.platform)) return false;
      const adEnd = new Date(ad.last_seen_at).getTime();
      const adStart = new Date(ad.first_seen_at).getTime();
      return adEnd >= viewWindow.start && adStart <= viewWindow.end;
    });
  }, [data, selectedPlatforms, viewWindow]);

  const sortedAds = useMemo(() => {
    return [...visibleAds].sort(
      (a, b) => new Date(b.first_seen_at).getTime() - new Date(a.first_seen_at).getTime(),
    );
  }, [visibleAds]);

  const platformsWithData = useMemo(() => {
    const counts = data?.platformCounts ?? {};
    return Object.keys(counts)
      .filter((p) => (counts[p] ?? 0) > 0)
      .sort((a, b) => platformSortIndex(a) - platformSortIndex(b) || a.localeCompare(b));
  }, [data?.platformCounts]);

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(platform)) next.delete(platform);
      else next.add(platform);
      return next;
    });
  };

  if (!competitorId) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
        <CalendarRange className="mb-3 h-8 w-8 text-slate-400" />
        <p className="text-[13px] text-slate-600">Save this competitor first to view timeline.</p>
      </div>
    );
  }

  if (loading && !data && !loadErr) {
    return (
      <RivalLoadingBlock
        title="Loading timeline…"
        description="Fetching first-seen and last-seen dates so we can timeline every creative."
        padded
        className="mx-auto max-w-6xl py-16 sm:py-24"
      />
    );
  }

  if (loadErr) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-6">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          Failed to load timeline: {loadErr}
          <button type="button" className="mt-2 block text-[12px] font-semibold underline" onClick={() => void refetch()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data?.ads || data.ads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
          <CalendarRange className="h-8 w-8 text-slate-400" />
        </div>
        <h3 className="mb-2 text-[16px] font-semibold text-slate-900">No timeline data yet</h3>
        <p className="max-w-md text-[13px] leading-relaxed text-slate-600">
          No ads scraped for {competitorLabel} yet. Once their ads appear in the library, you&apos;ll see each ad&apos;s
          lifespan visualized here.
        </p>
      </div>
    );
  }

  return (
    <div className="relative mx-auto max-w-6xl px-6 py-6">
      <CacheRevalidatingDot show={isValidating && !!data} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h2 className="text-[20px] font-bold tracking-tight text-slate-900">Timeline</h2>
        <DataFreshnessBadge lastScrapedAt={lastScrapedAt} onRefresh={onFreshnessRescrape} />
      </div>
      <p className="mt-1 text-[13px] text-slate-600 mb-4">
        One row per ad {competitorLabel} has run. Bar length = lifespan. Gold = identified winner. Newest first.
      </p>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
          {(["30d", "90d", "6mo", "1y", "all"] as ZoomLevel[]).map((z) => (
            <button
              key={z}
              type="button"
              onClick={() => setZoom(z)}
              className={`rounded-md px-3 py-1 text-[11px] font-semibold transition-colors ${
                zoom === z ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {z === "all" ? "All time" : z.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {platformsWithData.map((platform) => {
            const count = data.platformCounts?.[platform] ?? 0;
            const isSelected = selectedPlatforms.has(platform);
            return (
              <button
                key={platform}
                type="button"
                onClick={() => togglePlatform(platform)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  isSelected
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                }`}
              >
                <ComparisonPlatformIcon platform={platform as StrategyPlatform} className="h-3 w-3" />
                {platformLabel(platform)}
                <span
                  className={`rounded-full px-1.5 py-0 text-[9px] font-bold ${
                    isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {viewWindow && sortedAds.length > 0 ? (
        <GanttChart ads={sortedAds} viewStart={viewWindow.start} viewEnd={viewWindow.end} onOpenAd={onOpenAd} />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 px-6 py-12 text-center">
          <p className="text-[13px] text-slate-500">No ads in the selected time window. Try expanding the zoom.</p>
        </div>
      )}
    </div>
  );
}

type GanttChartProps = {
  ads: TimelineAd[];
  viewStart: number;
  viewEnd: number;
  onOpenAd: (adId: string) => void;
};

function GanttChart({ ads, viewStart, viewEnd, onOpenAd }: GanttChartProps) {
  const viewSpan = Math.max(viewEnd - viewStart, 1);
  const LABEL_COL_WIDTH = 280;
  const scrollRootRef = useRef<HTMLDivElement | null>(null);

  const dateMarkers = useMemo(() => {
    const months: { label: string; pct: number }[] = [];
    const start = new Date(viewStart);
    const end = new Date(viewEnd);
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cursor <= end) {
      const t = cursor.getTime();
      if (t >= viewStart && t <= viewEnd) {
        const pct = ((t - viewStart) / viewSpan) * 100;
        months.push({
          label: cursor.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
          pct: Math.min(100, Math.max(0, pct)),
        });
      }
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return months;
  }, [viewStart, viewEnd, viewSpan]);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex border-b border-slate-200 bg-slate-50">
        <div
          style={{ width: LABEL_COL_WIDTH }}
          className="shrink-0 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500"
        >
          Ad
        </div>
        <div className="relative h-8 flex-1">
          {dateMarkers.map((m, i) => (
            <div
              key={i}
              className="absolute bottom-0 top-0 border-l border-slate-200 py-2 pl-1 pr-2 text-[10px] font-medium text-slate-500"
              style={{ left: `${m.pct}%` }}
            >
              {m.label}
            </div>
          ))}
        </div>
      </div>

      <div ref={scrollRootRef} className="max-h-[600px] overflow-y-auto" data-timeline-scroll-root>
        {ads.map((ad) => (
          <AdRow
            key={ad.id}
            ad={ad}
            viewStart={viewStart}
            viewEnd={viewEnd}
            viewSpan={viewSpan}
            dateMarkers={dateMarkers}
            labelColWidth={LABEL_COL_WIDTH}
            onOpenAd={onOpenAd}
            scrollRootRef={scrollRootRef}
          />
        ))}
      </div>
    </div>
  );
}

type AdRowProps = {
  ad: TimelineAd;
  viewStart: number;
  viewEnd: number;
  viewSpan: number;
  dateMarkers: { label: string; pct: number }[];
  labelColWidth: number;
  onOpenAd: (adId: string) => void;
  scrollRootRef: RefObject<HTMLDivElement | null>;
};

const TIMELINE_ROW_MIN_HEIGHT = 56;

function AdRow({ ad, viewStart, viewEnd, viewSpan, dateMarkers, labelColWidth, onOpenAd, scrollRootRef }: AdRowProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenAd(ad.id);
        }
      }}
      onClick={() => onOpenAd(ad.id)}
      className="flex cursor-pointer items-stretch border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50/50"
      style={{ minHeight: TIMELINE_ROW_MIN_HEIGHT }}
    >
      <div
        style={{ width: labelColWidth }}
        className="flex shrink-0 items-center gap-2.5 border-r border-slate-200 bg-white px-3 py-2"
      >
        <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-md bg-slate-100">
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
              <ComparisonPlatformIcon platform={ad.platform as StrategyPlatform} className="h-4 w-4 opacity-40" />
            </div>
          )}
          {ad.is_killed ? <div className="absolute inset-0 bg-slate-900/30" /> : null}
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-0.5 flex items-center gap-1.5">
            <ComparisonPlatformIcon platform={ad.platform as StrategyPlatform} className="h-3 w-3 shrink-0" />
            <span className="truncate text-[12px] font-semibold text-slate-900">
              {ad.ai_extracted_angle?.trim() || ad.ad_text?.slice(0, 40)?.trim() || "Untitled ad"}
            </span>
            {ad.is_winner ? <Trophy className="h-3 w-3 shrink-0 text-amber-500" /> : null}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500">
            <span className={`h-1 w-1 shrink-0 rounded-full ${ad.is_killed ? "bg-slate-400" : "bg-green-500"}`} />
            <span>{ad.is_killed ? "Killed" : "Active"}</span>
            <span>·</span>
            <span>{computeLifespanDays(ad.first_seen_at, ad.last_seen_at)}d running</span>
            {ad.format ? (
              <>
                <span>·</span>
                <span className="capitalize">{ad.format}</span>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <div className="relative flex min-h-[56px] flex-1 items-center py-2">
        {dateMarkers.map((m, i) => (
          <div key={i} className="absolute bottom-2 top-2 border-l border-slate-100" style={{ left: `${m.pct}%` }} />
        ))}
        <div className="relative h-7 w-full">
          <AdBar
            ad={ad}
            idx={0}
            rowMode
            viewStart={viewStart}
            viewEnd={viewEnd}
            viewSpan={viewSpan}
            swimlaneHeight={28}
            gap={0}
            scrollRootRef={scrollRootRef}
          />
        </div>
      </div>
    </div>
  );
}

type AdBarProps = {
  ad: TimelineAd;
  idx: number;
  rowMode?: boolean;
  viewStart: number;
  viewEnd: number;
  viewSpan: number;
  swimlaneHeight: number;
  gap: number;
  scrollRootRef: RefObject<HTMLDivElement | null>;
};

function TimelineTooltipPortal({
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

  const updatePos = useCallback(() => {
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
    updatePos();
    const root = scrollRootRef.current;
    const onScroll = () => updatePos();
    root?.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      root?.removeEventListener("scroll", onScroll);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [open, updatePos, scrollRootRef]);

  if (!open || pos == null || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="pointer-events-none fixed z-[200] w-64"
      style={{
        left: pos.x,
        top: pos.y - 8,
        transform: "translate(-50%, -100%)",
      }}
    >
      {children}
    </div>,
    document.body,
  );
}

function AdBar({ ad, idx, rowMode, viewStart, viewEnd, viewSpan, swimlaneHeight, gap, scrollRootRef }: AdBarProps) {
  const barRef = useRef<HTMLDivElement | null>(null);
  const [hovered, setHovered] = useState(false);

  const start = new Date(ad.first_seen_at).getTime();
  const end = new Date(ad.last_seen_at).getTime();
  const lifespanMs = end - start;
  const lifespanDays = Math.floor(lifespanMs / (24 * 60 * 60 * 1000));

  const isZeroLifespan = lifespanDays === 0;
  const isGoogle = ad.platform === "google";

  const visibleStart = Math.max(start, viewStart);
  const visibleEnd = Math.min(end, viewEnd);
  const extendsLeft = start < viewStart;
  const extendsRight = end > viewEnd;

  let leftPct = ((visibleStart - viewStart) / viewSpan) * 100;
  let widthPct = ((visibleEnd - visibleStart) / viewSpan) * 100;
  leftPct = Math.min(100, Math.max(0, leftPct));
  widthPct = Math.min(100, Math.max(widthPct, 0));

  const top = rowMode ? 0 : idx * (swimlaneHeight + gap) + 2;

  let bgClass: string;
  let ringClass = "";
  if (ad.is_winner) {
    bgClass = "bg-amber-400";
    ringClass = "ring-2 ring-amber-300 ring-offset-1 ring-offset-white";
  } else if (ad.is_killed) {
    bgClass = "bg-slate-300";
  } else {
    bgClass = "bg-green-400";
  }

  const showDayLabel = widthPct > 8 || extendsLeft || extendsRight;
  const roundedLeft = extendsLeft ? "rounded-l-none" : "rounded-l-md";
  const roundedRight = extendsRight ? "rounded-r-none" : "rounded-r-md";

  if (isGoogle && isZeroLifespan) {
    const t = start;
    const dotExtendsLeft = t < viewStart;
    const dotExtendsRight = t > viewEnd;
    const clampedT = Math.min(Math.max(t, viewStart), viewEnd);
    const dotLeftPct = Math.min(100, Math.max(0, ((clampedT - viewStart) / viewSpan) * 100));

    return (
      <>
        <div
          ref={barRef}
          className="absolute z-10"
          style={{
            left: `${dotLeftPct}%`,
            top: `${top}px`,
            width: "14px",
            height: `${swimlaneHeight - 4}px`,
            transform: "translateX(-7px)",
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <motion.div
            className="flex h-full w-full cursor-pointer items-center justify-center"
            whileHover={{ scale: 1.12 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
          >
            <div className={`h-3 w-3 rounded-full ${bgClass} ${ad.is_winner ? ringClass : ""}`} />
          </motion.div>
        </div>
        <TimelineTooltipPortal open={hovered} anchorRef={barRef} scrollRootRef={scrollRootRef}>
          <TooltipCard ad={ad} lifespanDays={lifespanDays} clipped={dotExtendsLeft || dotExtendsRight} />
        </TimelineTooltipPortal>
      </>
    );
  }

  const renderWidthPct = Math.max(widthPct, lifespanDays > 0 && widthPct < 0.35 ? 0.35 : 0);

  return (
    <>
      <div
        ref={barRef}
        className="absolute z-10 cursor-pointer"
        style={{
          left: `${leftPct}%`,
          top: `${top}px`,
          width: `${renderWidthPct}%`,
          height: `${swimlaneHeight - 4}px`,
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <motion.div
          className="relative h-full w-full overflow-visible"
          whileHover={{ scaleY: 1.08, scaleX: 1.02 }}
          transition={{ type: "spring", stiffness: 420, damping: 26 }}
          style={{ transformOrigin: "center center" }}
        >
          <div
            className={`relative flex h-full w-full items-center overflow-hidden px-2 shadow-sm ${bgClass} ${ringClass} ${roundedLeft} ${roundedRight} ${ad.is_killed ? "opacity-95" : ""}`}
          >
            {ad.is_winner ? <Trophy className="h-3 w-3 shrink-0 text-amber-900" /> : null}
            {showDayLabel ? (
              <span className="ml-1 truncate text-[10px] font-semibold text-white">
                {lifespanDays}d
                {extendsLeft || extendsRight ? (
                  <span className="ml-1 opacity-70">(partial)</span>
                ) : null}
              </span>
            ) : null}
            <span
              className="pointer-events-none absolute right-0 top-0 bottom-0 w-px bg-white/45"
              aria-hidden
            />
          </div>
        </motion.div>
      </div>
      <TimelineTooltipPortal open={hovered} anchorRef={barRef} scrollRootRef={scrollRootRef}>
        <TooltipCard ad={ad} lifespanDays={lifespanDays} clipped={extendsLeft || extendsRight} />
      </TimelineTooltipPortal>
    </>
  );
}

function TooltipCard({
  ad,
  lifespanDays,
  clipped,
}: {
  ad: TimelineAd;
  lifespanDays: number;
  clipped?: boolean;
}) {
  const startDate = new Date(ad.first_seen_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const endDate = new Date(ad.last_seen_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="rounded-lg bg-slate-900 p-3 text-white shadow-xl">
      <div className="flex gap-2">
        {ad.ad_creative_url ? (
          <img
            src={ad.ad_creative_url}
            alt=""
            className="h-12 w-12 shrink-0 rounded object-cover"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-slate-700">
            <ComparisonPlatformIcon platform={ad.platform as StrategyPlatform} className="h-5 w-5 opacity-60" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          {ad.ai_extracted_angle ? (
            <p className="mb-1 line-clamp-1 text-[10px] font-semibold text-amber-300">{ad.ai_extracted_angle}</p>
          ) : null}
          <p className="mb-1 line-clamp-2 text-[10px] text-slate-200">{ad.ad_text?.slice(0, 100) || "—"}</p>
        </div>
      </div>
      <div className="mt-2 flex justify-between border-t border-slate-700 pt-2 text-[10px] text-slate-400">
        <span>
          {startDate} → {endDate}
        </span>
        <span className="font-semibold text-white">
          {ad.platform === "google" && lifespanDays === 0 ? "Lifespan N/A" : `${lifespanDays}d`}
        </span>
      </div>
      {ad.is_winner ? (
        <div className="mt-2 flex items-center gap-1 border-t border-slate-700 pt-2">
          <Trophy className="h-3 w-3 text-amber-400" />
          <span className="text-[10px] font-semibold text-amber-400">WINNER</span>
        </div>
      ) : null}
      {clipped ? (
        <p className="mt-2 border-t border-slate-700 pt-2 text-[10px] text-slate-400">
          Bar shows only the portion visible in the current zoom window.
        </p>
      ) : null}
    </div>
  );
}
