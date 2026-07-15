"use client";

import { Flame } from "lucide-react";
import { useEffect, useMemo, useState, type ComponentType } from "react";

import { OrganicLastScrapedLine } from "@/components/organic/OrganicLastScrapedLine";
import { HotPostCard } from "@/components/organic/HotPostCard";
import { OrganicPostCard, type OrganicPostCardData } from "@/components/organic/OrganicPostCard";
import {
  ORGANIC_FEED_PLATFORM_ORDER,
  ORGANIC_PLATFORM_FILTER_CONFIG,
  ORGANIC_POSTS_GRID_CLASS,
  organicPostsBodyShellClass,
  platformSectionPanelClass,
} from "@/components/organic/organic-feed-layout";
import { formatEngagementCount, OrganicPlatformBadge } from "@/components/organic/organic-ui-utils";
import {
  FacebookLogo,
  InstagramLogo,
  LinkedInLogo,
  TikTokLogo,
  XLogo,
  YouTubeLogo,
} from "@/components/platform-logos";
import {
  buildDemoOrganicInsights,
  buildDemoOrganicInsightsPayload,
  frozenOrganicPostsToCardData,
  getDemoOrganicSocials,
  type DemoOrganicInsightItem,
} from "@/lib/demo/demo-frozen-organic-payload";
import {
  ORGANIC_PLATFORM_LABELS,
  ORGANIC_PLATFORM_PLACEHOLDERS,
  ORGANIC_POSTS_INLINE_PREVIEW,
} from "@/lib/organic-content/constants";
import { ORGANIC_PLATFORMS, type OrganicPlatform, type OrganicSocials } from "@/lib/organic-content/types";
import { cn } from "@/lib/utils";

const PLATFORM_CHIP_LOGOS: Record<OrganicPlatform, ComponentType<{ className?: string }>> = {
  instagram: InstagramLogo,
  tiktok: TikTokLogo,
  youtube: YouTubeLogo,
  linkedin: LinkedInLogo,
  twitter: XLogo,
  facebook: FacebookLogo,
};

const PLATFORM_SECTION_LOGOS = PLATFORM_CHIP_LOGOS;

const DEMO_ORGANIC_LAST_SCRAPED_AT = new Date(Date.now() - 2 * 3_600_000).toISOString();

function resolvePostsByPostId(
  linkedPosts: OrganicPostCardData[],
  postIds: string[] | undefined,
): OrganicPostCardData[] {
  if (!postIds?.length) return [];
  const idSet = new Set(postIds);
  return linkedPosts.filter((p) => idSet.has(p.post_id) || idSet.has(p.id));
}

function formatBestPlatformLabel(platformId: string | undefined): string {
  if (!platformId?.trim()) return "—";
  return ORGANIC_PLATFORM_LABELS[platformId as OrganicPlatform] ?? platformId;
}

function DemoOrganicPlatformSection({
  platform,
  posts,
  socials,
}: {
  platform: OrganicPlatform;
  posts: OrganicPostCardData[];
  socials: OrganicSocials;
}) {
  const label = ORGANIC_PLATFORM_LABELS[platform];
  const Logo = PLATFORM_SECTION_LOGOS[platform];
  const total = posts.length;
  const previewPosts = posts.slice(0, ORGANIC_POSTS_INLINE_PREVIEW);

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
              <OrganicLastScrapedLine busy={false} busyLabel="" lastScrapedAt={DEMO_ORGANIC_LAST_SCRAPED_AT} />
              {total > 0 ? (
                <p className="mt-0.5 text-[13px] text-[#6b7280]">
                  {total} post{total === 1 ? "" : "s"}
                </p>
              ) : null}
            </div>
          </div>
          {total > ORGANIC_POSTS_INLINE_PREVIEW ? (
            <button
              type="button"
              disabled
              className="inline-flex h-10 shrink-0 cursor-default items-center justify-center self-start rounded-xl border border-white/60 bg-white/85 px-4 text-[13px] font-semibold text-[#343434] opacity-90 shadow-sm sm:self-auto"
            >
              View all {total} posts
            </button>
          ) : null}
        </div>

        <div className={organicPostsBodyShellClass}>
          <div className={ORGANIC_POSTS_GRID_CLASS}>
            {previewPosts.map((post) => (
              <OrganicPostCard key={post.id} post={post} socials={socials} variant="section" />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function DemoOrganicFeedView({
  domain,
}: {
  domain: string;
  competitorName: string;
}) {
  const socials = useMemo(() => getDemoOrganicSocials(domain), [domain]);
  const posts = useMemo(() => frozenOrganicPostsToCardData(domain), [domain]);

  const configuredPlatforms = useMemo(() => {
    const withPosts = new Set(posts.map((post) => post.platform));
    return ORGANIC_FEED_PLATFORM_ORDER.filter(
      (platform) => withPosts.has(platform) && Boolean(socials[platform]?.trim()),
    );
  }, [posts, socials]);

  const [visiblePlatforms, setVisiblePlatforms] = useState<Set<OrganicPlatform>>(
    () => new Set(configuredPlatforms),
  );

  useEffect(() => {
    setVisiblePlatforms(new Set(configuredPlatforms));
  }, [configuredPlatforms]);

  const postsByPlatform = useMemo(() => {
    const map = new Map<OrganicPlatform, OrganicPostCardData[]>();
    for (const post of posts) {
      const platform = post.platform as OrganicPlatform;
      const list = map.get(platform) ?? [];
      list.push(post);
      map.set(platform, list);
    }
    return map;
  }, [posts]);

  const togglePlatform = (platform: OrganicPlatform) => {
    setVisiblePlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(platform)) {
        if (next.size <= 1) return prev;
        next.delete(platform);
      } else {
        next.add(platform);
      }
      return next;
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-2">
        {ORGANIC_PLATFORM_FILTER_CONFIG.filter(({ id }) => configuredPlatforms.includes(id)).map(
          ({ id, label }) => {
            const Logo = PLATFORM_CHIP_LOGOS[id];
            const visible = visiblePlatforms.has(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => togglePlatform(id)}
                title={`${visible ? "Hide" : "Show"} ${label}`}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-[12px] font-semibold transition-colors",
                  visible
                    ? "border-[#93c5fd] bg-[#DDF1FD] text-[#343434]"
                    : "border-white/70 bg-white/80 text-[#64748b] hover:border-[#DDF1FD]/80",
                )}
              >
                <Logo className="h-4 w-4 shrink-0" />
                {label}
              </button>
            );
          },
        )}
      </div>

      <div className="flex flex-col gap-12">
        {configuredPlatforms.map((platform) =>
          visiblePlatforms.has(platform) ? (
            <DemoOrganicPlatformSection
              key={platform}
              platform={platform}
              posts={postsByPlatform.get(platform) ?? []}
              socials={socials}
            />
          ) : null,
        )}
      </div>
    </div>
  );
}

function DemoInsightSection({
  title,
  items,
  linkedPosts,
  socials,
  tone,
}: {
  title: string;
  items: DemoOrganicInsightItem[];
  linkedPosts: OrganicPostCardData[];
  socials: OrganicSocials;
  tone: "emerald" | "rose";
}) {
  const border = tone === "emerald" ? "border-emerald-100" : "border-rose-100";
  const bg = tone === "emerald" ? "bg-emerald-50/30" : "bg-rose-50/30";

  return (
    <section className="rounded-2xl border border-[#ececef] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <h3 className="text-[13px] font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      <div className="mt-4 space-y-4">
        {items.map((item, idx) => {
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
                    />
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function DemoOrganicInsightsView({
  domain,
  competitorName,
}: {
  domain: string;
  competitorName: string;
}) {
  const socials = useMemo(() => getDemoOrganicSocials(domain), [domain]);
  const posts = useMemo(() => frozenOrganicPostsToCardData(domain, competitorName), [domain, competitorName]);
  const insight = useMemo(() => buildDemoOrganicInsightsPayload(domain), [domain]);
  const summary = useMemo(() => buildDemoOrganicInsights(domain), [domain]);
  const overview = insight.metrics_overview;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[#ececef] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <h3 className="text-[13px] font-semibold uppercase tracking-wide text-slate-500">Metrics Overview</h3>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
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
          <div className="rounded-xl border border-[#f4f4f5] bg-[#fafafa]/80 px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Best Platform</p>
            <p className="mt-1 text-[18px] font-semibold text-slate-900">
              {formatBestPlatformLabel(overview.best_platform ?? summary.topPlatform)}
            </p>
          </div>
        </div>
        <p className="mt-4 text-[12px] text-slate-500">
          {summary.postingCadence} · {summary.totalPosts} posts tracked · best format:{" "}
          {overview.best_post_type ?? "image"}
        </p>
      </section>

      <DemoInsightSection
        title="What's Working"
        items={insight.whats_working}
        linkedPosts={posts}
        socials={socials}
        tone="emerald"
      />
      <DemoInsightSection
        title="What's Flopping"
        items={insight.whats_flopping}
        linkedPosts={posts}
        socials={socials}
        tone="rose"
      />

      <section className="rounded-2xl border border-[#ececef] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <h3 className="text-[13px] font-semibold uppercase tracking-wide text-slate-500">Top Collaborators</h3>
        <div className="mt-4 space-y-3">
          {insight.top_collaborators.map((collab) => (
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
                  {collab.collab_types.map((t) => (
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
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-[#ececef] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-amber-500" />
          <h3 className="text-[13px] font-semibold uppercase tracking-wide text-slate-500">Hot Right Now</h3>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {insight.hot_right_now.slice(0, 3).map((hot) => {
            const post = posts.find((p) => p.post_id === hot.post_id);
            return (
              <HotPostCard key={hot.post_id} hot={hot} post={post ?? null} socials={socials} />
            );
          })}
        </div>
      </section>
    </div>
  );
}

export function DemoOrganicSettingsView({ domain }: { domain: string }) {
  const socials = useMemo(() => getDemoOrganicSocials(domain), [domain]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#ececef] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <h3 className="text-[15px] font-semibold text-slate-900">Social Accounts</h3>
        <p className="mt-1 text-[13px] text-slate-600">
          Read-only demo — competitor social handles appear active and scraped on schedule.
        </p>

        <div className="mt-5 space-y-4">
          {ORGANIC_PLATFORMS.map((platform) => {
            const value = socials[platform] ?? "";
            const isActive = Boolean(value.trim());
            return (
              <label key={platform} className="block">
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="text-[13px] font-medium text-slate-800">
                    {ORGANIC_PLATFORM_LABELS[platform]}
                  </span>
                  {isActive ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Tracking active
                    </span>
                  ) : null}
                </div>
                <input
                  readOnly
                  type="text"
                  value={value}
                  placeholder={ORGANIC_PLATFORM_PLACEHOLDERS[platform]}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[14px] text-slate-900"
                />
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
