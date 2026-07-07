"use client";

import { RefreshCw } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { CacheRevalidatingDot } from "@/components/competitor/data-freshness-badge";
import { COMPETITOR_PAGE_SHELL, COMPETITOR_PAGE_X } from "@/components/dashboard/competitor/competitor-page-layout";
import { FeatureSectionHeader } from "@/components/dashboard/feature-section-header";
import { useScrapeKeyedCache } from "@/lib/cache/use-scrape-keyed-cache";
import { cn } from "@/lib/utils";

import {
  CHANGE_FILTER_OPTIONS,
  getChangeKind,
  type ChangeFilterKind,
} from "./change-display";
import { ChangeCard } from "./ChangeCard";
import { LatestChangesSkeleton } from "./website-tracker-skeletons";
import { parseChangeAnalysis, type LandingPageChangeRow } from "./types";

type ChangeRow = LandingPageChangeRow & {
  prev_screenshot_url?: string | null;
  prev_hero_screenshot_url?: string | null;
  prev_page_text?: unknown;
  prev_taken_at?: string | null;
};

type ChangesResponse = {
  ok: boolean;
  changes?: ChangeRow[];
  error?: string;
};

type Props = {
  competitorId: string;
  competitorLabel: string;
  cacheDomainNorm: string;
  lastScrapedAt?: string | null;
  fetchEnabled?: boolean;
};

export function LatestChangesPanel({
  competitorId,
  competitorLabel,
  cacheDomainNorm,
  lastScrapedAt,
  fetchEnabled = true,
}: Props) {
  const [filter, setFilter] = useState<ChangeFilterKind>("all");
  const stamp = lastScrapedAt ?? "none";
  const changesCacheKey = `${cacheDomainNorm}:tracked-changes:${competitorId}:${stamp}`;

  const fetchChanges = useCallback(async (): Promise<ChangesResponse> => {
    const res = await fetch(
      `/api/competitor/${encodeURIComponent(competitorId)}/landing-pages/changes?limit=20`,
    );
    const json = (await res.json()) as ChangesResponse;
    if (!res.ok || !json.ok) {
      throw new Error(json.error ?? `Failed (${res.status})`);
    }
    return json;
  }, [competitorId]);

  const changesCache = useScrapeKeyedCache<ChangesResponse>({
    cacheKey: changesCacheKey,
    fetcher: fetchChanges,
    enabled: fetchEnabled && Boolean(competitorId),
  });

  const changes = changesCache.data?.changes ?? [];

  const filterCounts = useMemo(() => {
    const counts: Record<ChangeFilterKind, number> = {
      all: changes.length,
      permanent: 0,
      ab_test: 0,
      unknown: 0,
    };
    for (const change of changes) {
      const kind = getChangeKind(parseChangeAnalysis(change.change_analysis));
      counts[kind] += 1;
    }
    return counts;
  }, [changes]);

  const visibleFilters = useMemo(
    () =>
      CHANGE_FILTER_OPTIONS.filter(
        (opt) => opt.id === "all" || filterCounts[opt.id] > 0 || filter === opt.id,
      ),
    [filter, filterCounts],
  );

  const filteredChanges = useMemo(() => {
    if (filter === "all") return changes;
    return changes.filter(
      (change) => getChangeKind(parseChangeAnalysis(change.change_analysis)) === filter,
    );
  }, [changes, filter]);

  return (
    <div className={`${COMPETITOR_PAGE_SHELL} ${COMPETITOR_PAGE_X}`}>
      <FeatureSectionHeader
        overline="Website tracking"
        title="Latest changes"
        description={`Meaningful visual changes detected on ${competitorLabel}'s tracked pages.`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <CacheRevalidatingDot show={changesCache.isValidating} />
            <button
              type="button"
              onClick={() => void changesCache.refetch()}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
          </div>
        }
      />

      {changesCache.loading && !changesCache.data ? <LatestChangesSkeleton cards={2} /> : null}

      {changes.length > 0 && !(changesCache.loading && !changesCache.data) ? (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {visibleFilters.map((opt) => {
            const active = filter === opt.id;
            const count = filterCounts[opt.id];
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setFilter(opt.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors",
                  active
                    ? opt.activeClass
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
                )}
              >
                {opt.label}
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                    active ? "bg-white/20 text-inherit" : "bg-slate-100 text-slate-500",
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      {changesCache.error ? (
        <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
          {changesCache.error.message}
        </p>
      ) : null}

      {!(changesCache.loading && !changesCache.data) && !changesCache.loading && changes.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
          No meaningful changes yet. When tracked pages update, before/after comparisons will appear here.
        </p>
      ) : null}

      {!(changesCache.loading && !changesCache.data) && !changesCache.loading && filteredChanges.length === 0 && changes.length > 0 ? (
        <p className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-8 text-center text-sm text-slate-500">
          No changes match this filter. Try another type or refresh after the next capture.
        </p>
      ) : null}

      {!(changesCache.loading && !changesCache.data) && filteredChanges.length > 0 ? (
        <div className="space-y-3">
          {filteredChanges.map((change) => (
            <ChangeCard
              key={change.id}
              change={change}
              prevScreenshotUrl={change.prev_screenshot_url}
              prevHeroScreenshotUrl={change.prev_hero_screenshot_url}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
