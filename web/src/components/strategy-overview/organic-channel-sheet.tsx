"use client";

import type { ComponentType } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDownUp, ExternalLink, X } from "lucide-react";

import {
  FacebookLogo,
  InstagramLogo,
  LinkedInLogo,
  TikTokLogo,
  XLogo,
  YouTubeLogo,
} from "@/components/platform-logos";
import type { OrganicPostCardData } from "@/components/organic/OrganicPostCard";
import { fetchOrganicPosts } from "@/components/organic/organic-posts-fetch";
import { formatEngagementCount } from "@/components/organic/organic-ui-utils";
import { ORGANIC_PLATFORM_LABELS } from "@/lib/organic-content/constants";
import { buildOrganicPostDetailSeed } from "@/lib/organic-content/organic-post-detail-cache";
import type { OrganicPostDetailOpenSeed } from "@/lib/organic-content/organic-post-detail-cache";
import type { OrganicPostSort } from "@/lib/organic-content/types";
import { CHANNEL_ORGANIC_THEME } from "@/lib/strategy-overview/map-node-sizing";
import type {
  OrganicChannelNodePayload,
  OrganicChannelPlatform,
} from "@/lib/strategy-overview/payload-types";

const PLATFORM_LOGOS: Record<OrganicChannelPlatform, ComponentType<{ className?: string }>> = {
  instagram: InstagramLogo,
  tiktok: TikTokLogo,
  youtube: YouTubeLogo,
  linkedin: LinkedInLogo,
  twitter: XLogo,
  facebook: FacebookLogo,
};

const SORT_OPTIONS: { id: OrganicPostSort; label: string }[] = [
  { id: "recent", label: "Most recent" },
  { id: "likes", label: "Most likes" },
  { id: "comments", label: "Most comments" },
];

type Props = {
  open: boolean;
  platform: OrganicChannelPlatform | null;
  competitorId: string;
  competitorName: string;
  nodeSummary: OrganicChannelNodePayload | null;
  onClose: () => void;
  onOpenPost: (postId: string, seed: OrganicPostDetailOpenSeed) => void;
};

export function OrganicChannelSheet({
  open,
  platform,
  competitorId,
  competitorName,
  nodeSummary,
  onClose,
  onOpenPost,
}: Props) {
  const [posts, setPosts] = useState<OrganicPostCardData[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<OrganicPostSort>("recent");

  const pageSize = 50;
  const hasMore = posts.length < total;

  const resetAndFetch = useCallback(async () => {
    if (!platform) return;
    if (!competitorId.trim()) {
      setErr("Open this competitor from your dashboard to load organic posts.");
      setPosts([]);
      setTotal(0);
      return;
    }
    setLoading(true);
    setErr(null);
    setPosts([]);
    setPage(1);
    try {
      const data = await fetchOrganicPosts(competitorId.trim(), {
        platform,
        sort: sortMode,
        page: 1,
        pageSize,
      });
      setPosts(data.posts ?? []);
      setTotal(data.total ?? 0);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load posts");
    } finally {
      setLoading(false);
    }
  }, [platform, competitorId, sortMode]);

  useEffect(() => {
    if (!open || !platform) return;
    void resetAndFetch();
  }, [open, platform, resetAndFetch]);

  const loadMore = useCallback(async () => {
    if (!platform || loadingMore || !hasMore) return;
    const nextPage = page + 1;
    setLoadingMore(true);
    try {
      const data = await fetchOrganicPosts(competitorId.trim(), {
        platform,
        sort: sortMode,
        page: nextPage,
        pageSize,
      });
      const batch = data.posts ?? [];
      if (batch.length > 0) {
        setPosts((prev) => [...prev, ...batch]);
        setPage(nextPage);
      }
      setTotal(data.total ?? total);
    } finally {
      setLoadingMore(false);
    }
  }, [platform, competitorId, sortMode, page, loadingMore, hasMore, total]);

  const label = useMemo(
    () => (platform ? ORGANIC_PLATFORM_LABELS[platform] : ""),
    [platform],
  );
  const Logo = platform ? PLATFORM_LOGOS[platform] : null;

  if (!open || !platform) return null;

  const summary = nodeSummary;
  const theme = CHANNEL_ORGANIC_THEME;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal aria-labelledby="organic-channel-sheet-title">
      <button type="button" className="absolute inset-0 bg-black/30" aria-label="Close" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-xl flex-col border-l border-slate-200 bg-[#f8fafc] shadow-2xl animate-in slide-in-from-right duration-200">
        <div className="border-b border-slate-200 bg-white px-4 py-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {Logo ? <Logo className="h-7 w-7 shrink-0" /> : null}
                <h2 id="organic-channel-sheet-title" className="truncate text-[16px] font-semibold text-[#0f172a]">
                  {label}
                </h2>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${theme.badge}`}
                >
                  Organic
                </span>
              </div>
              {summary ? (
                <p className="mt-1.5 text-[12px] text-slate-600">
                  {summary.postCount} posts · ~{summary.postsPerWeek}/wk ·{" "}
                  {formatEngagementCount(summary.avgEngagement)} avg engagement
                </p>
              ) : null}
            </div>
            <button type="button" onClick={onClose} className="shrink-0 rounded-lg p-2 text-slate-500 hover:bg-slate-50">
              <X className="h-5 w-5" />
            </button>
          </div>

          {!loading && posts.length > 0 ? (
            <div className="mt-3 flex items-center gap-2">
              <ArrowDownUp className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
              <label htmlFor="organic-channel-sort" className="sr-only">
                Sort posts
              </label>
              <select
                id="organic-channel-sort"
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as OrganicPostSort)}
                className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-700 shadow-sm focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-100"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {err ? <p className="text-[13px] text-red-600">{err}</p> : null}
          {loading ? (
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="overflow-hidden rounded-2xl border border-slate-200 bg-white animate-pulse">
                  <div className="aspect-[4/5] bg-slate-100" />
                  <div className="space-y-2 p-3">
                    <div className="h-3 rounded bg-slate-100" />
                    <div className="h-3 w-2/3 rounded bg-slate-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {posts.map((post) => (
                <OrganicPostSheetCard
                  key={post.id}
                  post={post}
                  competitorId={competitorId}
                  competitorName={competitorName}
                  onOpenPost={onOpenPost}
                />
              ))}
            </div>
          )}
        </div>

        {!loading && hasMore ? (
          <div className="border-t border-slate-200 bg-white p-4 text-center">
            <p className="mb-2 text-[11px] text-slate-600">
              Showing {posts.length} of {total} posts on {label}.
            </p>
            <button
              type="button"
              disabled={loadingMore}
              onClick={() => void loadMore()}
              className="text-[12px] font-medium text-violet-700 hover:underline"
            >
              {loadingMore ? "Loading…" : "Load more"}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function OrganicPostSheetCard({
  post,
  competitorId,
  competitorName,
  onOpenPost,
}: {
  post: OrganicPostCardData;
  competitorId: string;
  competitorName: string;
  onOpenPost: Props["onOpenPost"];
}) {
  const thumb = post.media_urls[0] ?? null;
  const preview = (post.content ?? "").trim() || "—";
  const engagement = formatEngagementCount(
    (post.likes ?? 0) + (post.comments ?? 0) + (post.shares ?? 0),
  );

  const handleOpen = () => {
    const seed = buildOrganicPostDetailSeed(post, {
      id: competitorId,
      name: competitorName,
    });
    onOpenPost(post.id, seed);
  };

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] transition-shadow hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
      <div className="relative overflow-hidden border-b border-slate-100 bg-violet-50/40 p-1.5">
        <div className="overflow-hidden rounded-xl bg-white shadow-inner ring-1 ring-slate-200/80">
          {thumb ? (
            <div className="aspect-[4/5] w-full bg-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={thumb} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
            </div>
          ) : (
            <div className="flex aspect-[4/5] w-full items-center justify-center bg-violet-50/80 text-[10px] text-slate-500">
              No media
            </div>
          )}
        </div>
        <span className="absolute left-3 top-3 rounded-full bg-violet-600/95 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white shadow-sm">
          Organic
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-3">
        <div>
          <p className="text-[10px] font-medium leading-snug text-slate-500">{engagement} engagement</p>
          <p className="mt-1 line-clamp-3 text-[11px] leading-snug text-slate-800">{preview}</p>
        </div>
        <div className="mt-auto grid grid-cols-2 gap-1.5">
          {post.post_url ? (
            <a
              href={post.post_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[10px] font-semibold text-slate-800 hover:bg-slate-50"
            >
              <ExternalLink className="h-3 w-3" aria-hidden />
              Live
            </a>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={handleOpen}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[10px] font-semibold text-slate-800 hover:bg-slate-50"
          >
            Open post
          </button>
        </div>
      </div>
    </article>
  );
}
