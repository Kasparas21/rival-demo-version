"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { Beaker, ChevronDown, ChevronUp, HelpCircle, Info, Lightbulb, Pin, Play, Skull, Trophy } from "lucide-react";

import { CacheRevalidatingDot } from "@/components/competitor/data-freshness-badge";
import { COMPETITOR_PAGE_SHELL } from "@/components/dashboard/competitor/competitor-page-layout";
import { FeatureSectionHeader } from "@/components/dashboard/feature-section-header";
import { CreativeTestsSkeleton } from "@/components/ui/feature-skeleton";
import { useScrapeKeyedCache } from "@/lib/cache/use-scrape-keyed-cache";

import { DurationAdRow } from "./duration-lifespan-bar";
import { computeLifespanDays, DAY_MS } from "./timeline-helpers";

type CreativeTestAd = {
  id: string;
  platform: string;
  ad_creative_url: string | null;
  ad_text: string;
  ai_extracted_angle: string | null;
  first_seen_at: string;
  last_seen_at: string;
  format: string;
};

type CreativeTest = {
  id: string;
  launch_date: string;
  platform: string;
  ad_ids: string[];
  winner_ad_id: string | null;
  test_status: "running" | "winner_identified" | "all_killed_fast" | "no_clear_winner";
  median_lifespan_days: number;
  max_lifespan_days: number;
  winner_lifespan_days: number | null;
  ad_count: number;
  ads: CreativeTestAd[];
};

type Summary = {
  total: number;
  winnerIdentified: number;
  running: number;
  allKilledFast: number;
  noClearWinner: number;
};

type FilterStatus = "all" | "winner_identified" | "running" | "all_killed_fast" | "no_clear_winner";

type CreativeTestsApiResponse = {
  ok?: boolean;
  error?: string;
  tests?: CreativeTest[];
  summary?: Summary | null;
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

export function CreativeTestsTab({
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
  const cacheKey = `${domainKey}:creative-tests:${competitorId}:${stamp}`;

  const { data, loading, isValidating, error: hookError, refetch } = useScrapeKeyedCache<CreativeTestsApiResponse>({
    cacheKey,
    enabled: Boolean(competitorId && domainKey && fetchEnabled),
    validateCached: (c) => {
      if (!c.ok) return false;
      const rows = c.tests ?? [];
      return !rows.some((t) => (t.ad_count ?? 0) >= 2 && (t.ads?.length ?? 0) === 0);
    },
    fetcher: async () => {
      const r = await fetch(`/api/creative-tests?competitorId=${encodeURIComponent(competitorId)}`, {
        credentials: "include",
      });
      const json = (await r.json()) as CreativeTestsApiResponse;
      if (!json.ok) {
        throw new Error(json.error ?? "Failed to load");
      }
      return json;
    },
  });

  const tests = useMemo(() => data?.tests ?? [], [data?.tests]);
  const summary = data?.summary ?? null;
  const loadErr = hookError?.message ?? null;

  const [filter, setFilter] = useState<FilterStatus>("all");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const filteredTests = useMemo(() => {
    if (filter === "all") return tests;
    return tests.filter((t) => t.test_status === filter);
  }, [tests, filter]);

  const toggleExpanded = (testId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(testId)) next.delete(testId);
      else next.add(testId);
      return next;
    });
  };

  if (!competitorId) {
    return (
      <div className={`${COMPETITOR_PAGE_SHELL} py-12 text-center text-[13px] text-slate-500`}>
        Save this competitor to your spy list to load Creative Tests (requires a stored competitor id).
      </div>
    );
  }

  if (loading && !data && !loadErr) {
    return <CreativeTestsSkeleton />;
  }

  if (loadErr) {
    return (
      <div className={COMPETITOR_PAGE_SHELL}>
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          Failed to load creative tests: {loadErr}
          <button type="button" className="mt-2 block text-[12px] font-semibold underline" onClick={() => void refetch()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (tests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
          <Beaker className="h-8 w-8 text-slate-400" />
        </div>
        <h3 className="mb-2 text-[16px] font-semibold text-slate-900">No creative tests yet</h3>
        <p className="max-w-md text-[13px] leading-relaxed text-slate-600">
          A &quot;creative test&quot; is when {competitorLabel} launches 2+ ads on the same day, per platform. We
          haven&apos;t detected any yet — either they&apos;re not testing actively, or we need more scrape history to
          identify groups.
        </p>
      </div>
    );
  }

  return (
    <div className={`relative ${COMPETITOR_PAGE_SHELL}`}>
      <CacheRevalidatingDot show={isValidating && !!data} />
      <FeatureSectionHeader
        className="mb-6"
        overline="Creative tests"
        title="Creative Tests"
        description={
          <>
            Ads {competitorLabel} launched together on the same day. Winners appear when one ad outlives the group median
            by 2× and ran ≥14 days, with all variants inactive.
          </>
        }
      />

      {summary ? (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <FilterPill
            label="All tests"
            count={summary.total}
            active={filter === "all"}
            onClick={() => setFilter("all")}
          />
          <FilterPill
            label="Winner identified"
            count={summary.winnerIdentified}
            active={filter === "winner_identified"}
            onClick={() => setFilter("winner_identified")}
            icon={<Trophy className="h-3 w-3" />}
          />
          <FilterPill
            label="Running"
            count={summary.running}
            active={filter === "running"}
            onClick={() => setFilter("running")}
            icon={<Play className="h-3 w-3" />}
          />
          <FilterPill
            label="All killed fast"
            count={summary.allKilledFast}
            active={filter === "all_killed_fast"}
            onClick={() => setFilter("all_killed_fast")}
            icon={<Skull className="h-3 w-3" />}
          />
          <FilterPill
            label="No clear winner"
            count={summary.noClearWinner}
            active={filter === "no_clear_winner"}
            onClick={() => setFilter("no_clear_winner")}
            icon={<HelpCircle className="h-3 w-3" />}
          />
        </div>
      ) : null}

      {filteredTests.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 px-6 py-12 text-center">
          <p className="text-[13px] text-slate-500">No tests match this filter.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filteredTests.map((test) => (
            <TestRow
              key={test.id}
              test={test}
              expanded={expandedIds.has(test.id)}
              onToggle={() => toggleExpanded(test.id)}
              onOpenAd={onOpenAd}
            />
          ))}
        </div>
      )}
    </div>
  );
}

type FilterPillProps = {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  icon?: ReactNode;
};

function FilterPill({ label, count, active, onClick, icon }: FilterPillProps) {
  const baseClasses =
    "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors";

  if (active) {
    return (
      <button type="button" onClick={onClick} className={`${baseClasses} border-slate-900 bg-slate-900 text-white`}>
        {icon}
        {label}
        <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-bold">{count}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${baseClasses} border-slate-200 bg-white text-slate-700 hover:border-slate-300`}
    >
      {icon}
      {label}
      {count > 0 ? (
        <span className="ml-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
          {count}
        </span>
      ) : null}
    </button>
  );
}

type TestRowProps = {
  test: CreativeTest;
  expanded: boolean;
  onToggle: () => void;
  onOpenAd: (adId: string) => void;
};

function isAdRunning(ad: CreativeTestAd): boolean {
  const last = new Date(ad.last_seen_at).getTime();
  if (!Number.isFinite(last)) return false;
  return (Date.now() - last) / DAY_MS <= 2;
}

function TestRow({ test, expanded, onToggle, onOpenAd }: TestRowProps) {
  const launchDate = new Date(`${test.launch_date}T12:00:00.000Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const isGoogleDataLimited =
    test.platform === "google" && test.median_lifespan_days === 0 && test.max_lifespan_days === 0;

  const runningCount = test.ads.filter(isAdRunning).length;
  const maxDays = Math.max(test.max_lifespan_days, 1);
  const headerDotActive = test.test_status === "running" || runningCount > 0;

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2.5 px-4 py-3 text-left transition-colors hover:bg-slate-50/60"
      >
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${headerDotActive ? "bg-[#34a853]" : "bg-slate-300"}`}
          aria-hidden
        />
        <Pin className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />

        <span className="min-w-0 flex-1 text-[14px] font-medium text-slate-900">{launchDate}</span>

        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {test.test_status === "running" && runningCount > 0 ? (
            <span className="inline-flex items-center rounded-full border border-[#b7dfc0] bg-[#e6f4ea] px-2.5 py-0.5 text-[11px] font-semibold text-[#137333]">
              {runningCount}/{test.ad_count} Ads Running
            </span>
          ) : null}
          <StatusBadge
            status={test.test_status}
            winnerDays={test.winner_lifespan_days}
            isGoogleDataLimited={isGoogleDataLimited}
          />
        </div>

        <span className="ml-1 shrink-0 text-slate-400" aria-hidden>
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>

      {expanded ? (
        <div className="border-t border-slate-100 px-1 py-1">
          {test.ads.length === 0 ? (
            <p className="mx-3 my-3 rounded-lg border border-dashed border-slate-200 bg-slate-50/50 px-3 py-4 text-center text-[12px] text-slate-500">
              Could not load ads for this test. Refresh competitor data or open Creative Tests again after the next
              scrape.
            </p>
          ) : null}
          {test.ads.map((ad) => {
            const isWinner = ad.id === test.winner_ad_id;
            const lifespanDays = computeLifespanDays(ad.first_seen_at, ad.last_seen_at);
            const isActive = isAdRunning(ad);

            if (ad.platform === "google" && lifespanDays === 0) {
              return (
                <div key={ad.id} className="px-3 py-2">
                  <DurationAdRow
                    creativeUrl={ad.ad_creative_url}
                    platform={ad.platform}
                    format={ad.format}
                    lifespanDays={0}
                    maxDays={maxDays}
                    isActive={false}
                    onOpen={() => onOpenAd(ad.id)}
                  />
                  <p className="ml-[52px] mt-0.5 text-[10px] italic text-slate-500">
                    Lifespan tracking unavailable for Google search ads
                  </p>
                </div>
              );
            }

            return (
              <DurationAdRow
                key={ad.id}
                creativeUrl={ad.ad_creative_url}
                platform={ad.platform}
                format={ad.format}
                lifespanDays={lifespanDays}
                maxDays={maxDays}
                isActive={isActive || isWinner}
                onOpen={() => onOpenAd(ad.id)}
                trailing={
                  isWinner ? (
                    <span className="inline-flex shrink-0 items-center gap-0.5 text-[10px] font-bold text-[#e37400]">
                      <Trophy className="h-3 w-3" aria-hidden />
                      Winner
                    </span>
                  ) : null
                }
              />
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

type StatusBadgeProps = {
  status: CreativeTest["test_status"];
  winnerDays: number | null;
  isGoogleDataLimited?: boolean;
};

function StatusBadge({ status, isGoogleDataLimited }: StatusBadgeProps) {
  if (isGoogleDataLimited) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-600">
        <Info className="h-3 w-3" aria-hidden />
        Grouped (no lifespan)
      </span>
    );
  }

  const config = {
    winner_identified: {
      label: "Winner Identified",
      classes: "border-[#fdd663] bg-[#fef7e0] text-[#b06000]",
      icon: <Lightbulb className="h-3 w-3" aria-hidden />,
    },
    running: {
      label: "Running",
      classes: "border-[#b7dfc0] bg-[#e6f4ea] text-[#137333]",
      icon: <Play className="h-3 w-3" aria-hidden />,
    },
    all_killed_fast: {
      label: "All killed fast",
      classes: "border-red-200 bg-red-50 text-red-700",
      icon: <Skull className="h-3 w-3" />,
    },
    no_clear_winner: {
      label: "No clear winner",
      classes: "border-slate-200 bg-slate-50 text-slate-600",
      icon: <HelpCircle className="h-3 w-3" />,
    },
  }[status];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold ${config.classes}`}
    >
      {config.icon}
      {config.label}
    </span>
  );
}
