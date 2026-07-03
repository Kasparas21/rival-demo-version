"use client";

import { AlertTriangle, Flame, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { COMPETITOR_PAGE_X } from "@/components/dashboard/competitor/competitor-page-layout";
import { ORGANIC_PLATFORM_LABELS } from "@/lib/organic-content/constants";
import type { OrganicSocials } from "@/lib/organic-content/types";
import { ORGANIC_PLATFORMS } from "@/lib/organic-content/types";
import { hasAnyOrganicSocial } from "@/lib/organic-content/socials";
import { cn } from "@/lib/utils";

import { HotPostCard } from "./HotPostCard";
import { InsightAiSectionSkeleton, OrganicInsightsLoadingShell } from "./OrganicInsightsSkeleton";
import { OrganicPostCard, type OrganicPostCardData } from "./OrganicPostCard";
import { formatEngagementCount, OrganicPlatformBadge } from "./organic-ui-utils";

type InsightItem = {
  summary: string;
  why?: string;
  post_ids?: string[];
};

type HotPost = {
  post_id: string;
  platform: string;
  engagement_total: number;
  summary: string;
};

type TopCollaborator = {
  handle: string;
  platform: string;
  post_count: number;
  collab_types: string[];
};

type MetricsOverview = {
  avg_likes?: number;
  avg_comments?: number;
  avg_shares?: number;
  post_frequency_per_week?: number;
  best_platform?: string;
  best_post_type?: string;
};

type OrganicInsightsPanelProps = {
  competitorId: string;
  socials: OrganicSocials;
  socialsLoading?: boolean;
  onGoToSettings: () => void;
  onPostClick?: (post: OrganicPostCardData) => void;
};

function resolvePostsByPostId(
  linkedPosts: OrganicPostCardData[],
  postIds: string[] | undefined,
): OrganicPostCardData[] {
  if (!postIds?.length) return [];
  const idSet = new Set(postIds);
  return linkedPosts.filter((p) => idSet.has(p.post_id) || idSet.has(p.id));
}

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

function hoursUntil(iso: string | null): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (60 * 60 * 1000)));
}

function formatBestPlatformLabel(platformId: string | undefined): string {
  if (!platformId?.trim()) return "—";
  return (
    ORGANIC_PLATFORM_LABELS[platformId as keyof typeof ORGANIC_PLATFORM_LABELS] ?? platformId
  );
}

function MetricsOverviewGrid({
  overview,
  showBestPlatform,
}: {
  overview: MetricsOverview;
  showBestPlatform: boolean;
}) {
  return (
    <div
      className={cn(
        "mt-4 grid grid-cols-2 gap-3",
        showBestPlatform ? "sm:grid-cols-4" : "sm:grid-cols-3",
      )}
    >
      <div className="rounded-xl border border-[#f4f4f5] bg-[#fafafa]/80 px-4 py-3">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Avg Likes</p>
        <p className="mt-1 text-[18px] font-semibold text-slate-900">
          {formatEngagementCount(overview.avg_likes ?? 0)}
        </p>
      </div>
      <div className="rounded-xl border border-[#f4f4f5] bg-[#fafafa]/80 px-4 py-3">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Avg Comments</p>
        <p className="mt-1 text-[18px] font-semibold text-slate-900">
          {formatEngagementCount(overview.avg_comments ?? 0)}
        </p>
      </div>
      <div className="rounded-xl border border-[#f4f4f5] bg-[#fafafa]/80 px-4 py-3">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Posts/week</p>
        <p className="mt-1 text-[18px] font-semibold text-slate-900">
          {formatEngagementCount(overview.post_frequency_per_week ?? 0)}
        </p>
      </div>
      {showBestPlatform ? (
        <div className="rounded-xl border border-[#f4f4f5] bg-[#fafafa]/80 px-4 py-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Best Platform</p>
          <p className="mt-1 text-[18px] font-semibold text-slate-900">
            {formatBestPlatformLabel(overview.best_platform)}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function OrganicInsightsPanel({
  competitorId,
  socials,
  socialsLoading = false,
  onGoToSettings,
  onPostClick,
}: OrganicInsightsPanelProps) {
  const [platform, setPlatform] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [insight, setInsight] = useState<{
    generated_at: string;
    whats_working: InsightItem[];
    whats_flopping: InsightItem[];
    top_collaborators: TopCollaborator[];
    hot_right_now: HotPost[];
    metrics_overview: MetricsOverview;
  } | null>(null);
  const [linkedPosts, setLinkedPosts] = useState<OrganicPostCardData[]>([]);
  const [platformsWithPosts, setPlatformsWithPosts] = useState<string[]>([]);
  const [organicNextScrapeAt, setOrganicNextScrapeAt] = useState<string | null>(null);
  const [generatingAi, setGeneratingAi] = useState(false);
  const regenAttemptedRef = useRef<Set<string>>(new Set());

  const applyInsightPayload = useCallback(
    (data: {
      insight?: {
        generated_at: string;
        whats_working: InsightItem[];
        whats_flopping: InsightItem[];
        top_collaborators: TopCollaborator[];
        hot_right_now: HotPost[];
        metrics_overview: MetricsOverview;
      } | null;
      linkedPosts?: OrganicPostCardData[];
      platformsWithPosts?: string[];
      organic_next_scrape_at?: string | null;
    }) => {
      setInsight(
        data.insight
          ? {
              generated_at: data.insight.generated_at,
              whats_working: (data.insight.whats_working as InsightItem[]) ?? [],
              whats_flopping: (data.insight.whats_flopping as InsightItem[]) ?? [],
              top_collaborators: (data.insight.top_collaborators as TopCollaborator[]) ?? [],
              hot_right_now: (data.insight.hot_right_now as HotPost[]) ?? [],
              metrics_overview: (data.insight.metrics_overview as MetricsOverview) ?? {},
            }
          : null,
      );
      setLinkedPosts(data.linkedPosts ?? []);
      setPlatformsWithPosts(data.platformsWithPosts ?? []);
      setOrganicNextScrapeAt(data.organic_next_scrape_at ?? null);
    },
    [],
  );

  const loadInsightResponse = useCallback(
    async (platformFilter: string) => {
      const res = await fetch(
        `/api/competitor/${competitorId}/organic/insights?platform=${encodeURIComponent(platformFilter)}`,
      );
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        insight?: {
          generated_at: string;
          whats_working: InsightItem[];
          whats_flopping: InsightItem[];
          top_collaborators: TopCollaborator[];
          hot_right_now: HotPost[];
          metrics_overview: MetricsOverview;
        } | null;
        linkedPosts?: OrganicPostCardData[];
        platformsWithPosts?: string[];
        organic_next_scrape_at?: string | null;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to load insights");
      }
      applyInsightPayload(data);
      return data;
    },
    [applyInsightPayload, competitorId],
  );

  const regenerateInsights = useCallback(
    async (platformFilter: string) => {
      const res = await fetch(`/api/competitor/${competitorId}/organic/insights/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          platformFilter === "all" ? {} : { platform: platformFilter },
        ),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; errors?: string[] };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? data.errors?.[0] ?? "Failed to generate AI insights");
      }
    },
    [competitorId],
  );

  const fetchInsights = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await loadInsightResponse(platform);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load insights");
    } finally {
      setLoading(false);
    }
  }, [loadInsightResponse, platform]);

  const handleRefreshInsights = async () => {
    setGeneratingAi(true);
    setError(null);
    regenAttemptedRef.current.delete(platform);
    try {
      await regenerateInsights(platform);
      await loadInsightResponse(platform);
      regenAttemptedRef.current.add(platform);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate AI insights");
    } finally {
      setGeneratingAi(false);
    }
  };

  useEffect(() => {
    void fetchInsights();
  }, [fetchInsights]);

  const platformOptions = useMemo(() => {
    const configured = ORGANIC_PLATFORMS.filter((p) => Boolean(socials[p]?.trim()));
    return ["all", ...new Set([...platformsWithPosts, ...configured])];
  }, [platformsWithPosts, socials]);

  if (socialsLoading || loading) {
    return <OrganicInsightsLoadingShell />;
  }

  if (!hasAnyOrganicSocial(socials)) {
    return (
      <div className={`flex flex-col items-center justify-center py-24 text-center ${COMPETITOR_PAGE_X}`}>
        <p className="max-w-md text-[14px] text-slate-600">
          Connect social accounts in Settings to generate organic insights.
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

  const staleDays = insight ? daysSince(insight.generated_at) : null;
  const isStale = staleDays != null && staleDays > 4;
  const hoursToScrape = hoursUntil(organicNextScrapeAt);
  const isAllPlatforms = platform === "all";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700"
        >
          {platformOptions.map((p) => (
            <option key={p} value={p}>
              {p === "all"
                ? "All Platforms"
                : ORGANIC_PLATFORM_LABELS[p as keyof typeof ORGANIC_PLATFORM_LABELS] ?? p}
            </option>
          ))}
        </select>

        <div className="flex flex-wrap items-center gap-2">
          {generatingAi ? (
            <div className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-[12px] text-sky-900">
              <RefreshCw className="h-4 w-4 shrink-0 motion-safe:animate-spin" />
              Generating AI insights…
            </div>
          ) : (
            <button
              type="button"
              onClick={() => void handleRefreshInsights()}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] font-medium text-slate-700 hover:border-slate-300"
            >
              <RefreshCw className="h-4 w-4 shrink-0" />
              Refresh AI insights
            </button>
          )}

          {isStale ? (
            <div className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-900">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Insights last updated {staleDays} days ago.
              {hoursToScrape != null ? ` Next scrape in ${hoursToScrape} hours.` : null}
            </div>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[14px] text-amber-900">
          {error}
        </div>
      ) : !insight ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center">
          <p className="text-[14px] font-medium text-slate-800">No posts to analyze yet</p>
          <p className="mt-2 text-[13px] text-slate-600">
            Scrape organic posts from Settings, then insights will populate here.
          </p>
        </div>
      ) : (
        <>
          <section className="rounded-2xl border border-[#ececef] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <h3 className="text-[13px] font-semibold uppercase tracking-wide text-slate-500">
              Metrics Overview
            </h3>
            <MetricsOverviewGrid
              key={platform}
              overview={insight.metrics_overview}
              showBestPlatform={isAllPlatforms}
            />
          </section>

          <InsightSection
            title="What's Working"
            items={insight.whats_working}
            linkedPosts={linkedPosts}
            socials={socials}
            tone="emerald"
            generatingAi={generatingAi}
            onPostClick={onPostClick}
          />
          <InsightSection
            title="What's Flopping"
            items={insight.whats_flopping}
            linkedPosts={linkedPosts}
            socials={socials}
            tone="rose"
            generatingAi={generatingAi}
            onPostClick={onPostClick}
          />

          <section className="rounded-2xl border border-[#ececef] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <h3 className="text-[13px] font-semibold uppercase tracking-wide text-slate-500">
              Top Collaborators
            </h3>
            <div className="mt-4 space-y-3">
              {(insight.top_collaborators ?? []).length === 0 ? (
                <p className="text-[13px] text-slate-500">No collaborators detected yet.</p>
              ) : (
                insight.top_collaborators.map((collab) => (
                  <div
                    key={`${collab.platform}-${collab.handle}`}
                    className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-[13px] font-bold text-slate-600">
                      {collab.handle.replace(/^@/, "").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-semibold text-slate-900">{collab.handle}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <OrganicPlatformBadge platform={collab.platform} />
                        <span className="text-[12px] text-slate-500">{collab.post_count} posts</span>
                        {(collab.collab_types ?? []).map((t) => (
                          <span
                            key={t}
                            className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-slate-600 ring-1 ring-slate-200"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-[#ececef] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-amber-500" />
              <h3 className="text-[13px] font-semibold uppercase tracking-wide text-slate-500">
                Hot Right Now
              </h3>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(insight.hot_right_now ?? []).slice(0, 3).map((hot) => {
                const post = linkedPosts.find((p) => p.post_id === hot.post_id);
                return (
                  <HotPostCard
                    key={hot.post_id}
                    hot={hot}
                    post={post ?? null}
                    socials={socials}
                    onPostClick={onPostClick}
                  />
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function InsightSection({
  title,
  items,
  linkedPosts,
  socials,
  tone,
  generatingAi,
  onPostClick,
}: {
  title: string;
  items: InsightItem[];
  linkedPosts: OrganicPostCardData[];
  socials: OrganicSocials;
  tone: "emerald" | "rose";
  generatingAi?: boolean;
  onPostClick?: (post: OrganicPostCardData) => void;
}) {
  const border = tone === "emerald" ? "border-emerald-100" : "border-rose-100";
  const bg = tone === "emerald" ? "bg-emerald-50/30" : "bg-rose-50/30";

  return (
    <section className="rounded-2xl border border-[#ececef] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <h3 className="text-[13px] font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      <div className="mt-4 space-y-4">
        {items.length === 0 ? (
          generatingAi ? (
            <InsightAiSectionSkeleton />
          ) : (
            <p className="text-[13px] text-slate-500">
              No AI analysis yet. Click Refresh AI insights above to generate.
            </p>
          )
        ) : (
          items.map((item, idx) => {
            const related = resolvePostsByPostId(linkedPosts, item.post_ids);
            return (
              <div key={`${title}-${idx}`} className={cn("rounded-xl border p-4", border, bg)}>
                <p className="text-[14px] font-semibold text-slate-900">{item.summary}</p>
                {item.why ? (
                  <p className="mt-1 text-[13px] leading-relaxed text-slate-600">{item.why}</p>
                ) : null}
                {related.length > 0 ? (
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {related.slice(0, 3).map((post) => (
                      <HotPostCard
                        key={post.id}
                        variant="compact"
                        hot={{
                          post_id: post.post_id,
                          platform: post.platform,
                          engagement_total: post.likes + post.comments + (post.shares ?? 0),
                          summary: post.content?.trim().slice(0, 140) || "Example post",
                        }}
                        post={post}
                        socials={socials}
                        onPostClick={onPostClick}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
