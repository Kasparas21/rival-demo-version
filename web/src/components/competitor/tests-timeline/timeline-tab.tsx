"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarRange, HelpCircle } from "lucide-react";

import { CacheRevalidatingDot } from "@/components/competitor/data-freshness-badge";
import { FeatureSectionHeader } from "@/components/dashboard/feature-section-header";
import { useScrapeKeyedCache } from "@/lib/cache/use-scrape-keyed-cache";

import { TimelineActivityHeatmap } from "./timeline-activity-heatmap";
import { TimelineFiltersBar } from "./timeline-filters";
import { TimelineGantt } from "./timeline-gantt";
import type { TimelineStatSnapshot } from "./timeline-stats-cards";
import { TimelineStatsCards } from "./timeline-stats-cards";
import {
  adMatchesWeekFilter,
  aggregateWeekActivity,
  DAY_MS,
  headlineForAd,
  isBrandBidAngle,
  median,
  platformLabel,
  platformSortIndex,
  sortTimelineAds,
} from "./timeline-helpers";
import type { TimelineAd, TimelineSort, TimelineZoom } from "./timeline-types";

type TimelineResponseLight = {
  ok: boolean;
  competitor?: { id: string; name: string; lastScrapedAt: string | null };
  ads?: TimelineAd[];
  platformCounts?: Record<string, number>;
  dateRange?: { earliest: string; latest: string };
  error?: string;
};

type Props = {
  competitorId: string;
  competitorLabel: string;
  onOpenAd: (adId: string) => void;
  cacheDomainNorm: string;
  lastScrapedAt?: string | null;
  onFreshnessRescrape?: () => void;
  fetchEnabled?: boolean;
};

function relTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "—";
  const days = Math.max(0, Math.round((Date.now() - t) / DAY_MS));
  if (days === 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

function buildStats(ads: TimelineAd[]): TimelineStatSnapshot {
  const now = Date.now();
  if (!ads.length) {
    return {
      avgLifespan: 0,
      medianLifespan: 0,
      longestDays: 0,
      longestHeadline: "",
      activeCount: 0,
      platformDistinct: 0,
      launched30d: 0,
      mostRecentLaunchLabel: "",
      sampleSize: 0,
    };
  }
  const lifespans = ads.map((a) => {
    const end = a.is_killed ? new Date(a.last_seen_at).getTime() : now;
    return Math.max(0, Math.floor((end - new Date(a.first_seen_at).getTime()) / DAY_MS));
  });
  const avg = Math.round(lifespans.reduce((s, x) => s + x, 0) / lifespans.length);
  const med = Math.round(median(lifespans));
  let maxIdx = 0;
  lifespans.forEach((d, i) => {
    if (d > lifespans[maxIdx]!) maxIdx = i;
  });
  const longestDays = lifespans[maxIdx]!;
  const longestHeadline = headlineForAd(ads[maxIdx]!);
  const activeCount = ads.filter((a) => !a.is_killed).length;
  const activePlats = new Set(ads.filter((a) => !a.is_killed).map((a) => a.platform));
  const thirty = now - 30 * DAY_MS;
  const launched30d = ads.filter((a) => new Date(a.first_seen_at).getTime() >= thirty).length;
  const recent = [...ads].sort((a, b) => new Date(b.first_seen_at).getTime() - new Date(a.first_seen_at).getTime())[0];
  const mostRecentLaunchLabel = recent
    ? new Date(recent.first_seen_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "";
  return {
    avgLifespan: avg,
    medianLifespan: med,
    longestDays,
    longestHeadline,
    activeCount,
    platformDistinct: activePlats.size,
    launched30d,
    mostRecentLaunchLabel,
    sampleSize: ads.length,
  };
}

export function TimelineTab({
  competitorId,
  competitorLabel,
  onOpenAd,
  cacheDomainNorm,
  lastScrapedAt = null,
  onFreshnessRescrape,
  fetchEnabled = true,
}: Props) {
  const domainKey = cacheDomainNorm.trim().toLowerCase();
  const stamp = lastScrapedAt ?? "none";
  const cacheKey = `${domainKey}:timeline:${competitorId}:${stamp}`;

  const { data, loading, isValidating, error: hookError, refetch } = useScrapeKeyedCache<TimelineResponseLight>({
    cacheKey,
    enabled: Boolean(competitorId && domainKey && fetchEnabled),
    validateCached: (c) => c.ok === true && Array.isArray(c.ads),
    fetcher: async () => {
      const r = await fetch(`/api/timeline?competitorId=${encodeURIComponent(competitorId)}`, {
        credentials: "include",
      });
      const res = (await r.json()) as TimelineResponseLight;
      if (!res.ok) {
        throw new Error(res.error ?? "Failed to load");
      }
      return res;
    },
  });

  const loadErr = hookError?.message ?? null;

  const [zoom, setZoom] = useState<TimelineZoom>("90d");
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(new Set());
  const [showActive, setShowActive] = useState(true);
  const [showRetired, setShowRetired] = useState(true);
  const [showBrandBids, setShowBrandBids] = useState(false);
  const [sort, setSort] = useState<TimelineSort>("newest");
  const [heatmapWeek, setHeatmapWeek] = useState<number | null>(null);
  const [renderCount, setRenderCount] = useState(30);

  const rawAds = data?.ads ?? [];

  const brandBidCount = useMemo(() => rawAds.filter((a) => isBrandBidAngle(a.ai_extracted_angle)).length, [rawAds]);

  const brandFiltered = useMemo(() => {
    if (showBrandBids) return rawAds;
    return rawAds.filter((a) => !isBrandBidAngle(a.ai_extracted_angle));
  }, [rawAds, showBrandBids]);

  useEffect(() => {
    if (!showActive && !showRetired) {
      setShowRetired(true);
    }
  }, [showActive, showRetired]);

  useEffect(() => {
    if (!data?.platformCounts) return;
    const counts = data.platformCounts;
    const withData = Object.keys(counts)
      .filter((p) => (counts[p] ?? 0) > 0)
      .sort((a, b) => platformSortIndex(a) - platformSortIndex(b) || a.localeCompare(b));
    setSelectedPlatforms(new Set(withData));
  }, [data]);

  const platformChips = useMemo(() => {
    const m = new Map<string, number>();
    for (const ad of brandFiltered) {
      m.set(ad.platform, (m.get(ad.platform) ?? 0) + 1);
    }
    return [...m.entries()]
      .map(([id, count]) => ({ id, label: platformLabel(id), count }))
      .sort((a, b) => platformSortIndex(a.id) - platformSortIndex(b.id));
  }, [brandFiltered]);

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
        windowMs = 30 * DAY_MS;
        break;
      case "90d":
        windowMs = 90 * DAY_MS;
        break;
      case "6mo":
        windowMs = 180 * DAY_MS;
        break;
      case "1y":
        windowMs = 365 * DAY_MS;
        break;
      default:
        windowMs = 90 * DAY_MS;
    }
    return { start: latest - windowMs, end: latest };
  }, [data, zoom]);

  const stats = useMemo(() => buildStats(brandFiltered), [brandFiltered]);

  const heatBuckets = useMemo(() => aggregateWeekActivity(brandFiltered), [brandFiltered]);

  const lifecycleFiltered = useMemo(() => {
    return brandFiltered.filter((ad) => {
      if (showActive && !ad.is_killed) return true;
      if (showRetired && ad.is_killed) return true;
      return false;
    });
  }, [brandFiltered, showActive, showRetired]);

  const windowFiltered = useMemo(() => {
    if (!viewWindow) return [];
    return lifecycleFiltered.filter((ad) => {
      if (!selectedPlatforms.has(ad.platform)) return false;
      const adEnd = effectiveBarEndForFilter(ad, viewWindow.end);
      const adStart = new Date(ad.first_seen_at).getTime();
      return adEnd >= viewWindow.start && adStart <= viewWindow.end;
    });
  }, [lifecycleFiltered, selectedPlatforms, viewWindow]);

  function effectiveBarEndForFilter(ad: TimelineAd, viewEnd: number): number {
    if (!ad.is_killed) return Math.min(viewEnd, Date.now());
    return new Date(ad.last_seen_at).getTime();
  }

  const afterHeatFiltered = useMemo(() => {
    if (heatmapWeek == null) return windowFiltered;
    return windowFiltered.filter((ad) => adMatchesWeekFilter(ad, heatmapWeek));
  }, [windowFiltered, heatmapWeek]);

  const sortedAds = useMemo(() => sortTimelineAds(afterHeatFiltered, sort), [afterHeatFiltered, sort]);

  const displayAds = useMemo(() => sortedAds.slice(0, renderCount), [sortedAds, renderCount]);

  useEffect(() => {
    setRenderCount(30);
  }, [zoom, selectedPlatforms, showActive, showRetired, showBrandBids, sort, heatmapWeek, competitorId]);

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || displayAds.length >= sortedAds.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setRenderCount((n) => Math.min(n + 30, sortedAds.length));
        }
      },
      { root: null, rootMargin: "200px", threshold: 0 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [displayAds.length, sortedAds.length]);

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(platform)) next.delete(platform);
      else next.add(platform);
      return next;
    });
  };

  const activeInView = sortedAds.filter((a) => !a.is_killed).length;
  const retiredInView = sortedAds.filter((a) => a.is_killed).length;

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
      <div className="mx-auto max-w-6xl space-y-6 px-6 py-6">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-200" />
          ))}
        </div>
        <div className="h-36 animate-pulse rounded-2xl bg-slate-200" />
        <div className="h-96 animate-pulse rounded-2xl bg-slate-200" />
      </div>
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
        <h3 className="mb-2 text-lg font-semibold text-slate-900">Run a scrape to see history</h3>
        <p className="max-w-md text-sm leading-relaxed text-slate-600">
          Once ads are in your library, we&apos;ll show launches, lifespans, and retirements here.
        </p>
      </div>
    );
  }

  const onlyBrandBidsFiltered =
    !showBrandBids && brandFiltered.length === 0 && brandBidCount > 0 && rawAds.length > 0;

  const rangeEmpty = viewWindow && windowFiltered.length === 0 && lifecycleFiltered.length > 0;

  return (
    <div className="relative mx-auto w-full max-w-6xl space-y-8 px-6 py-6">
      <CacheRevalidatingDot show={isValidating && !!data} />

      <FeatureSectionHeader
        variant="card"
        className="mb-0"
        overline="Timeline"
        title={<>How {competitorLabel} has rolled out, run, and retired ads</>}
        description={
          <>
            Last scrape: {relTime(lastScrapedAt)} · {sortedAds.length} ads in view · {activeInView} active, {retiredInView}{" "}
            retired
            {heatmapWeek != null ? " · week filter on" : null}
          </>
        }
        actions={
          <>
            <button
              type="button"
              title="One row per ad. Bar length reflects lifespan in the selected range. Colors track status."
              className="rounded-full border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
            >
              <HelpCircle className="h-4 w-4" />
            </button>
            {onFreshnessRescrape ? (
              <button
                type="button"
                onClick={onFreshnessRescrape}
                className="text-xs font-semibold text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline"
              >
                Refresh scrape
              </button>
            ) : null}
          </>
        }
      />

      <TimelineFiltersBar
        zoom={zoom}
        onZoom={setZoom}
        platforms={platformChips}
        selectedPlatforms={selectedPlatforms}
        onTogglePlatform={togglePlatform}
        showActive={showActive}
        showRetired={showRetired}
        onShowActive={setShowActive}
        onShowRetired={setShowRetired}
        showBrandBids={showBrandBids}
        onShowBrandBids={setShowBrandBids}
        hiddenBrandBidCount={!showBrandBids ? brandBidCount : 0}
        sort={sort}
        onSort={setSort}
      />

      <TimelineStatsCards stats={stats} />

      {brandFiltered.length >= 5 && heatBuckets.length >= 2 ? (
        <TimelineActivityHeatmap buckets={heatBuckets} selectedWeekStart={heatmapWeek} onSelectWeek={setHeatmapWeek} />
      ) : null}

      {onlyBrandBidsFiltered ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800">
          <p className="font-medium">Only brand-bid ads match this library right now.</p>
          <button
            type="button"
            className="mt-2 text-sm font-semibold underline"
            onClick={() => setShowBrandBids(true)}
          >
            Show brand bids
          </button>
        </div>
      ) : null}

      {!onlyBrandBidsFiltered &&
        (sort === "recently_killed" && sortedAds.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-600">
            No retired ads in this view. Try enabling <strong>Retired</strong>, showing brand bids, or widening the
            range.
          </div>
        ) : rangeEmpty ? (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-600">
            No ads were active during this range.{" "}
            <button type="button" className="font-semibold text-slate-900 underline" onClick={() => setZoom("all")}>
              Expand to All time
            </button>
          </div>
        ) : sortedAds.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-600">
            No ads match these filters.{" "}
            <button
              type="button"
              className="font-semibold text-slate-900 underline"
              onClick={() => {
                setShowBrandBids(true);
                setShowActive(true);
                setShowRetired(true);
                setHeatmapWeek(null);
                setZoom("all");
              }}
            >
              Clear filters
            </button>
          </div>
        ) : viewWindow ? (
          <TimelineGantt
            ads={displayAds}
            viewStart={viewWindow.start}
            viewEnd={viewWindow.end}
            zoom={zoom}
            sort={sort}
            onOpenAd={onOpenAd}
            sentinelRef={sentinelRef}
          />
        ) : null)}

      {!onlyBrandBidsFiltered && sortedAds.length > displayAds.length ? (
        <p className="text-center text-xs text-slate-500">
          Showing {displayAds.length} of {sortedAds.length} — scroll to load more
        </p>
      ) : null}
    </div>
  );
}
