"use client";

import { useEffect, useRef } from "react";
import { Globe, Loader2 } from "lucide-react";
import Link from "next/link";

import { DiscoveryLandingPagesToolbar } from "@/components/discovery/discovery-landing-pages-toolbar";
import { DiscoveryToolbar } from "@/components/discovery/discovery-toolbar";
import type { DiscoveryToolbarState } from "@/components/discovery/discovery-types";
import { useDiscoveryLandingPages } from "@/components/discovery/use-discovery-landing-pages";
import { ChangeCard } from "@/components/website-tracker/ChangeCard";
import type { LandingPageChangeRow } from "@/components/website-tracker/types";
import type { Json } from "@/lib/supabase/types";

type Props = {
  brandId: string;
  toolbar: DiscoveryToolbarState;
  onToolbarChange: (patch: Partial<DiscoveryToolbarState>) => void;
  clientBrands: { id: string; name: string }[];
  activeBrand: { id: string; name: string };
};

function toChangeRow(
  change: import("@/lib/discovery/types").DiscoveryLandingPageChangeDto,
): LandingPageChangeRow & {
  prev_screenshot_url?: string | null;
  prev_hero_screenshot_url?: string | null;
  prev_page_text?: Json | null;
  prev_taken_at?: string | null;
} {
  return {
    id: change.id,
    screenshot_url: change.screenshot_url,
    hero_screenshot_url: change.hero_screenshot_url,
    page_text: change.page_text,
    pixel_diff_pct: change.pixel_diff_pct,
    has_meaningful_change: true,
    change_analysis: change.change_analysis,
    taken_at: change.taken_at,
    landing_pages: {
      id: change.landing_page_id,
      label: change.label,
      url: change.url,
      page_type: change.page_type,
    },
    prev_screenshot_url: change.prev_screenshot_url,
    prev_hero_screenshot_url: change.prev_hero_screenshot_url,
    prev_page_text: change.prev_page_text,
    prev_taken_at: change.prev_taken_at,
  };
}

export function DiscoveryLandingPagesView({
  brandId,
  toolbar,
  onToolbarChange,
  clientBrands,
  activeBrand,
}: Props) {
  const allClientBrandIds = clientBrands.map((b) => b.id);

  const { changes, total, competitors, filterCounts, loading, loadingMore, error, hasMore, loadMore } =
    useDiscoveryLandingPages(brandId, toolbar, allClientBrandIds);

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
    <>
      <div className="mt-4">
        <DiscoveryToolbar
          tab="landing_pages"
          state={toolbar}
          onChange={onToolbarChange}
          competitors={competitors}
          total={total}
          activeBrand={activeBrand}
          clientBrands={clientBrands}
        />
      </div>

      <DiscoveryLandingPagesToolbar
        state={toolbar}
        onChange={onToolbarChange}
        total={total}
        filterCounts={filterCounts}
        className="mt-4"
      />

      {loading ? (
        <div className="mt-10 flex items-center justify-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading landing page changes…
        </div>
      ) : error ? (
        <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 px-4 py-6 text-center text-sm text-red-700">
          {error}
        </div>
      ) : changes.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center">
          <Globe className="mx-auto h-10 w-10 text-slate-300" aria-hidden />
          <p className="mt-3 text-base font-semibold text-slate-900">No landing page changes match these filters</p>
          <p className="mt-1 text-sm text-slate-500">
            We screenshot tracked pages every few days and flag meaningful visual differences with AI. Try a wider time
            window or activate website tracking on a competitor.
          </p>
          <Link
            href="/dashboard/spy"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[color:var(--rival-primary)] px-4 py-2.5 text-sm font-semibold text-white"
          >
            Track competitors
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {changes.map((change) => (
            <ChangeCard
              key={change.id}
              change={toChangeRow(change)}
              prevScreenshotUrl={change.prev_screenshot_url}
              prevHeroScreenshotUrl={change.prev_hero_screenshot_url}
              competitorName={change.competitor_name}
              competitorLogoUrl={change.competitor_logo_url}
              capturedAtLabel={change.taken_at}
            />
          ))}
        </div>
      )}

      {loadingMore ? (
        <div className="mt-6 flex justify-center text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        </div>
      ) : null}
      <div ref={sentinelRef} className="h-1" aria-hidden />
    </>
  );
}
