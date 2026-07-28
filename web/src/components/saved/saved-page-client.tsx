"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bookmark, Loader2 } from "lucide-react";

import { useActiveBrand } from "@/app/dashboard/brand-context";
import { EmailDetailDrawer } from "@/components/email-intelligence/EmailDetailDrawer";
import { AdDetailDrawer } from "@/components/ad-detail/ad-detail-drawer";
import { FeatureSectionHeader } from "@/components/dashboard/feature-section-header";
import { SavedFeedCard } from "@/components/saved/saved-feed-card";
import { SavedToolbar, SAVED_TAB_META, savedTabClass } from "@/components/saved/saved-toolbar";
import { useSavedFeed } from "@/components/saved/use-saved-feed";
import { useAdDetailState } from "@/lib/ad-detail/use-ad-detail-state";
import { emitSavedItemsChanged } from "@/lib/saved-items/saved-items-events";
import type { SavedFeedItem } from "@/lib/saved/types";
import { cn } from "@/lib/utils";

async function unsaveItem(item: SavedFeedItem): Promise<boolean> {
  const routes: Record<SavedFeedItem["item_type"], string> = {
    ad: `/api/saved-ads/${item.id}`,
    email: `/api/saved-emails/${item.id}`,
    organic: `/api/saved-organic-posts/${item.id}`,
    landing: `/api/saved-landing-pages/${item.id}`,
  };
  const res = await fetch(routes[item.item_type], { method: "DELETE", credentials: "include" });
  const json = (await res.json()) as { ok?: boolean };
  return Boolean(json.ok);
}

export function SavedPageClient() {
  const activeBrand = useActiveBrand();
  const { activeAdId, openAd, closeAd } = useAdDetailState();
  const [emailDrawer, setEmailDrawer] = useState<{
    competitorId: string;
    emailId: string;
    savedEmailId: string;
  } | null>(null);

  const {
    tab,
    selectTab,
    toolbar,
    patchToolbar,
    items,
    total,
    competitors,
    typeCounts,
    platformCounts,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    refresh,
    removeItem,
  } = useSavedFeed(activeBrand.id);

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

  const handleUnsave = useCallback(
    async (item: SavedFeedItem) => {
      const ok = await unsaveItem(item);
      if (!ok) return;
      removeItem(item.id);
      emitSavedItemsChanged();
      refresh();
    },
    [refresh, removeItem],
  );

  return (
    <div className="mx-auto w-full max-w-[1480px] px-4 py-6 sm:px-6 lg:px-8">
      <FeatureSectionHeader
        overline="Library"
        title="Saved"
        description="Everything you've bookmarked — ads, emails, organic posts, and landing pages — across all competitors."
      />

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {SAVED_TAB_META.map((meta) => {
          const Icon = meta.icon;
          const active = tab === meta.id;
          const count = typeCounts[meta.countKey];
          return (
            <button
              key={meta.id}
              type="button"
              className={cn(savedTabClass(active), "inline-flex items-center gap-1.5")}
              onClick={() => selectTab(meta.id)}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />
              {meta.label}
              <span className={cn("tabular-nums text-xs", active ? "text-white/80" : "text-slate-400")}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        <SavedToolbar
          state={toolbar}
          onChange={patchToolbar}
          competitors={competitors}
          typeCounts={typeCounts}
          platformCounts={platformCounts}
          total={total}
        />
      </div>

      {loading ? (
        <div className="mt-10 flex items-center justify-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading your saved collection…
        </div>
      ) : error ? (
        <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 px-4 py-6 text-center text-sm text-red-700">
          {error}
        </div>
      ) : items.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center">
          <Bookmark className="mx-auto h-10 w-10 text-slate-300" aria-hidden />
          <p className="mt-3 text-base font-semibold text-slate-900">Nothing saved yet</p>
          <p className="mt-1 text-sm text-slate-500">
            Bookmark ads in Discovery, save emails from Email Marketing, or pin landing pages from a competitor profile.
          </p>
          <Link
            href="/dashboard/discovery"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[color:var(--rival-primary)] px-4 py-2.5 text-sm font-semibold text-white"
          >
            Browse Discovery
          </Link>
        </div>
      ) : (
        <div
          className={cn(
            "mt-5 columns-1 gap-4 sm:columns-2 xl:columns-3 2xl:columns-4",
            "[&>*]:mb-4 [&>*]:break-inside-avoid",
          )}
        >
          {items.map((item) => (
            <SavedFeedCard
              key={`${item.item_type}:${item.id}`}
              item={item}
              onOpenAd={openAd}
              onOpenEmail={(competitorId, emailId, savedEmailId) =>
                setEmailDrawer({ competitorId, emailId, savedEmailId })
              }
              onUnsave={() => void handleUnsave(item)}
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

      <AdDetailDrawer adId={activeAdId} onClose={closeAd} />

      <EmailDetailDrawer
        competitorId={emailDrawer?.competitorId ?? ""}
        emailId={emailDrawer?.emailId ?? null}
        savedEmailId={emailDrawer?.savedEmailId ?? null}
        isSaved={Boolean(emailDrawer?.savedEmailId)}
        onToggleSave={
          emailDrawer
            ? () => {
                const savedId = emailDrawer.savedEmailId;
                setEmailDrawer(null);
                void (async () => {
                  const res = await fetch(`/api/saved-emails/${savedId}`, {
                    method: "DELETE",
                    credentials: "include",
                  });
                  const json = (await res.json()) as { ok?: boolean };
                  if (json.ok) {
                    emitSavedItemsChanged();
                    refresh();
                  }
                })();
              }
            : undefined
        }
        onClose={() => setEmailDrawer(null)}
        onEmailUpdated={() => {}}
      />
    </div>
  );
}
