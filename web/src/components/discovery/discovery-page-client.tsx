"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Compass, Loader2, RefreshCw, Search } from "lucide-react";

import { AdDetailDrawer } from "@/components/ad-detail/ad-detail-drawer";
import { useActiveBrand } from "@/app/dashboard/brand-context";
import { FeatureSectionHeader } from "@/components/dashboard/feature-section-header";
import { DiscoveryMarketStatsBar } from "@/components/discovery/discovery-market-stats";
import { DiscoveryPatternsView } from "@/components/discovery/discovery-patterns-view";
import { DiscoveryMasonryFeed } from "@/components/discovery/discovery-masonry-feed";
import { DiscoveryToolbar, discoveryTabClass } from "@/components/discovery/discovery-toolbar";
import { useDiscoveryFeed } from "@/components/discovery/use-discovery-feed";
import { useDiscoverySavedAds } from "@/components/discovery/use-discovery-saved-ads";
import { useAdDetailState } from "@/lib/ad-detail/use-ad-detail-state";

export function DiscoveryPageClient() {
  const activeBrand = useActiveBrand();
  const { activeAdId, openAd, closeAd } = useAdDetailState();
  const [clientBrands, setClientBrands] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    void fetch("/api/account/brands", { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((d: { ok?: boolean; brands?: { id: string; name: string }[] }) => {
        if (!d.ok || !d.brands?.length) return;
        setClientBrands(d.brands.map((b) => ({ id: b.id, name: b.name })));
      });
  }, []);

  const {
    tab,
    selectTab,
    toolbar,
    patchToolbar,
    ads,
    total,
    competitors,
    marketStats,
    loading,
    loadingMore,
    error,
    hasMore,
    reshuffle,
    loadMore,
    feedKey,
  } = useDiscoveryFeed(
    activeBrand.id,
    clientBrands.map((brand) => brand.id),
  );

  const { isSaved, isPending, toggleSave } = useDiscoverySavedAds(ads, feedKey);

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore || loading || loadingMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { rootMargin: "480px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadMore, loading, loadingMore]);

  return (
    <div className="mx-auto w-full max-w-[1480px] px-4 py-6 sm:px-6 lg:px-8">
      <FeatureSectionHeader
        overline="Inspo"
        title="Discovery"
        description="Meta ads from every competitor you track. Shuffle for inspiration or rank by impressions, recency, and ultimate winners."
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
            ["patterns", "Patterns"],
          ] as const
        ).map(([id, label]) => (
          <button key={id} type="button" className={discoveryTabClass(tab === id)} onClick={() => selectTab(id)}>
            {label}
          </button>
        ))}
      </div>

      {tab === "patterns" ? (
        <DiscoveryPatternsView
          brandId={activeBrand.id}
          brandName={activeBrand.name}
          onOpenAd={openAd}
        />
      ) : (
        <>
          <div className="mt-4">
            <DiscoveryToolbar
              state={toolbar}
              onChange={patchToolbar}
              competitors={competitors}
              total={total}
              activeBrand={{ id: activeBrand.id, name: activeBrand.name }}
              clientBrands={clientBrands}
            />
          </div>

          {!loading && !error && marketStats && marketStats.total_ads > 0 ? (
            <DiscoveryMarketStatsBar stats={marketStats} />
          ) : null}

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
            <DiscoveryMasonryFeed
              ads={ads}
              isSaved={isSaved}
              isPending={isPending}
              onOpenAd={openAd}
              onToggleSave={(ad) => void toggleSave(ad)}
            />
          )}

          {loadingMore ? (
            <div className="mt-6 flex justify-center text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            </div>
          ) : null}
          <div ref={sentinelRef} className="h-1" aria-hidden />
        </>
      )}

      <AdDetailDrawer adId={activeAdId} onClose={closeAd} />
    </div>
  );
}
