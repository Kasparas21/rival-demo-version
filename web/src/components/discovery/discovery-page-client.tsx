"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Compass, Loader2, RefreshCw, Search } from "lucide-react";

import { AdDetailDrawer } from "@/components/ad-detail/ad-detail-drawer";
import { useActiveBrand } from "@/app/dashboard/brand-context";
import { FeatureSectionHeader } from "@/components/dashboard/feature-section-header";
import { DiscoveryAdCard } from "@/components/discovery/discovery-ad-card";
import { DiscoveryToolbar, discoveryTabClass } from "@/components/discovery/discovery-toolbar";
import {
  DEFAULT_DISCOVERY_TOOLBAR,
  toolbarForTab,
  type DiscoveryFeedTab,
  type DiscoveryToolbarState,
} from "@/components/discovery/discovery-types";
import type { DiscoveryAdDto, DiscoveryFeedResult } from "@/lib/discovery/types";
import { useAdDetailState } from "@/lib/ad-detail/use-ad-detail-state";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 24;

function buildFeedUrl(
  brandId: string,
  toolbar: DiscoveryToolbarState,
  offset: number,
  shuffleSeed: string,
  searchDebounced: string,
): string {
  const params = new URLSearchParams({
    brandId,
    offset: String(offset),
    limit: String(PAGE_SIZE),
    sort: toolbar.sort,
    shuffleSeed,
    format: toolbar.format,
    status: toolbar.status,
    datePreset: toolbar.datePreset,
    q: searchDebounced,
  });
  if (toolbar.ultimateOnly) params.set("ultimateOnly", "1");
  if (toolbar.competitorId) params.set("competitorId", toolbar.competitorId);
  for (const p of toolbar.selectedPlatforms) params.append("platform", p);
  return `/api/discovery/feed?${params.toString()}`;
}

export function DiscoveryPageClient() {
  const activeBrand = useActiveBrand();
  const { activeAdId, openAd, closeAd } = useAdDetailState();

  const [tab, setTab] = useState<DiscoveryFeedTab>("explore");
  const [toolbar, setToolbar] = useState<DiscoveryToolbarState>(DEFAULT_DISCOVERY_TOOLBAR);
  const [searchDebounced, setSearchDebounced] = useState("");
  const [ads, setAds] = useState<DiscoveryAdDto[]>([]);
  const [total, setTotal] = useState(0);
  const [competitors, setCompetitors] = useState<DiscoveryFeedResult["competitors"]>([]);
  const [platformCounts, setPlatformCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);

  const patchToolbar = useCallback((patch: Partial<DiscoveryToolbarState>) => {
    setToolbar((prev) => ({ ...prev, ...patch }));
  }, []);

  const [shuffleSeed, setShuffleSeed] = useState(
    () => `${activeBrand.id}:${Date.now().toString(36)}`,
  );

  const reshuffle = useCallback(() => {
    setShuffleSeed(`${activeBrand.id}:${Date.now().toString(36)}`);
    patchToolbar({ sort: "shuffle" });
    setTab("explore");
  }, [activeBrand.id, patchToolbar]);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const requestGen = useRef(0);

  useEffect(() => {
    const t = window.setTimeout(() => setSearchDebounced(toolbar.search.trim()), 250);
    return () => window.clearTimeout(t);
  }, [toolbar.search]);

  const selectTab = useCallback((next: DiscoveryFeedTab) => {
    setTab(next);
    setToolbar((prev) => ({ ...prev, ...toolbarForTab(next) }));
  }, []);

  const fetchPage = useCallback(
    async (nextOffset: number, append: boolean) => {
      if (!activeBrand.id || activeBrand.id === "default") return;
      const gen = ++requestGen.current;
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);

      try {
        const res = await fetch(
          buildFeedUrl(activeBrand.id, toolbar, nextOffset, shuffleSeed, searchDebounced),
          { credentials: "include" },
        );
        const json = (await res.json()) as DiscoveryFeedResult | { ok: false; error?: string };
        if (gen !== requestGen.current) return;
        if (!res.ok || !("ads" in json)) {
          throw new Error(("error" in json && json.error) || "Failed to load discovery feed");
        }
        setAds((prev) => (append ? [...prev, ...json.ads] : json.ads));
        setTotal(json.total);
        setHasMore(json.has_more);
        setOffset(nextOffset + json.ads.length);
        setCompetitors(json.competitors);
        setPlatformCounts(json.platform_counts);
      } catch (e) {
        if (gen !== requestGen.current) return;
        setError(e instanceof Error ? e.message : "Failed to load");
        if (!append) setAds([]);
      } finally {
        if (gen === requestGen.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [activeBrand.id, toolbar, shuffleSeed, searchDebounced],
  );

  useEffect(() => {
    setOffset(0);
    void fetchPage(0, false);
  }, [fetchPage, shuffleSeed]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore || loading || loadingMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void fetchPage(offset, true);
      },
      { rootMargin: "480px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [fetchPage, hasMore, loading, loadingMore, offset]);

  return (
    <div className="mx-auto w-full max-w-[1480px] px-4 py-6 sm:px-6 lg:px-8">
      <FeatureSectionHeader
        overline="Inspo"
        title="Discovery"
        description="A mixed feed of ads from every competitor you track. Shuffle for inspiration or rank by impressions, recency, and ultimate winners."
        actions={
          <button
            type="button"
            onClick={reshuffle}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            Reshuffle
          </button>
        }
      />

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {(
          [
            ["explore", "Explore"],
            ["trending", "Trending"],
            ["ultimate", "Ultimate winners"],
          ] as const
        ).map(([id, label]) => (
          <button key={id} type="button" className={discoveryTabClass(tab === id)} onClick={() => selectTab(id)}>
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        <DiscoveryToolbar
          state={toolbar}
          onChange={patchToolbar}
          competitors={competitors}
          platformCounts={platformCounts}
          total={total}
        />
      </div>

      {loading ? (
        <div className="mt-10 flex items-center justify-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading ads from your competitors…
        </div>
      ) : error ? (
        <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 px-4 py-6 text-center text-sm text-red-700">
          {error}
        </div>
      ) : ads.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center">
          <Compass className="mx-auto h-10 w-10 text-slate-300" aria-hidden />
          <p className="mt-3 text-base font-semibold text-slate-900">No ads match these filters</p>
          <p className="mt-1 text-sm text-slate-500">
            Track competitors and run a scrape to populate your discovery feed.
          </p>
          <Link
            href="/dashboard/spy"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[color:var(--rival-primary)] px-4 py-2.5 text-sm font-semibold text-white"
          >
            <Search className="h-4 w-4" aria-hidden />
            Find competitor
          </Link>
        </div>
      ) : (
        <div
          className={cn(
            "mt-5 columns-1 gap-4 sm:columns-2 xl:columns-3 2xl:columns-4",
            "[&>*]:mb-4 [&>*]:break-inside-avoid",
          )}
        >
          {ads.map((ad) => (
            <DiscoveryAdCard key={ad.id} ad={ad} onOpen={() => openAd(ad.id)} />
          ))}
        </div>
      )}

      {loadingMore ? (
        <div className="mt-6 flex justify-center text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        </div>
      ) : null}
      <div ref={sentinelRef} className="h-1" aria-hidden />

      <AdDetailDrawer adId={activeAdId} onClose={closeAd} />
    </div>
  );
}
