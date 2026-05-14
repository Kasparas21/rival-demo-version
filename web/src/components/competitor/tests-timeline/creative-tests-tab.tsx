"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { Beaker, ChevronDown, ChevronRight, HelpCircle, Info, Play, Skull, Trophy } from "lucide-react";

import { ComparisonPlatformIcon } from "@/components/comparison/platform-icon";
import { CacheRevalidatingDot, DataFreshnessBadge } from "@/components/competitor/data-freshness-badge";
import { FeatureSectionHeader } from "@/components/dashboard/feature-section-header";
import { RivalLoadingBlock } from "@/components/ui/rival-loading";
import { useScrapeKeyedCache } from "@/lib/cache/use-scrape-keyed-cache";
import type { StrategyPlatform } from "@/lib/strategy-overview/payload-types";

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
};

export function CreativeTestsTab({
  competitorId,
  competitorLabel,
  onOpenAd,
  cacheDomainNorm,
  lastScrapedAt = null,
  onFreshnessRescrape,
}: Props) {
  const domainKey = cacheDomainNorm.trim().toLowerCase();
  const stamp = lastScrapedAt ?? "none";
  const cacheKey = `${domainKey}:creative-tests:${competitorId}:${stamp}`;

  const { data, loading, isValidating, error: hookError, refetch } = useScrapeKeyedCache<CreativeTestsApiResponse>({
    cacheKey,
    enabled: Boolean(competitorId && domainKey),
    validateCached: (c) => Boolean(c.ok),
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
      <div className="mx-auto max-w-5xl px-6 py-12 text-center text-[13px] text-slate-500">
        Save this competitor to your spy list to load Creative Tests (requires a stored competitor id).
      </div>
    );
  }

  if (loading && !data && !loadErr) {
    return (
      <RivalLoadingBlock
        title="Loading creative tests…"
        description="Clustering launches by day and platform to infer test groups and winners."
        padded
        className="mx-auto max-w-5xl py-16 sm:py-24"
      />
    );
  }

  if (loadErr) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-6">
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
    <div className="relative mx-auto max-w-5xl px-6 py-6">
      <CacheRevalidatingDot show={isValidating && !!data} />
      <FeatureSectionHeader
        className="mb-6"
        overline="Creative tests"
        title="Creative Tests"
        titleTrailing={<DataFreshnessBadge lastScrapedAt={lastScrapedAt} onRefresh={onFreshnessRescrape} />}
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

function TestRow({ test, expanded, onToggle, onOpenAd }: TestRowProps) {
  const launchDate = new Date(`${test.launch_date}T12:00:00.000Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const isGoogleDataLimited =
    test.platform === "google" && test.median_lifespan_days === 0 && test.max_lifespan_days === 0;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50/50"
      >
        <div className="text-slate-400">{expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</div>

        <ComparisonPlatformIcon platform={test.platform as StrategyPlatform} className="h-4 w-4" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[14px] font-semibold text-slate-900">{launchDate}</span>
            <span className="text-[11px] text-slate-500">·</span>
            <span className="text-[12px] text-slate-600">{test.ad_count} ads</span>
          </div>
        </div>

        <StatusBadge
          status={test.test_status}
          winnerDays={test.winner_lifespan_days}
          isGoogleDataLimited={isGoogleDataLimited}
        />
      </button>

      {expanded ? (
        <div className="border-t border-slate-100 bg-slate-50/30 px-4 py-3">
          <div className="flex flex-col gap-2">
            {test.ads.map((ad) => {
              const isWinner = ad.id === test.winner_ad_id;
              const start = new Date(ad.first_seen_at).getTime();
              const end = new Date(ad.last_seen_at).getTime();
              const lifespanDays = Math.max(0, Math.floor((end - start) / (24 * 60 * 60 * 1000)));
              const maxDays = test.max_lifespan_days || 1;
              const widthPct = Math.min(100, (lifespanDays / maxDays) * 100);

              return (
                <div
                  key={ad.id}
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenAd(ad.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      e.stopPropagation();
                      onOpenAd(ad.id);
                    }
                  }}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border p-2 transition-shadow hover:ring-2 hover:ring-slate-200 ${
                    isWinner ? "border-amber-200 bg-amber-50/50" : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-slate-100">
                    {ad.ad_creative_url ? (
                      <img
                        src={ad.ad_creative_url}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <ComparisonPlatformIcon platform={ad.platform as StrategyPlatform} className="h-5 w-5 opacity-40" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      {ad.ai_extracted_angle ? (
                        <span className="truncate text-[10px] font-medium text-slate-600">{ad.ai_extracted_angle}</span>
                      ) : null}
                      {isWinner ? (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-700">
                          <Trophy className="h-2.5 w-2.5" />
                          WINNER
                        </span>
                      ) : null}
                    </div>
                    {ad.platform === "google" && lifespanDays === 0 ? (
                      <div className="relative flex h-5 items-center overflow-hidden rounded-full border border-dashed border-slate-200 bg-slate-50 px-3">
                        <span className="text-[10px] italic text-slate-500">
                          Lifespan tracking unavailable for Google search ads
                        </span>
                      </div>
                    ) : (
                      <div className="relative h-5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`absolute inset-y-0 left-0 rounded-full ${isWinner ? "bg-amber-500" : "bg-slate-400"}`}
                          style={{ width: `${widthPct}%` }}
                        />
                        <div className="absolute inset-0 flex items-center justify-end pr-2">
                          <span className="text-[10px] font-bold text-slate-900">{lifespanDays}d</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
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

function StatusBadge({ status, winnerDays, isGoogleDataLimited }: StatusBadgeProps) {
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
      label: winnerDays != null ? `Winner (${winnerDays}d)` : "Winner identified",
      classes: "border-amber-200 bg-amber-50 text-amber-700",
      icon: <Trophy className="h-3 w-3" />,
    },
    running: {
      label: "Running",
      classes: "border-green-200 bg-green-50 text-green-700",
      icon: <Play className="h-3 w-3" />,
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
