"use client";

import { Flame } from "lucide-react";

import type { OrganicPlatform, OrganicSocials } from "@/lib/organic-content/types";
import { cn } from "@/lib/utils";

import type { OrganicPostCardData } from "./OrganicPostCard";
import {
  AuthorAvatar,
  formatRelativeTime,
  MediaFrame,
  PlatformChrome,
  PostExternalLinkIcon,
  resolveAuthor,
} from "./platform-cards/shared";
import { formatEngagementCount, OrganicPlatformBadge } from "./organic-ui-utils";

type HotPostCardProps = {
  hot: {
    post_id: string;
    platform: string;
    engagement_total: number;
    summary: string;
  };
  post?: OrganicPostCardData | null;
  socials?: OrganicSocials;
  /** Compact tile for insight sections — 2–3 per row */
  variant?: "default" | "compact";
  onPostClick?: (post: OrganicPostCardData) => void;
};

function normalizeDisplayText(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/[\u2080-\u2089]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x2080 + 0x30))
    .replace(/[\u2090-\u2099]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x2090 + 0x30))
    .replace(/\s+/g, " ")
    .trim();
}

export function HotPostCard({ hot, post, socials, variant = "default", onPostClick }: HotPostCardProps) {
  const platform = post?.platform ?? hot.platform;
  const isCompact = variant === "compact";
  const isTikTok = platform === "tiktok";
  const author = post ? resolveAuthor(post, socials) : null;
  const thumbnail = post?.media_urls?.[0]?.trim() || null;
  const postUrl = post?.post_url?.trim() || null;
  const summary = normalizeDisplayText(
    hot.summary || post?.content?.slice(0, 160) || "High-engagement post",
  );
  const isVertical =
    !isCompact &&
    (post?.media_aspect === "vertical" || post?.product_type === "clips" || platform === "tiktok");

  const likes = post?.likes ?? 0;
  const comments = post?.comments ?? 0;
  const views = post?.views ?? 0;
  const engagement = hot.engagement_total || likes + comments + (post?.shares ?? 0);
  const handle = author?.handleLabel ?? (author?.username ? `@${author.username}` : null);

  if (isCompact) {
    return (
      <article
        className={cn(
          "flex min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md",
          post && onPostClick && "cursor-pointer",
        )}
        onClick={post && onPostClick ? () => onPostClick(post) : undefined}
        onKeyDown={
          post && onPostClick
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onPostClick(post);
                }
              }
            : undefined
        }
        role={post && onPostClick ? "button" : undefined}
        tabIndex={post && onPostClick ? 0 : undefined}
      >
        <div className="relative aspect-[4/5] max-h-[160px] w-full overflow-hidden bg-slate-100">
          {thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbnail}
              alt=""
              className="h-full w-full object-cover object-center"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200" />
          )}
          <div className="absolute left-2 top-2">
            <OrganicPlatformBadge
              platform={platform}
              className="scale-90 bg-white/95 shadow-sm backdrop-blur-sm"
            />
          </div>
          {postUrl ? (
            <div className="absolute right-2 top-2">
              <PostExternalLinkIcon
                platform={platform}
                postUrl={postUrl}
                className="h-7 w-7 rounded-md bg-white/95 shadow-sm backdrop-blur-sm"
              />
            </div>
          ) : null}
        </div>
        <div className="space-y-1 p-2.5">
          {handle ? (
            <p className="truncate text-[11px] font-semibold text-slate-800">{handle}</p>
          ) : null}
          <p className="flex items-center gap-1 text-[11px] font-semibold text-amber-700">
            <Flame className="h-3 w-3 shrink-0" />
            {formatEngagementCount(engagement)}
          </p>
        </div>
      </article>
    );
  }

  return (
    <PlatformChrome
      platform={platform}
      variant="section"
      showPlatformBar
      dark={isTikTok}
      className={cn(isTikTok && "ring-1 ring-black/80")}
      onClick={post && onPostClick ? () => onPostClick(post) : undefined}
    >
      {author ? (
        <header
          className={cn(
            "flex items-center gap-2.5 border-b px-3 py-2.5",
            isTikTok ? "border-white/10" : "border-slate-100",
          )}
        >
          <AuthorAvatar
            name={author.displayName}
            avatarUrl={author.avatarUrl}
            className="h-8 w-8 shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                "truncate text-[13px] font-semibold",
                isTikTok ? "text-white" : "text-slate-900",
              )}
            >
              {author.handleLabel ?? author.displayName ?? "Unknown"}
            </p>
            {author.displayName && author.username && author.displayName !== author.username ? (
              <p className={cn("truncate text-[11px]", isTikTok ? "text-white/60" : "text-slate-500")}>
                {author.displayName}
              </p>
            ) : null}
          </div>
          <PostExternalLinkIcon platform={platform} postUrl={postUrl} dark={isTikTok} />
        </header>
      ) : null}

      <MediaFrame
        src={thumbnail}
        platform={platform as OrganicPlatform}
        aspect={isVertical ? "vertical" : (post?.media_aspect ?? "square")}
        capVerticalHeight
        className={isTikTok ? "bg-black" : undefined}
      />

      <div
        className={cn(
          "flex flex-1 flex-col gap-2.5 p-3.5",
          isTikTok ? "bg-black text-white" : "bg-white",
        )}
      >
        <p
          className={cn(
            "line-clamp-2 text-[14px] font-semibold leading-snug",
            isTikTok ? "text-white" : "text-slate-900",
          )}
        >
          {summary}
        </p>

        <div className="mt-auto space-y-2">
          <div className="flex items-center gap-1.5">
            <Flame className="h-3.5 w-3.5 shrink-0 text-amber-500" />
            <p className="text-[13px] font-semibold text-amber-600">
              {formatEngagementCount(engagement)} total engagement
            </p>
          </div>

          <div
            className={cn(
              "flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px]",
              isTikTok ? "text-white/65" : "text-slate-500",
            )}
          >
            {likes > 0 ? <span>{formatEngagementCount(likes)} likes</span> : null}
            {comments > 0 ? <span>{formatEngagementCount(comments)} comments</span> : null}
            {views > 0 ? <span>{formatEngagementCount(views)} views</span> : null}
            {post?.posted_at ? (
              <span className={isTikTok ? "text-white/45" : "text-slate-400"}>
                {formatRelativeTime(post.posted_at)}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </PlatformChrome>
  );
}
