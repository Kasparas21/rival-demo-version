"use client";

import { useMemo, type ReactNode } from "react";
import {
  Activity,
  Clock,
  Link2,
  Minus,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Video,
} from "lucide-react";

import type { AdsLibraryPlatform } from "@/lib/ad-library/ads-library-platform";
import { computePlatformAdsLibraryStats } from "@/lib/ad-library/compute-platform-ads-library-stats";
import { cn } from "@/lib/utils";

type Props = {
  platform: AdsLibraryPlatform;
  ads: unknown[];
  scrapeAtMs?: number | null;
  className?: string;
};

function formatDelta(delta: number): string {
  if (delta > 0) return `+${delta}`;
  return String(delta);
}

function WowBadge({ delta, pct }: { delta: number; pct: number | null }) {
  if (delta === 0 && (pct === null || pct === 0)) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-slate-500">
        <Minus className="h-3 w-3" aria-hidden />
        Flat vs prior week
      </span>
    );
  }

  const up = delta > 0;
  const Icon = up ? TrendingUp : TrendingDown;
  const tone = up ? "text-emerald-700" : "text-rose-700";

  return (
    <span className={cn("inline-flex items-center gap-0.5 text-[11px] font-semibold", tone)}>
      <Icon className="h-3 w-3" aria-hidden />
      {formatDelta(delta)} vs prior week
      {pct != null ? ` (${up ? "+" : ""}${pct}%)` : null}
    </span>
  );
}

function StatCell({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="min-w-[140px] flex-1 rounded-xl border border-slate-200/80 bg-white px-3.5 py-3 shadow-sm">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-1.5 text-xl font-semibold tabular-nums tracking-tight text-slate-900">{value}</p>
      {hint ? <div className="mt-1 min-h-[1rem]">{hint}</div> : null}
    </div>
  );
}

export function PlatformAdsLibraryStatsBar({ platform, ads, scrapeAtMs, className }: Props) {
  const stats = useMemo(
    () => computePlatformAdsLibraryStats(platform, ads, scrapeAtMs),
    [platform, ads, scrapeAtMs],
  );

  if (stats.total_ads === 0) return null;

  const launchHint = (
    <WowBadge delta={stats.new_week_over_week_delta} pct={stats.new_week_over_week_pct} />
  );

  const netHint =
    stats.net_change_this_week !== 0 ? (
      <span className="text-[11px] text-slate-500">
        Net {formatDelta(stats.net_change_this_week)} after {stats.retired_this_week} retired
      </span>
    ) : (
      <span className="text-[11px] text-slate-500">
        {stats.retired_this_week > 0
          ? `${stats.retired_this_week} retired this week`
          : "No retirements this week"}
      </span>
    );

  const runtimeHint =
    stats.median_days_running > 0
      ? `Avg ${stats.avg_days_running}d · longest ${stats.longest_running_days}d`
      : "Runtime data pending";

  const isMeta = platform === "meta";
  const isGoogle = platform === "google";

  return (
    <section
      className={cn(
        "rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50/90 to-white p-3 shadow-[0_4px_24px_rgba(15,23,42,0.04)]",
        className,
      )}
      aria-label="Platform stats"
    >
      <div className="mb-2.5 flex items-center justify-between gap-2 px-0.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Platform pulse</p>
        <p className="text-[11px] text-slate-400">Rolling 7-day windows vs prior week</p>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <StatCell
          label="Total ads"
          value={stats.total_ads.toLocaleString()}
          hint={
            <span className="text-[11px] text-slate-500">
              {stats.active_ads.toLocaleString()} active ({stats.active_percent}%)
            </span>
          }
          icon={<Activity className="h-3 w-3" aria-hidden />}
        />
        <StatCell
          label="New this week"
          value={stats.new_this_week.toLocaleString()}
          hint={launchHint}
          icon={<TrendingUp className="h-3 w-3" aria-hidden />}
        />
        <StatCell
          label="Net change"
          value={formatDelta(stats.net_change_this_week)}
          hint={netHint}
          icon={<Activity className="h-3 w-3" aria-hidden />}
        />
        <StatCell
          label="Video share"
          value={`${stats.video_percent}%`}
          hint={
            <span className="text-[11px] text-slate-500">
              {stats.image_percent}% image
              {isGoogle && stats.youtube_count > 0
                ? ` · ${stats.youtube_count} YouTube`
                : null}
              {isGoogle && stats.text_ad_count > 0
                ? ` · ${stats.text_ad_count} text`
                : null}
            </span>
          }
          icon={<Video className="h-3 w-3" aria-hidden />}
        />
        {isMeta ? (
          <StatCell
            label="Ultimate winners"
            value={stats.ultimate_winners.toLocaleString()}
            hint={
              stats.avg_impressions_index != null ? (
                <span className="text-[11px] text-slate-500">
                  Avg band {stats.avg_impressions_index} · {stats.impressions_coverage_percent}% disclosed
                </span>
              ) : (
                <span className="text-[11px] text-slate-500">Long-run proven creatives</span>
              )
            }
            icon={<Sparkles className="h-3 w-3 text-amber-600" aria-hidden />}
          />
        ) : null}
        <StatCell
          label="Median runtime"
          value={`${stats.median_days_running}d`}
          hint={<span className="text-[11px] text-slate-500">{runtimeHint}</span>}
          icon={<Clock className="h-3 w-3" aria-hidden />}
        />
        <StatCell
          label="Landing pages"
          value={stats.unique_landing_pages.toLocaleString()}
          hint={
            <span className="text-[11px] text-slate-500">Distinct destination URLs in ads</span>
          }
          icon={<Link2 className="h-3 w-3" aria-hidden />}
        />
        {isMeta && stats.retired_ads > 0 ? (
          <StatCell
            label="Inactive"
            value={stats.retired_ads.toLocaleString()}
            hint={
              <span className="text-[11px] text-slate-500">
                {stats.retired_this_week > 0
                  ? `${stats.retired_this_week} ended this week`
                  : "Ended ads in library"}
              </span>
            }
            icon={<TrendingDown className="h-3 w-3" aria-hidden />}
          />
        ) : null}
      </div>
    </section>
  );
}
