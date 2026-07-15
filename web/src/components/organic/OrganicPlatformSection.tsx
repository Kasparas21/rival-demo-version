"use client";

import { RefreshCw } from "lucide-react";
import type { ComponentType } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  FacebookLogo,
  InstagramLogo,
  LinkedInLogo,
  TikTokLogo,
  XLogo,
  YouTubeLogo,
} from "@/components/platform-logos";
import { ORGANIC_PLATFORM_LABELS, ORGANIC_POSTS_INLINE_PREVIEW } from "@/lib/organic-content/constants";
import type { OrganicPlatform, OrganicSocials } from "@/lib/organic-content/types";
import { useSavedOrganicPosts } from "@/lib/saved-organic/use-saved-organic-posts";
import { cn } from "@/lib/utils";

import { OrganicEmptyWithPlaceholders } from "./OrganicEmptyWithPlaceholders";
import { OrganicLastScrapedLine } from "./OrganicLastScrapedLine";
import { OrganicPostCard, type OrganicPostCardData } from "./OrganicPostCard";
import { OrganicPostSkeleton } from "./OrganicPostSkeleton";
import { OrganicPostsAllModal } from "./OrganicPostsAllModal";
import {
  ORGANIC_POSTS_GRID_CLASS,
  organicPostsBodyShellClass,
  platformRefreshActionsRowClass,
  platformRefreshOnlyButtonClass,
  platformSectionPanelClass,
} from "./organic-feed-layout";
import { fetchOrganicPosts } from "./organic-posts-fetch";

const PLATFORM_LOGOS: Record<OrganicPlatform, ComponentType<{ className?: string }>> = {
  instagram: InstagramLogo,
  tiktok: TikTokLogo,
  youtube: YouTubeLogo,
  linkedin: LinkedInLogo,
  twitter: XLogo,
  facebook: FacebookLogo,
};

type OrganicPlatformSectionProps = {
  competitorId: string;
  platform: OrganicPlatform;
  socials: OrganicSocials;
  refreshTrigger?: number;
  globalLastScrapedAt?: string | null;
  onGoToSettings: () => void;
  onPostClick?: (post: OrganicPostCardData) => void;
  onChannelDataUpdated?: () => void;
};

export function OrganicPlatformSection({
  competitorId,
  platform,
  socials,
  refreshTrigger = 0,
  globalLastScrapedAt,
  onGoToSettings,
  onPostClick,
  onChannelDataUpdated,
}: OrganicPlatformSectionProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [posts, setPosts] = useState<Awaited<ReturnType<typeof fetchOrganicPosts>>["posts"]>([]);
  const [total, setTotal] = useState(0);
  const [lastScrapedAt, setLastScrapedAt] = useState<string | null | undefined>(undefined);
  const [modalOpen, setModalOpen] = useState(false);

  const label = ORGANIC_PLATFORM_LABELS[platform];
  const Logo = PLATFORM_LOGOS[platform];
  const sectionBusy = loading || refreshing;

  const postIds = useMemo(() => (posts ?? []).map((p) => p.id), [posts]);
  const { isSaved, toggleSave, savedMap } = useSavedOrganicPosts(competitorId, postIds);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchOrganicPosts(competitorId, {
        platform,
        sort: "recent",
        page: 1,
        pageSize: ORGANIC_POSTS_INLINE_PREVIEW,
      });
      setPosts(data.posts ?? []);
      setTotal(data.total ?? 0);
      setLastScrapedAt(data.last_scraped_at ?? globalLastScrapedAt ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load posts");
    } finally {
      setLoading(false);
    }
  }, [competitorId, platform, globalLastScrapedAt, refreshTrigger]);

  useEffect(() => {
    void loadPosts();
  }, [loadPosts]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const scrapeRes = await fetch(`/api/competitor/${competitorId}/organic/scrape-now`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platforms: [platform], newPlatforms: [platform] }),
      });
      const scrapeData = (await scrapeRes.json()) as {
        ok?: boolean;
        error?: string;
        platformErrors?: Record<string, string>;
      };
      if (!scrapeRes.ok || !scrapeData.ok) {
        throw new Error(scrapeData.error ?? scrapeData.platformErrors?.[platform] ?? "Refresh failed");
      }
      await loadPosts();
      onChannelDataUpdated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Refresh failed");
    } finally {
      setRefreshing(false);
    }
  };

  const effectiveLastScraped = lastScrapedAt ?? globalLastScrapedAt ?? null;

  return (
    <section>
      <div className={platformSectionPanelClass}>
        <div className="flex flex-col gap-4 border-b border-white/55 px-4 pb-4 pt-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-5 sm:pb-4 sm:pt-5">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/60 bg-white/80 shadow-sm backdrop-blur-sm">
              <Logo className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-[16px] font-semibold tracking-[-0.01em] text-[#343434]">
                {label} · Organic
              </h3>
              <OrganicLastScrapedLine
                busy={sectionBusy}
                busyLabel={refreshing ? `Refreshing ${label}…` : `Loading ${label} posts…`}
                lastScrapedAt={effectiveLastScraped}
                errorSuffix={error && (posts?.length ?? 0) === 0 ? error : null}
              />
              {!sectionBusy && total > 0 ? (
                <p className="mt-0.5 text-[13px] text-[#6b7280]">
                  {total} post{total === 1 ? "" : "s"}
                </p>
              ) : null}
            </div>
          </div>
          {!sectionBusy && total > ORGANIC_POSTS_INLINE_PREVIEW ? (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex h-10 shrink-0 items-center justify-center self-start rounded-xl border border-white/60 bg-white/85 px-4 text-[13px] font-semibold text-[#343434] shadow-sm transition-colors hover:border-[#DDF1FD] hover:bg-white sm:self-auto"
            >
              View all {total} posts
            </button>
          ) : null}
        </div>

        <div className={platformRefreshActionsRowClass}>
          <button
            type="button"
            disabled={sectionBusy}
            onClick={() => void handleRefresh()}
            className={platformRefreshOnlyButtonClass}
            title={`Re-fetch ${label} posts only.`}
          >
            <RefreshCw
              className={cn(
                "h-4 w-4 shrink-0",
                refreshing && "motion-safe:animate-spin",
              )}
            />
            Refresh {label} only
          </button>
        </div>

        <div className={organicPostsBodyShellClass}>
          {sectionBusy ? (
            <div className={ORGANIC_POSTS_GRID_CLASS}>
              {[0, 1, 2].map((k) => (
                <OrganicPostSkeleton key={k} />
              ))}
            </div>
          ) : error && (posts?.length ?? 0) === 0 ? (
            <OrganicEmptyWithPlaceholders
              message={
                <>
                  Could not load {label} posts. Try Refresh {label} only below, or check your handle in{" "}
                  <button
                    type="button"
                    onClick={onGoToSettings}
                    className="font-semibold text-sky-700 hover:underline"
                  >
                    Settings
                  </button>
                  .
                </>
              }
            />
          ) : total === 0 ? (
            <OrganicEmptyWithPlaceholders
              message={
                <>
                  No {label} posts yet. Confirm the handle in{" "}
                  <button
                    type="button"
                    onClick={onGoToSettings}
                    className="font-semibold text-sky-700 hover:underline"
                  >
                    Settings
                  </button>{" "}
                  and try Refresh {label} only.
                </>
              }
            />
          ) : (
            <div className={ORGANIC_POSTS_GRID_CLASS}>
              {(posts ?? []).map((post) => (
                <OrganicPostCard
                  key={post.id}
                  post={post}
                  socials={socials}
                  variant="section"
                  onPostClick={onPostClick}
                  save={{
                    isSaved: isSaved(post.id) || Boolean(savedMap[post.id]),
                    onToggle: () => void toggleSave(post.id),
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <OrganicPostsAllModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        competitorId={competitorId}
        platform={platform}
        socials={socials}
        total={total}
        onPostClick={onPostClick}
      />
    </section>
  );
}
