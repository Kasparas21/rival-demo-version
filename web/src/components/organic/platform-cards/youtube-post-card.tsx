"use client";

import { Play } from "lucide-react";

import { cn } from "@/lib/utils";

import {
  AuthorAvatar,
  EngagementCount,
  ExternalPlatformLink,
  formatRelativeTime,
  MediaFrame,
  PlatformChrome,
  PostExternalLinkIcon,
  resolveAuthor,
  type PlatformCardProps,
} from "./shared";

export function YouTubePostCard({
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
  const title = content.split("\n")[0] || "Untitled video";
  const isSection = variant === "section";

  return (
    <PlatformChrome
      platform="youtube"
      variant={variant}
      className={cn(highlightEngagement && "ring-2 ring-amber-300", className)}
      onClick={onPostClick ? () => onPostClick(post) : undefined}
    >
      <div className="relative">
        <MediaFrame
          src={thumbnail}
          platform="youtube"
          aspect={post.media_aspect ?? "landscape"}
          capVerticalHeight={isSection}
          overlay={
            <div className="absolute inset-0 flex items-center justify-center bg-black/10">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/75 text-white">
                <Play className="ml-0.5 h-5 w-5 fill-white" />
              </div>
            </div>
          }
        />
        {(post.views ?? 0) > 0 ? (
          <span className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-[11px] font-medium text-white">
            <EngagementCount value={post.views ?? 0} /> views
          </span>
        ) : null}
      </div>

      <div className="flex gap-3 px-3 py-3">
        <AuthorAvatar name={author.displayName} avatarUrl={author.avatarUrl} className="mt-0.5 h-9 w-9 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="line-clamp-2 text-[14px] font-semibold leading-snug text-[#0f0f0f]">{title}</h3>
              <p className="mt-1 truncate text-[12px] text-[#606060]">{author.displayName ?? author.username}</p>
              <p className="text-[12px] text-[#606060]">
                {(post.views ?? 0) > 0 ? (
                  <>
                    <EngagementCount value={post.views ?? 0} /> views
                  </>
                ) : null}
                {post.posted_at ? (
                  <>
                    {(post.views ?? 0) > 0 ? " · " : ""}
                    {formatRelativeTime(post.posted_at)} ago
                  </>
                ) : null}
              </p>
            </div>
            {isSection ? <PostExternalLinkIcon platform="youtube" postUrl={post.post_url} /> : null}
          </div>
          {!isSection ? (
            <ExternalPlatformLink platform="youtube" postUrl={post.post_url} className="mt-2 inline-block" />
          ) : null}
        </div>
      </div>
    </PlatformChrome>
  );
}
