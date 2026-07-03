"use client";

import { Bookmark, Heart, MessageCircle, MoreHorizontal, Send } from "lucide-react";

import { cn } from "@/lib/utils";

import {
  AuthorAvatar,
  EngagementCount,
  ExpandableCaption,
  ExternalPlatformLink,
  formatRelativeTime,
  MediaFrame,
  PlatformChrome,
  PostExternalLinkIcon,
  resolveAuthor,
  type PlatformCardProps,
} from "./shared";

export function InstagramPostCard({
  post,
  socials,
  highlightEngagement,
  className,
  variant = "section",
  onPostClick,
}: PlatformCardProps) {
  const author = resolveAuthor(post, socials);
  const isReel = post.product_type === "clips" || post.media_aspect === "vertical";
  const content = post.content?.trim() ?? "";
  const thumbnail = post.media_urls[0] ?? null;
  const isSection = variant === "section";

  return (
    <PlatformChrome
      platform="instagram"
      variant={variant}
      className={cn(highlightEngagement && "ring-2 ring-amber-300", className)}
      onClick={onPostClick ? () => onPostClick(post) : undefined}
    >
      <header className="flex items-center gap-2.5 px-3 py-2.5">
        <AuthorAvatar name={author.displayName} avatarUrl={author.avatarUrl} className="h-8 w-8" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-black">{author.username ?? author.displayName}</p>
          {author.displayName && author.username ? (
            <p className="truncate text-[11px] text-slate-500">{author.displayName}</p>
          ) : null}
        </div>
        {isSection ? (
          <PostExternalLinkIcon platform="instagram" postUrl={post.post_url} />
        ) : (
          <MoreHorizontal className="h-5 w-5 shrink-0 text-black" aria-hidden />
        )}
      </header>

      <MediaFrame
        src={thumbnail}
        platform="instagram"
        aspect={isReel ? "vertical" : post.media_aspect ?? "square"}
        capVerticalHeight={isSection}
        overlay={
          isReel ? (
            <span className="absolute bottom-3 left-3 rounded bg-black/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
              Reels
            </span>
          ) : null
        }
      />

      <div className="space-y-2 px-3 py-2.5">
        {!isSection ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Heart className="h-6 w-6" strokeWidth={1.5} aria-hidden />
              <MessageCircle className="h-6 w-6" strokeWidth={1.5} aria-hidden />
              <Send className="h-6 w-6" strokeWidth={1.5} aria-hidden />
            </div>
            <Bookmark className="h-6 w-6" strokeWidth={1.5} aria-hidden />
          </div>
        ) : null}

        <p className="text-[13px] font-semibold text-black">
          <EngagementCount value={post.likes} /> likes
        </p>

        {isReel && (post.views ?? 0) > 0 ? (
          <p className="text-[12px] text-slate-600">
            <EngagementCount value={post.views ?? 0} /> views
          </p>
        ) : null}

        {content ? (
          <ExpandableCaption content={content} username={author.username} className="text-black" />
        ) : null}

        {!isSection && post.comments > 0 ? (
          <p className="text-[12px] text-slate-500">
            View all <EngagementCount value={post.comments} /> comments
          </p>
        ) : null}

        <time className="block text-[10px] uppercase tracking-wide text-slate-400">
          {formatRelativeTime(post.posted_at)}
        </time>

        {!isSection ? <ExternalPlatformLink platform="instagram" postUrl={post.post_url} /> : null}
      </div>
    </PlatformChrome>
  );
}
