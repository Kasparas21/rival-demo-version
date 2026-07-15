"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Info,
  Lightbulb,
  Pin,
  Play,
  Skull,
  Trophy,
} from "lucide-react";

import { ComparisonPlatformIcon } from "@/components/comparison/platform-icon";
import { DurationAdRow } from "@/components/competitor/tests-timeline/duration-lifespan-bar";
import {
  computeLifespanDays,
  DAY_MS,
  maxLifespanInCreativeTest,
} from "@/components/competitor/tests-timeline/timeline-helpers";
import { FeatureSectionHeader } from "@/components/dashboard/feature-section-header";
import { DemoAdDetailDrawer } from "@/components/demo/demo-ad-detail-drawer";
import { useDemoAdDetail } from "@/components/demo/use-demo-ad-detail";
import type { ComparisonPlatformIconId } from "@/lib/platforms/comparison-platform-order";
import {
  demoCreativeTestsSummary,
  type DemoCreativeTest,
  type DemoCreativeTestStatus,
} from "@/lib/demo/dashboard-demo-data";
import { getDemoBrandPayload } from "@/lib/demo/demo-brand-payload";

type FilterStatus = "all" | DemoCreativeTestStatus;

function platformDisplayLabel(platform: string): string {
  const p = platform.trim().toLowerCase();
  if (p === "meta") return "Meta";
  if (p === "google") return "Google";
  if (p === "youtube") return "YouTube";
  if (p === "tiktok") return "TikTok";
  if (p === "linkedin") return "LinkedIn";
  if (p === "pinterest") return "Pinterest";
  if (p === "snapchat") return "Snapchat";
  return platform;
}

function isAdRunning(ad: DemoCreativeTest["ads"][number]): boolean {
  const last = new Date(ad.last_seen_at).getTime();
  if (!Number.isFinite(last)) return false;
  return (Date.now() - last) / DAY_MS <= 2;
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

type StatusBadgeProps = {
  status: DemoCreativeTestStatus;
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

type TestRowProps = {
  test: DemoCreativeTest;
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

  const runningCount = test.ads.filter(isAdRunning).length;
  const maxDays = Math.max(test.max_lifespan_days, maxLifespanInCreativeTest(test.ads));
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

        <span
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600"
          title={`${platformDisplayLabel(test.platform)} creative test`}
        >
          <ComparisonPlatformIcon platform={test.platform as ComparisonPlatformIconId} className="h-3 w-3" />
          {platformDisplayLabel(test.platform)}
        </span>

        <span className="min-w-0 flex-1 text-[14px] font-medium text-slate-900">{launchDate}</span>

        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {test.test_status === "running" && runningCount > 0 ? (
            <span className="inline-flex items-center rounded-full border border-[#b7dfc0] bg-[#e6f4ea] px-2.5 py-0.5 text-[11px] font-semibold text-[#137333]">
              {runningCount}/{test.ad_count} Ads Running
            </span>
          ) : null}
          <StatusBadge status={test.test_status} isGoogleDataLimited={isGoogleDataLimited} />
        </div>

        <span className="ml-1 shrink-0 text-slate-400" aria-hidden>
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>

      {expanded ? (
        <div className="border-t border-slate-100 px-1 py-1">
          {test.ads.map((ad) => {
            const isWinner = ad.id === test.winner_ad_id;
            const lifespanDays = computeLifespanDays(ad.first_seen_at, ad.last_seen_at);
            const isActive = isAdRunning(ad);

            if (ad.platform === "google" && lifespanDays === 0) {
              return (
                <div key={ad.id} className="px-3 py-2">
                  <DurationAdRow
                    creativeUrl={ad.ad_creative_url}
                    archivedCreativeUrl={ad.archived_creative_url}
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
                archivedCreativeUrl={ad.archived_creative_url}
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

export function DemoCreativeTestsView({ domain }: { domain?: string }) {
  const payload = useMemo(() => getDemoBrandPayload(domain), [domain]);
  const summary = useMemo(() => demoCreativeTestsSummary(payload.creativeTests), [payload.creativeTests]);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    const firstId = payload.creativeTests[0]?.id;
    return firstId ? new Set([firstId]) : new Set();
  });
  const { detailAd, openAdById, closeAdDetail } = useDemoAdDetail(domain);

  const filteredTests = useMemo(() => {
    if (filter === "all") return payload.creativeTests;
    return payload.creativeTests.filter((t) => t.test_status === filter);
  }, [filter, payload.creativeTests]);

  const toggleExpanded = (testId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(testId)) next.delete(testId);
      else next.add(testId);
      return next;
    });
  };

  return (
    <div className="relative space-y-6">
      <FeatureSectionHeader
        className="mb-0"
        overline="Creative tests"
        title="Creative Tests"
        description={
          <>
            Ads {payload.name} launched together on the same day. Winners appear when one ad outlives the group median
            by 2× and ran ≥14 days, with all variants inactive.
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
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
              onOpenAd={openAdById}
            />
          ))}
        </div>
      )}
      <DemoAdDetailDrawer ad={detailAd} onClose={closeAdDetail} />
    </div>
  );
}
