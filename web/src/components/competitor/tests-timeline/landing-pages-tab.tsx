"use client";

import { ArrowUpDown, Calendar, ExternalLink, Info, Monitor, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { ComparisonPlatformIcon } from "@/components/comparison/platform-icon";
import type { StrategyPlatform } from "@/lib/strategy-overview/payload-types";

type AdReference = {
  id: string;
  platform: string;
  ad_creative_url: string | null;
  ad_text: string;
  ai_extracted_angle: string | null;
  first_seen_at: string;
  last_seen_at: string;
  is_active: boolean;
};

type LandingPage = {
  groupId: string;
  url: string;
  displayUrl: string;
  totalAds: number;
  activeAds: number;
  killedAds: number;
  firstSeenAt: string;
  lastSeenAt: string;
  platformBreakdown: Record<string, number>;
  topAds: AdReference[];
};

type LandingPagesResponse = {
  ok: boolean;
  competitor?: { id: string; name: string };
  landingPages?: LandingPage[];
  summary?: {
    totalUniqueUrls: number;
    totalAdsWithLp: number;
    adsWithoutLp: number;
    platformCounts: Record<string, number>;
  };
  error?: string;
};

type SortMode = "ads" | "recent" | "longest";

type Props = {
  competitorId: string;
  competitorLabel: string;
  onOpenAd: (adId: string) => void;
};

export function LandingPagesTab({ competitorId, competitorLabel, onOpenAd }: Props) {
  const [data, setData] = useState<LandingPagesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("ads");
  const [selectedPlatform, setSelectedPlatform] = useState<string | "all">("all");

  useEffect(() => {
    if (!competitorId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/landing-pages?competitorId=${encodeURIComponent(competitorId)}`)
      .then((r) => r.json())
      .then((res: LandingPagesResponse) => {
        if (cancelled) return;
        if (!res.ok) {
          setError(res.error ?? "Failed to load");
        } else {
          setData(res);
        }
        setLoading(false);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Network error");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [competitorId]);

  const filteredAndSorted = useMemo(() => {
    if (!data?.landingPages) return [];

    let filtered = data.landingPages;

    if (selectedPlatform !== "all") {
      filtered = filtered.filter((lp) => (lp.platformBreakdown[selectedPlatform] ?? 0) > 0);
    }

    const tenure = (lp: LandingPage) =>
      new Date(lp.lastSeenAt).getTime() - new Date(lp.firstSeenAt).getTime();

    const sorted = [...filtered].sort((a, b) => {
      switch (sortMode) {
        case "ads":
          return b.totalAds - a.totalAds;
        case "recent":
          return new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime();
        case "longest":
          return tenure(b) - tenure(a);
        default:
          return 0;
      }
    });

    return sorted;
  }, [data, sortMode, selectedPlatform]);

  if (!competitorId) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
        <Monitor className="mb-3 h-8 w-8 text-slate-400" />
        <p className="text-[13px] text-slate-600">Save this competitor first to view landing pages.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-[13px] text-slate-500">Loading landing pages…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-6">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          Failed to load: {error}
        </div>
      </div>
    );
  }

  if (!data?.landingPages || data.landingPages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
          <Monitor className="h-8 w-8 text-slate-400" />
        </div>
        <h3 className="mb-2 text-[16px] font-semibold text-slate-900">No landing pages tracked yet</h3>
        <p className="max-w-md text-[13px] leading-relaxed text-slate-600">
          We extract landing page URLs from Meta ads. {competitorLabel} hasn&apos;t shown ads with trackable
          destination URLs yet, or only runs on platforms where we can&apos;t extract them (Google Search, TikTok
          Library).
        </p>
      </div>
    );
  }

  const platforms = Object.keys(data.summary?.platformCounts ?? {}).sort();
  const totalCards = data.summary?.totalUniqueUrls ?? data.landingPages.length;

  return (
    <div className="mx-auto max-w-5xl px-6 py-6">
      <div className="mb-4">
        <h2 className="text-[20px] font-bold tracking-tight text-slate-900">Landing Pages</h2>
        <p className="mt-1 text-[13px] text-slate-600">
          URLs {competitorLabel} drives ads to.{" "}
          <span className="font-semibold text-slate-800">{data.summary?.totalUniqueUrls}</span> unique pages from{" "}
          <span className="font-semibold text-slate-800">{data.summary?.totalAdsWithLp}</span> ads.
        </p>
      </div>

      {(data.summary?.adsWithoutLp ?? 0) > 0 ? (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
          <p className="text-[11px] leading-relaxed text-slate-700">
            {data.summary?.adsWithoutLp} ads aren&apos;t listed as full URLs — Google Search cards group by hostname
            only, and TikTok links point at the TikTok library. Meta, LinkedIn, Pinterest, and similar are included
            when a real destination URL is present.
          </p>
        </div>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedPlatform("all")}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
              selectedPlatform === "all"
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            }`}
          >
            All
            <span
              className={`rounded-full px-1.5 py-0 text-[9px] font-bold ${
                selectedPlatform === "all" ? "bg-white/20" : "bg-slate-100 text-slate-600"
              }`}
            >
              {totalCards}
            </span>
          </button>
          {platforms.map((platform) => {
            const count = data.summary?.platformCounts?.[platform] ?? 0;
            const isSelected = selectedPlatform === platform;
            return (
              <button
                type="button"
                key={platform}
                onClick={() => setSelectedPlatform(platform)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium capitalize transition-colors ${
                  isSelected
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
              >
                <ComparisonPlatformIcon platform={platform as StrategyPlatform} className="h-3 w-3" />
                {platform}
                <span
                  className={`rounded-full px-1.5 py-0 text-[9px] font-bold ${
                    isSelected ? "bg-white/20" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
          {(
            [
              { id: "ads" as const, label: "Most ads", icon: TrendingUp },
              { id: "recent" as const, label: "Most recent", icon: Calendar },
              { id: "longest" as const, label: "Longest active", icon: ArrowUpDown },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              type="button"
              key={id}
              onClick={() => setSortMode(id)}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                sortMode === id ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Icon className="h-3 w-3" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {filteredAndSorted.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 px-6 py-12 text-center">
          <p className="text-[13px] text-slate-500">No landing pages match this filter.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredAndSorted.map((lp) => (
            <LandingPageCard key={lp.groupId} lp={lp} onOpenAd={onOpenAd} />
          ))}
        </div>
      )}
    </div>
  );
}

function LandingPageCard({ lp, onOpenAd }: { lp: LandingPage; onOpenAd: (adId: string) => void }) {
  const lastSeenDate = new Date(lp.lastSeenAt);
  const daysSinceActive = Math.floor((Date.now() - lastSeenDate.getTime()) / (24 * 60 * 60 * 1000));

  const recencyLabel =
    daysSinceActive === 0
      ? "Active today"
      : daysSinceActive < 7
        ? `Active ${daysSinceActive}d ago`
        : daysSinceActive < 30
          ? `Last seen ${Math.floor(daysSinceActive / 7)}w ago`
          : `Last seen ${Math.floor(daysSinceActive / 30)}mo ago`;

  const isStale = daysSinceActive > 14;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="truncate font-mono text-[13px] font-semibold text-slate-900">{lp.displayUrl}</span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
            <span className="font-medium">
              <span className="font-bold text-slate-900">{lp.totalAds}</span> ads driving here
            </span>
            {lp.activeAds > 0 ? (
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                {lp.activeAds} active
              </span>
            ) : null}
            {lp.killedAds > 0 && lp.activeAds === 0 ? (
              <span className="inline-flex items-center gap-1 text-slate-500">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                {lp.killedAds} inactive
              </span>
            ) : null}
            <span className={isStale ? "text-slate-400" : ""}>{recencyLabel}</span>
          </div>
        </div>
        <a
          href={lp.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-[11px] font-medium text-white transition-colors hover:bg-slate-800"
        >
          <ExternalLink className="h-3 w-3" />
          Open page
        </a>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {Object.entries(lp.platformBreakdown)
          .sort((a, b) => b[1] - a[1])
          .map(([platform, count]) => (
            <span
              key={platform}
              className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium capitalize text-slate-700"
            >
              <ComparisonPlatformIcon platform={platform as StrategyPlatform} className="h-2.5 w-2.5" />
              <span>{platform}</span>
              <span className="font-bold">{count}</span>
            </span>
          ))}
      </div>

      {lp.topAds.length > 0 ? (
        <div className="flex items-center gap-2 border-t border-slate-100 pt-3">
          <span className="flex-shrink-0 text-[10px] font-medium uppercase tracking-wider text-slate-500">
            Top ads
          </span>
          <div className="flex flex-1 items-center gap-1.5 overflow-hidden">
            {lp.topAds.map((ad) => (
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
                className="group relative h-12 w-12 flex-shrink-0 cursor-pointer overflow-hidden rounded-md bg-slate-100 transition-shadow hover:ring-2 hover:ring-slate-300"
                title={ad.ai_extracted_angle ?? ad.ad_text?.slice(0, 80)}
              >
                {ad.ad_creative_url ? (
                  <img
                    src={ad.ad_creative_url}
                    alt=""
                    loading="lazy"
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
                {!ad.is_active ? <div className="absolute inset-0 bg-slate-900/40" /> : null}
              </div>
            ))}
            {lp.totalAds > lp.topAds.length ? (
              <span className="ml-1 text-[10px] text-slate-500">+{lp.totalAds - lp.topAds.length} more</span>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
