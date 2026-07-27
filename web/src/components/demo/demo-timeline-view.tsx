"use client";

import { useCallback, useMemo, useState } from "react";
import { HelpCircle } from "lucide-react";

import { TimelineActivityHeatmap } from "@/components/competitor/tests-timeline/timeline-activity-heatmap";
import { TimelineGantt } from "@/components/competitor/tests-timeline/timeline-gantt";
import {
  adMatchesWeekFilter,
  aggregateWeekActivity,
  DAY_MS,
  isBrandBidAngle,
  isVideoFormat,
  median,
  platformLabel,
  platformSortIndex,
  resolveDateWindow,
  searchMatchesAd,
  sortTimelineAds,
} from "@/components/competitor/tests-timeline/timeline-helpers";
import type { TimelineStatSnapshot } from "@/components/competitor/tests-timeline/timeline-stats-cards";
import { TimelineStatsCards } from "@/components/competitor/tests-timeline/timeline-stats-cards";
import { TimelineToolbar, type TimelineToolbarState } from "@/components/competitor/tests-timeline/timeline-toolbar";
import type { TimelineAd } from "@/components/competitor/tests-timeline/timeline-types";
import { FeatureSectionHeader } from "@/components/dashboard/feature-section-header";
import { DemoAdDetailDrawer } from "@/components/demo/demo-ad-detail-drawer";
import { useDemoAdDetail } from "@/components/demo/use-demo-ad-detail";
import { getDemoBrandPayload } from "@/lib/demo/demo-brand-payload";

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
  const longestAd = ads[maxIdx]!;
  const longestHeadline = `${platformLabel(longestAd.platform)} · ${longestDays}d run`;
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

export function DemoTimelineView({ domain }: { domain?: string }) {
  const payload = useMemo(() => getDemoBrandPayload(domain), [domain]);
  const rawAds = payload.timelineAds;
  const dateRangeEarliest = Date.parse(payload.timelineDateRange.earliest);
  const dateRangeLatest = Date.parse(payload.timelineDateRange.latest);
  const { detailAd, openAdById, closeAdDetail } = useDemoAdDetail(domain);

  const platformChips = useMemo(() => {
    const m = new Map<string, number>();
    for (const ad of rawAds) {
      m.set(ad.platform, (m.get(ad.platform) ?? 0) + 1);
    }
    return [...m.entries()]
      .map(([id, count]) => ({ id, label: platformLabel(id), count }))
      .sort((a, b) => platformSortIndex(a.id) - platformSortIndex(b.id));
  }, [rawAds]);

  const [toolbar, setToolbar] = useState<TimelineToolbarState>({
    search: "",
    datePreset: "90d",
    customRangeStart: null,
    customRangeEnd: null,
    sort: "newest",
    statusFilter: "all",
    formatFilter: "all",
    selectedPlatforms: new Set(platformChips.map((p) => p.id)),
    groupDuplicates: false,
    showBrandBids: true,
    ultimateOnly: false,
    impressionsOnly: false,
    viewFields: DEFAULT_VIEW_FIELDS,
  });

  const [heatmapWeek, setHeatmapWeek] = useState<number | null>(null);

  const patchToolbar = useCallback((patch: Partial<TimelineToolbarState>) => {
    setToolbar((prev) => ({ ...prev, ...patch }));
  }, []);

  const brandFiltered = useMemo(() => {
    if (toolbar.showBrandBids) return rawAds;
    return rawAds.filter((a) => !isBrandBidAngle(a.ai_extracted_angle));
  }, [rawAds, toolbar.showBrandBids]);

  const viewWindow = useMemo(
    () =>
      resolveDateWindow(
        toolbar.datePreset,
        toolbar.customRangeStart,
        toolbar.customRangeEnd,
        payload.timelineDateRange,
      ),
    [toolbar.datePreset, toolbar.customRangeStart, toolbar.customRangeEnd, payload.timelineDateRange],
  );

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

  const activeInView = sortedAds.filter((a) => !a.is_killed).length;
  const retiredInView = sortedAds.filter((a) => a.is_killed).length;

  const rangeEmpty = viewWindow && filteredAds.length === 0 && brandFiltered.length > 0;

  const clearFilters = () => {
    setToolbar({
      search: "",
      datePreset: "all",
      customRangeStart: null,
      customRangeEnd: null,
      sort: "newest",
      statusFilter: "all",
      formatFilter: "all",
      selectedPlatforms: new Set(platformChips.map((p) => p.id)),
      groupDuplicates: false,
      showBrandBids: true,
      ultimateOnly: false,
      impressionsOnly: false,
      viewFields: DEFAULT_VIEW_FIELDS,
    });
    setHeatmapWeek(null);
  };

  return (
    <div className="demo-timeline-view relative space-y-5">
      <FeatureSectionHeader
        className="mb-0"
        overline="Timeline"
        title={<>How {payload.name} has rolled out, run, and retired ads</>}
        titleTrailing={
          <button
            type="button"
            title="Day grid timeline. Bars reflect exact run dates. Scroll horizontally; view starts at the most recent dates."
            className="inline-flex rounded-full border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50"
          >
            <HelpCircle className="h-3.5 w-3.5" />
          </button>
        }
        description={
          <>
            {sortedAds.length} ads in view · {activeInView} active, {retiredInView} retired
            {heatmapWeek != null ? " · week filter on" : null}
          </>
        }
      />

      <TimelineStatsCards stats={stats} className="demo-timeline-stats" />

      {brandFiltered.length >= 5 && heatBuckets.length >= 2 ? (
        <TimelineActivityHeatmap buckets={heatBuckets} selectedWeekStart={heatmapWeek} onSelectWeek={setHeatmapWeek} />
      ) : null}

      <TimelineToolbar
        platforms={platformChips}
        state={toolbar}
        onChange={patchToolbar}
        dateRangeEarliest={dateRangeEarliest}
        dateRangeLatest={dateRangeLatest}
        hiddenBrandBidCount={0}
      />

      {rangeEmpty ? (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-600">
          No ads were active during this range.{" "}
          <button type="button" className="font-semibold text-slate-900 underline" onClick={() => patchToolbar({ datePreset: "all" })}>
            Expand to All time
          </button>
        </div>
      ) : null}

      {!rangeEmpty && sortedAds.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-600">
          No ads match these filters.{" "}
          <button type="button" className="font-semibold text-slate-900 underline" onClick={clearFilters}>
            Clear filters
          </button>
        </div>
      ) : null}

      {!rangeEmpty && sortedAds.length > 0 && viewWindow ? (
        <TimelineGantt
          ads={sortedAds}
          viewStart={viewWindow.start}
          viewEnd={viewWindow.end}
          groupDuplicates={toolbar.groupDuplicates}
          viewFields={toolbar.viewFields}
          onOpenAd={openAdById}
        />
      ) : null}
      <DemoAdDetailDrawer ad={detailAd} onClose={closeAdDetail} />
    </div>
  );
}
