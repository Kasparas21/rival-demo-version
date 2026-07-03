"use client";

import { Loader2, X } from "lucide-react";
import type { ComponentType } from "react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  FacebookLogo,
  InstagramLogo,
  LinkedInLogo,
  TikTokLogo,
  XLogo,
  YouTubeLogo,
} from "@/components/platform-logos";
import { ORGANIC_FEED_PAGE_SIZE, ORGANIC_PLATFORM_LABELS } from "@/lib/organic-content/constants";
import type { OrganicPlatform, OrganicPostSort, OrganicSocials } from "@/lib/organic-content/types";
import { cn } from "@/lib/utils";

import { OrganicPostCard, type OrganicPostCardData } from "./OrganicPostCard";
import { OrganicPostSkeleton } from "./OrganicPostSkeleton";
import { fetchOrganicPosts } from "./organic-posts-fetch";

const PLATFORM_LOGOS: Record<OrganicPlatform, ComponentType<{ className?: string }>> = {
  instagram: InstagramLogo,
  tiktok: TikTokLogo,
  youtube: YouTubeLogo,
  linkedin: LinkedInLogo,
  twitter: XLogo,
  facebook: FacebookLogo,
};

type OrganicPostsAllModalProps = {
  open: boolean;
  onClose: () => void;
  competitorId: string;
  platform: OrganicPlatform;
  socials: OrganicSocials;
  total: number;
  onPostClick?: (post: OrganicPostCardData) => void;
};

export function OrganicPostsAllModal({
  open,
  onClose,
  competitorId,
  platform,
  socials,
  total,
  onPostClick,
}: OrganicPostsAllModalProps) {
  const titleId = useId();
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [sort, setSort] = useState<OrganicPostSort>("recent");
  const [posts, setPosts] = useState<OrganicPostCardData[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const label = ORGANIC_PLATFORM_LABELS[platform];
  const Logo = PLATFORM_LOGOS[platform];

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setSort("recent");
    setPosts([]);
    setPage(1);
    setError(null);
    setHasMore(false);
  }, [open, platform]);

  const loadPage = useCallback(
    async (pageNum: number, append: boolean) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        const data = await fetchOrganicPosts(competitorId, {
          platform,
          sort,
          page: pageNum,
          pageSize: ORGANIC_FEED_PAGE_SIZE,
        });
        const nextPosts = data.posts ?? [];
        setPosts((prev) => {
          const merged = append ? [...prev, ...nextPosts] : nextPosts;
          setHasMore(merged.length < (data.total ?? total));
          return merged;
        });
        setPage(pageNum);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load posts");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [competitorId, platform, sort, total],
  );

  useEffect(() => {
    if (!open) return;
    void loadPage(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset when sort changes
  }, [open, sort, platform]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
      };
      document.addEventListener("keydown", onKey);
      return () => {
        document.body.style.overflow = "";
        document.removeEventListener("keydown", onKey);
      };
    }
    return undefined;
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    scrollRef.current?.scrollTo(0, 0);
  }, [open, sort]);

  useEffect(() => {
    const el = sentinelRef.current;
    const root = scrollRef.current;
    if (!open || !el || !root || !hasMore || loading || loadingMore) return;

    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          void loadPage(page + 1, true);
        }
      },
      { root, rootMargin: "200px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [open, hasMore, loading, loadingMore, page, loadPage]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex max-h-[min(92vh,900px)] w-full max-w-5xl flex-col overflow-hidden rounded-t-2xl border border-white/60 bg-white shadow-2xl sm:rounded-2xl"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#e5e7eb] px-4 py-4 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#e5e7eb] bg-[#f8fafc]">
              <Logo className="size-5" />
            </div>
            <div className="min-w-0">
              <h2 id={titleId} className="truncate text-[17px] font-semibold text-[#343434]">
                {label} · Organic
              </h2>
              <p className="text-[13px] text-[#6b7280]">{total} posts</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as OrganicPostSort)}
              className="h-9 rounded-xl border border-[#e5e7eb] bg-white px-3 text-[13px] text-[#343434]"
            >
              <option value="recent">Most Recent</option>
              <option value="likes">Most Liked</option>
              <option value="comments">Most Comments</option>
            </select>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#e5e7eb] text-[#64748b] hover:bg-[#f8fafc]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
          {loading && posts.length === 0 ? (
            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
              {[0, 1, 2, 3].map((k) => (
                <OrganicPostSkeleton key={k} />
              ))}
            </div>
          ) : error && posts.length === 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[14px] text-amber-900">
              {error}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
                {posts.map((post) => (
                  <OrganicPostCard
                    key={post.id}
                    post={post}
                    socials={socials}
                    variant="section"
                    onPostClick={onPostClick}
                  />
                ))}
              </div>
              {loadingMore ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-[#94a3b8]" />
                </div>
              ) : null}
              <div ref={sentinelRef} className="h-1" aria-hidden />
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
