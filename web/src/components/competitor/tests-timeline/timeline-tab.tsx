"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarRange, HelpCircle } from "lucide-react";

import { CacheRevalidatingDot } from "@/components/competitor/data-freshness-badge";
import { COMPETITOR_PAGE_SHELL } from "@/components/dashboard/competitor/competitor-page-layout";
import { FeatureSectionHeader } from "@/components/dashboard/feature-section-header";
import { TimelineSkeleton } from "@/components/ui/feature-skeleton";
import { useScrapeKeyedCache } from "@/lib/cache/use-scrape-keyed-cache";

import { TimelineActivityHeatmap } from "./timeline-activity-heatmap";
import { TimelineGantt } from "./timeline-gantt";
import type { TimelineStatSnapshot } from "./timeline-stats-cards";
import { TimelineStatsCards } from "./timeline-stats-cards";
import {
  adMatchesWeekFilter,
  aggregateWeekActivity,
  DAY_MS,
  headlineForAd,
  isBrandBidAngle,
  isVideoFormat,
  median,
  platformLabel,
  platformSortIndex,
  resolveDateWindow,
  searchMatchesAd,
  sortTimelineAds,
} from "./timeline-helpers";
import { TimelineToolbar, type TimelineToolbarState } from "./timeline-toolbar";
import type { TimelineAd } from "./timeline-types";

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

const DEFAULT_VIEW_FIELDS: TimelineToolbarState["viewFields"] = {
  brandDetails: true,
  adCopy: false,
  headlineCta: true,
};

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

function effectiveBarEndForFilter(ad: TimelineAd, viewEnd: number): number {
  if (!ad.is_killed) return Math.min(viewEnd, Date.now());
  return new Date(ad.last_seen_at).getTime();
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
  const rawAds = data?.ads ?? [];

  const [toolbar, setToolbar] = useState<TimelineToolbarState>({
    search: "",
    datePreset: "90d",
    customRangeStart: null,
    customRangeEnd: null,
    sort: "newest",
    statusFilter: "all",
    formatFilter: "all",
    selectedPlatforms: new Set(),
    groupDuplicates: false,
    showBrandBids: false,
    viewFields: DEFAULT_VIEW_FIELDS,
  });

  const [heatmapWeek, setHeatmapWeek] = useState<number | null>(null);
  const [renderCount, setRenderCount] = useState(40);

  const patchToolbar = useCallback((patch: Partial<TimelineToolbarState>) => {
    setToolbar((prev) => ({ ...prev, ...patch }));
  }, []);

  useEffect(() => {
    if (!data?.platformCounts) return;
    const counts = data.platformCounts;
    const withData = Object.keys(counts)
      .filter((p) => (counts[p] ?? 0) > 0)
      .sort((a, b) => platformSortIndex(a) - platformSortIndex(b) || a.localeCompare(b));
    setToolbar((prev) => ({
      ...prev,
      selectedPlatforms: prev.selectedPlatforms.size ? prev.selectedPlatforms : new Set(withData),
    }));
  }, [data]);

  const brandBidCount = useMemo(() => rawAds.filter((a) => isBrandBidAngle(a.ai_extracted_angle)).length, [rawAds]);

  const brandFiltered = useMemo(() => {
    if (toolbar.showBrandBids) return rawAds;
    return rawAds.filter((a) => !isBrandBidAngle(a.ai_extracted_angle));
  }, [rawAds, toolbar.showBrandBids]);

  const platformChips = useMemo(() => {
    const m = new Map<string, number>();
    for (const ad of brandFiltered) {
      m.set(ad.platform, (m.get(ad.platform) ?? 0) + 1);
    }
    return [...m.entries()]
      .map(([id, count]) => ({ id, label: platformLabel(id), count }))
      .sort((a, b) => platformSortIndex(a.id) - platformSortIndex(b.id));
  }, [brandFiltered]);

  const viewWindow = useMemo(
    () =>
      resolveDateWindow(
        toolbar.datePreset,
        toolbar.customRangeStart,
        toolbar.customRangeEnd,
        data?.dateRange,
      ),
    [toolbar.datePreset, toolbar.customRangeStart, toolbar.customRangeEnd, data?.dateRange],
  );

  const dateRangeEarliest = data?.dateRange ? Date.parse(data.dateRange.earliest) : null;
  const dateRangeLatest = data?.dateRange ? Date.parse(data.dateRange.latest) : null;

  const stats = useMemo(() => buildStats(brandFiltered), [brandFiltered]);
  const heatBuckets = useMemo(() => aggregateWeekActivity(brandFiltered), [brandFiltered]);

  const filteredAds = useMemo(() => {
    return brandFiltered.filter((ad) => {
      if (!searchMatchesAd(ad, toolbar.search)) return false;

      if (toolbar.statusFilter === "active" && ad.is_killed) return false;
      if (toolbar.statusFilter === "retired" && !ad.is_killed) return false;

      if (toolbar.formatFilter === "video" && !isVideoFormat(ad.format)) return false;
      if (toolbar.formatFilter === "image" && isVideoFormat(ad.format)) return false;

      if (toolbar.selectedPlatforms.size > 0 && !toolbar.selectedPlatforms.has(ad.platform)) return false;

      if (viewWindow) {
        const adEnd = effectiveBarEndForFilter(ad, viewWindow.end);
        const adStart = new Date(ad.first_seen_at).getTime();
        if (adEnd < viewWindow.start || adStart > viewWindow.end) return false;
      }

      return true;
    });
  }, [brandFiltered, toolbar, viewWindow]);

  const afterHeatFiltered = useMemo(() => {
    if (heatmapWeek == null) return filteredAds;
    return filteredAds.filter((ad) => adMatchesWeekFilter(ad, heatmapWeek));
  }, [filteredAds, heatmapWeek]);

  const sortedAds = useMemo(() => sortTimelineAds(afterHeatFiltered, toolbar.sort), [afterHeatFiltered, toolbar.sort]);
  const displayAds = useMemo(() => sortedAds.slice(0, renderCount), [sortedAds, renderCount]);

  useEffect(() => {
    setRenderCount(40);
  }, [toolbar, heatmapWeek, competitorId]);

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || displayAds.length >= sortedAds.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setRenderCount((n) => Math.min(n + 40, sortedAds.length));
        }
      },
      { root: null, rootMargin: "240px", threshold: 0 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [displayAds.length, sortedAds.length]);

  const activeInView = sortedAds.filter((a) => !a.is_killed).length;
  const retiredInView = sortedAds.filter((a) => a.is_killed).length;

  const clearFilters = () => {
    const allPlatforms = platformChips.map((p) => p.id);
    setToolbar({
      search: "",
      datePreset: "all",
      customRangeStart: null,
      customRangeEnd: null,
      sort: "newest",
      statusFilter: "all",
      formatFilter: "all",
      selectedPlatforms: new Set(allPlatforms),
      groupDuplicates: false,
      showBrandBids: true,
      viewFields: DEFAULT_VIEW_FIELDS,
    });
    setHeatmapWeek(null);
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
    return <TimelineSkeleton />;
  }

  if (loadErr) {
    return (
      <div className={COMPETITOR_PAGE_SHELL}>
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
    !toolbar.showBrandBids && brandFiltered.length === 0 && brandBidCount > 0 && rawAds.length > 0;

  const rangeEmpty = viewWindow && filteredAds.length === 0 && brandFiltered.length > 0;

  return (
    <div className={`relative ${COMPETITOR_PAGE_SHELL} space-y-6`}>
      <CacheRevalidatingDot show={isValidating && !!data} />

      <FeatureSectionHeader
        variant="card"
        className="mb-0"
        overline="Timeline"
        title={<>How {competitorLabel} has rolled out, run, and retired ads</>}
        description={
          <>
            {sortedAds.length} ads in view · {activeInView} active, {retiredInView} retired
            {heatmapWeek != null ? " · week filter on" : null}
          </>
        }
        actions={
          <>
            <button
              type="button"
              title="Day grid timeline. Bars reflect exact run dates. Scroll horizontally; view starts at the most recent dates."
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

      <TimelineToolbar
        platforms={platformChips}
        state={toolbar}
        onChange={patchToolbar}
        dateRangeEarliest={dateRangeEarliest}
        dateRangeLatest={dateRangeLatest}
        hiddenBrandBidCount={!toolbar.showBrandBids ? brandBidCount : 0}
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
            onClick={() => patchToolbar({ showBrandBids: true })}
          >
            Show brand bids
          </button>
        </div>
      ) : null}

      {!onlyBrandBidsFiltered && rangeEmpty ? (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-600">
          No ads were active during this range.{" "}
          <button type="button" className="font-semibold text-slate-900 underline" onClick={() => patchToolbar({ datePreset: "all" })}>
            Expand to All time
          </button>
        </div>
      ) : null}

      {!onlyBrandBidsFiltered && !rangeEmpty && sortedAds.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-600">
          No ads match these filters.{" "}
          <button type="button" className="font-semibold text-slate-900 underline" onClick={clearFilters}>
            Clear filters
          </button>
        </div>
      ) : null}

      {!onlyBrandBidsFiltered && !rangeEmpty && sortedAds.length > 0 && viewWindow ? (
        <TimelineGantt
          ads={displayAds}
          viewStart={viewWindow.start}
          viewEnd={viewWindow.end}
          groupDuplicates={toolbar.groupDuplicates}
          viewFields={toolbar.viewFields}
          onOpenAd={onOpenAd}
          sentinelRef={sentinelRef}
        />
      ) : null}

      {!onlyBrandBidsFiltered && sortedAds.length > displayAds.length ? (
        <p className="text-center text-xs text-slate-500">
          Showing {displayAds.length} of {sortedAds.length} — scroll down to load more
        </p>
      ) : null}
    </div>
  );
}
