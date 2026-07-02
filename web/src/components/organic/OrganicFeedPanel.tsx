"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { COMPETITOR_PAGE_X } from "@/components/dashboard/competitor/competitor-page-layout";
import { RivalLoadingBlock } from "@/components/ui/rival-loading";
import { ORGANIC_PLATFORM_LABELS } from "@/lib/organic-content/constants";
import { ORGANIC_PLATFORMS, type OrganicPostSort, type OrganicSocials } from "@/lib/organic-content/types";
import { hasAnyOrganicSocial } from "@/lib/organic-content/socials";
import { cn } from "@/lib/utils";

import { OrganicPostCard, type OrganicPostCardData } from "./OrganicPostCard";

type OrganicFeedPanelProps = {
  competitorId: string;
  socials: OrganicSocials;
  onGoToSettings: () => void;
};

export function OrganicFeedPanel({
  competitorId,
  socials,
  onGoToSettings,
}: OrganicFeedPanelProps) {
  const [platform, setPlatform] = useState<string>("all");
  const [sort, setSort] = useState<OrganicPostSort>("recent");
  const [page, setPage] = useState(1);
  const [posts, setPosts] = useState<OrganicPostCardData[]>([]);
  const [platformsWithPosts, setPlatformsWithPosts] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        platform,
        sort,
        page: String(page),
      });
      const res = await fetch(`/api/competitor/${competitorId}/organic/posts?${params.toString()}`);
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        posts?: OrganicPostCardData[];
        total?: number;
        platformsWithPosts?: string[];
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to load posts");
      }
      setPosts(data.posts ?? []);
      setTotal(data.total ?? 0);
      setPlatformsWithPosts(data.platformsWithPosts ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load posts");
    } finally {
      setLoading(false);
    }
  }, [competitorId, platform, sort, page]);

  useEffect(() => {
    void fetchPosts();
  }, [fetchPosts]);

  if (!hasAnyOrganicSocial(socials)) {
    return (
      <div className={`flex flex-col items-center justify-center py-24 text-center ${COMPETITOR_PAGE_X}`}>
        <p className="max-w-md text-[15px] font-medium text-slate-800">
          No social accounts connected yet.
        </p>
        <p className="mt-2 max-w-md text-[14px] text-slate-600">
          Add your competitor&apos;s handles in Settings to start tracking organic posts.
        </p>
        <button
          type="button"
          onClick={onGoToSettings}
          className="mt-6 rounded-xl bg-slate-900 px-4 py-2.5 text-[13px] font-semibold text-white"
        >
          Go to Settings →
        </button>
      </div>
    );
  }

  const filterPlatforms = ["all", ...ORGANIC_PLATFORMS.filter((p) => platformsWithPosts.includes(p))];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {filterPlatforms.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                setPlatform(p);
                setPage(1);
              }}
              className={cn(
                "rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors",
                platform === p
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
              )}
            >
              {p === "all" ? "All" : ORGANIC_PLATFORM_LABELS[p as keyof typeof ORGANIC_PLATFORM_LABELS]}
            </button>
          ))}
        </div>

        <select
          value={sort}
          onChange={(e) => {
            setSort(e.target.value as OrganicPostSort);
            setPage(1);
          }}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700"
        >
          <option value="recent">Most Recent</option>
          <option value="likes">Most Liked</option>
          <option value="comments">Most Comments</option>
        </select>
      </div>

      {loading ? (
        <RivalLoadingBlock />
      ) : error ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[14px] text-amber-900">
          {error}
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center">
          <p className="text-[14px] text-slate-600">
            No posts yet. Insights are being generated — check back after the first scrape completes.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
            {posts.map((post) => (
              <OrganicPostCard key={post.id} post={post} socials={socials} />
            ))}
          </div>

          {totalPages > 1 ? (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-[13px] disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-[13px] text-slate-600">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-[13px] disabled:opacity-40"
              >
                Next
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
