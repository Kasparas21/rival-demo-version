"use client";

import { BarChart2, Heart, MessageCircle, Repeat2, Share } from "lucide-react";

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

export function XPostCard({
  post,
  socials,
  highlightEngagement,
  className,
  variant = "section",
  onPostClick,
}: PlatformCardProps) {
  const author = resolveAuthor(post, socials);
  const content = post.content?.trim() ?? "";
  const thumbnail = post.media_urls[0] ?? null;
  const isSection = variant === "section";

  return (
    <PlatformChrome
      platform="twitter"
      variant={variant}
      className={cn(highlightEngagement && "ring-2 ring-amber-300", className)}
      onClick={onPostClick ? () => onPostClick(post) : undefined}
    >
      <div className="flex gap-3 px-3 py-3">
        <AuthorAvatar name={author.displayName} avatarUrl={author.avatarUrl} className="h-10 w-10 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-1 text-[14px] leading-tight">
                <span className="font-bold text-black">{author.displayName ?? author.username}</span>
                {author.handleLabel ? <span className="text-slate-500">{author.handleLabel}</span> : null}
                <span className="text-slate-500">·</span>
                <time className="text-slate-500">{formatRelativeTime(post.posted_at)}</time>
              </div>
            </div>
            {isSection ? <PostExternalLinkIcon platform="twitter" postUrl={post.post_url} /> : null}
          </div>

          {content ? (
            <ExpandableCaption content={content} className="mt-1 whitespace-pre-wrap text-[15px] text-black" />
          ) : null}

          {thumbnail ? (
            <div className="mt-3 overflow-hidden rounded-2xl border border-[#eff3f4]">
              <MediaFrame
                src={thumbnail}
                platform="twitter"
                aspect={post.media_aspect ?? "landscape"}
                capVerticalHeight={isSection}
              />
            </div>
          ) : null}

          <div className="mt-3 flex max-w-[360px] justify-between text-slate-500">
            <span className="inline-flex items-center gap-1.5 text-[12px]">
              <MessageCircle className="h-4 w-4" />
              <EngagementCount value={post.comments} />
            </span>
            <span className="inline-flex items-center gap-1.5 text-[12px]">
              <Repeat2 className="h-4 w-4" />
              <EngagementCount value={post.shares} />
            </span>
            <span className="inline-flex items-center gap-1.5 text-[12px]">
              <Heart className="h-4 w-4" />
              <EngagementCount value={post.likes} />
            </span>
            <span className="inline-flex items-center gap-1.5 text-[12px]">
              <BarChart2 className="h-4 w-4" />
              <EngagementCount value={post.views ?? 0} />
            </span>
            <Share className="h-4 w-4" />
          </div>

          {!isSection ? (
            <ExternalPlatformLink platform="twitter" postUrl={post.post_url} className="mt-2 inline-block" />
          ) : null}
        </div>
      </div>
    </PlatformChrome>
  );
}
