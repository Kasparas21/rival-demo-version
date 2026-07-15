"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, X } from "lucide-react";

import { PlatformAdsModalToolbar } from "@/components/ads-library/platform-ads-modal-toolbar";
import {
  DEFAULT_PLATFORM_ADS_TOOLBAR,
  platformAdsVisibilityClass,
  type PlatformAdsToolbarState,
} from "@/components/ads-library/platform-ads-modal-types";
import { usePlatformAdsModalFeed } from "@/components/ads-library/use-platform-ads-modal-feed";
import type { AdsLibraryPlatform } from "@/lib/ad-library/ads-library-platform";
import type { DemoAd } from "@/lib/demo/dashboard-demo-data";
import { useDemoPlatformAdsModalFeed } from "@/lib/demo/demo-platform-ads-modal-feed";
import { cn } from "@/lib/utils";

export function AdsLibraryAllModal<T>({
  open,
  onClose,
  title,
  logo,
  domain,
  platform,
  getKey,
  viewMode,
  renderItem,
  demoFeed,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  logo: ReactNode;
  domain: string;
  platform: AdsLibraryPlatform;
  getKey: (ad: T) => string;
  viewMode: "grid" | "list";
  renderItem: (ad: T, ctx: { metaScrapeAtMs: number | null }) => ReactNode;
  demoFeed?: {
    baseAds: DemoAd[];
    displayTotal: number;
  };
}) {
  const titleId = useId();
  const scrollBodyRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [toolbar, setToolbar] = useState<PlatformAdsToolbarState>(DEFAULT_PLATFORM_ADS_TOOLBAR);

  const patchToolbar = useCallback((patch: Partial<PlatformAdsToolbarState>) => {
    setToolbar((prev) => ({ ...prev, ...patch }));
  }, []);

  const apiFeed = usePlatformAdsModalFeed({
    open: open && !demoFeed,
    domain,
    platform,
    toolbar,
  });
  const demoFeedResult = useDemoPlatformAdsModalFeed({
    open: open && !!demoFeed,
    platform: platform as DemoAd["platform"],
    baseAds: demoFeed?.baseAds ?? [],
    displayTotal: demoFeed?.displayTotal ?? 0,
    toolbar,
  });
  const { ads, total, hasMore, loading, loadingMore, error, dateRange, metaScrapeAtMs, loadMore, retry } =
    demoFeed ? demoFeedResult : apiFeed;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      setToolbar(DEFAULT_PLATFORM_ADS_TOOLBAR);
      setScrolled(false);
    }
  }, [open]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    scrollBodyRef.current?.scrollTo(0, 0);
  }, [open, toolbar.datePreset, toolbar.customRangeStart, toolbar.customRangeEnd, toolbar.sort, toolbar.groupDuplicates]);

  useEffect(() => {
    const root = scrollBodyRef.current;
    if (!open || !root) return;
    const onScroll = () => setScrolled(root.scrollTop > 6);
    onScroll();
    root.addEventListener("scroll", onScroll, { passive: true });
    return () => root.removeEventListener("scroll", onScroll);
  }, [open]);

  useEffect(() => {
    const el = sentinelRef.current;
    const root = scrollBodyRef.current;
    if (!open || !el || !root || !hasMore || loading || loadingMore) return;

    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) loadMore();
      },
      { root, rootMargin: "320px 0px", threshold: 0 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [open, hasMore, loading, loadingMore, loadMore, ads.length]);

  const dateRangeEarliest = dateRange ? Date.parse(dateRange.earliest) : null;
  const dateRangeLatest = dateRange ? Date.parse(dateRange.latest) : null;

  const countLabel = useMemo(() => {
    if (loading && total === 0) return "Loading…";
    if (total === 0) return "No ads";
    return `${total.toLocaleString()} ad${total === 1 ? "" : "s"}`;
  }, [loading, total]);

  const visibilityClass = platformAdsVisibilityClass(toolbar.viewFields);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4" role="presentation">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 z-0 bg-black/20 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative z-10 flex max-h-[min(92vh,900px)] w-full max-w-5xl flex-col overflow-hidden rounded-[24px] border border-white/80 bg-white shadow-[0_24px_64px_rgba(31,38,135,0.12)]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
          >
            <div
              className={cn(
                "sticky top-0 z-20 shrink-0 transition-[background,box-shadow,border-color] duration-200",
                scrolled
                  ? "border-b border-white/50 bg-white/60 shadow-[0_8px_32px_rgba(15,23,42,0.06)] backdrop-blur-xl backdrop-saturate-[1.4]"
                  : "border-b border-gray-100 bg-white",
              )}
            >
              <div className="flex items-start justify-between gap-4 px-5 py-4 sm:px-6 sm:py-5">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 min-w-10 shrink-0 items-center justify-center gap-1 rounded-xl border border-[#e5e7eb] bg-white px-2 shadow-sm [&_svg]:h-5 [&_svg]:w-5">
                    {logo}
                  </div>
                  <div className="min-w-0">
                    <h2 id={titleId} className="text-[18px] font-semibold text-[#343434] sm:text-[20px]">
                      {title}
                    </h2>
                    <p className="mt-0.5 text-[13px] font-medium text-[#6b7280]">{countLabel}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-[#343434]"
                  aria-label="Close"
                >
                  <X size={20} strokeWidth={2} />
                </button>
              </div>

              <PlatformAdsModalToolbar
                platform={platform}
                state={toolbar}
                onChange={patchToolbar}
                dateRangeEarliest={Number.isFinite(dateRangeEarliest ?? NaN) ? dateRangeEarliest : null}
                dateRangeLatest={Number.isFinite(dateRangeLatest ?? NaN) ? dateRangeLatest : null}
                glass={scrolled}
              />
            </div>

            <div ref={scrollBodyRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
              {error && ads.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-[14px] text-[#6b7280]">{error}</p>
                  <button
                    type="button"
                    onClick={retry}
                    className="mt-3 text-[13px] font-semibold text-sky-700 hover:underline"
                  >
                    Try again
                  </button>
                </div>
              ) : loading && ads.length === 0 ? (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  {[0, 1, 2, 3].map((k) => (
                    <div key={k} className="h-[320px] animate-pulse rounded-2xl border border-[#e5e7eb] bg-[#f3f4f6]" />
                  ))}
                </div>
              ) : ads.length === 0 ? (
                <p className="py-8 text-center text-[14px] text-[#6b7280]">No ads match the current filters.</p>
              ) : (
                <>
                  <div
                    className={cn(
                      "grid items-stretch gap-6",
                      viewMode === "list" ? "mx-auto w-full max-w-2xl grid-cols-1" : "grid-cols-1 sm:grid-cols-2",
                      visibilityClass,
                    )}
                  >
                    {(ads as T[]).map((ad) => (
                      <div key={getKey(ad)} className="h-full min-h-0 flex flex-col">
                        {renderItem(ad, { metaScrapeAtMs })}
                      </div>
                    ))}
                  </div>

                  <div ref={sentinelRef} className="h-1 w-full" aria-hidden />

                  {loadingMore ? (
                    <div className="flex items-center justify-center gap-2 py-6 text-[13px] text-[#6b7280]">
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      Loading more ads…
                    </div>
                  ) : null}

                  {!hasMore && total > 0 && !loading ? (
                    <p className="py-6 text-center text-[13px] font-medium text-[#6b7280]">
                      That&apos;s all — {total.toLocaleString()} ad{total === 1 ? "" : "s"}
                    </p>
                  ) : null}
                </>
              )}
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
