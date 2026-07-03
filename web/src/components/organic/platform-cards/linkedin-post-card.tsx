"use client";

import { Globe, MessageCircle, Repeat2, Send, ThumbsUp } from "lucide-react";

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

export function LinkedInPostCard({
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
      platform="linkedin"
      variant={variant}
      className={cn(highlightEngagement && "ring-2 ring-amber-300", className)}
      onClick={onPostClick ? () => onPostClick(post) : undefined}
    >
      <header className="flex items-start gap-2.5 px-3 py-3">
        <AuthorAvatar name={author.displayName} avatarUrl={author.avatarUrl} className="h-12 w-12" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold text-[#0a0a0a]">{author.displayName ?? author.username}</p>
          {author.handleLabel ? <p className="truncate text-[12px] text-[#666]">{author.handleLabel}</p> : null}
          <div className="mt-0.5 flex items-center gap-1 text-[12px] text-[#666]">
            <time>{formatRelativeTime(post.posted_at)}</time>
            <span>·</span>
            <Globe className="h-3 w-3" aria-hidden />
          </div>
        </div>
        {isSection ? <PostExternalLinkIcon platform="linkedin" postUrl={post.post_url} /> : null}
      </header>

      {content ? (
        <div className="px-3 pb-2">
          <ExpandableCaption content={content} className="text-[14px] text-[#0a0a0a]" />
        </div>
      ) : null}

      <MediaFrame
        src={thumbnail}
        platform="linkedin"
        aspect={post.media_aspect ?? "landscape"}
        capVerticalHeight={isSection}
      />

      <div className="border-t border-[#e0e0e0] px-3 py-2">
        <p className="text-[12px] text-[#666]">
          <EngagementCount value={post.likes} /> reactions · <EngagementCount value={post.comments} /> comments
        </p>
      </div>

      {!isSection ? (
        <>
          <div className="grid grid-cols-4 border-t border-[#e0e0e0] px-1 py-1 text-[#666]">
            {[
              { icon: ThumbsUp, label: "Like" },
              { icon: MessageCircle, label: "Comment" },
              { icon: Repeat2, label: "Repost" },
              { icon: Send, label: "Send" },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-0.5 rounded px-1 py-2 text-[11px] font-semibold"
              >
                <Icon className="h-4 w-4" />
                {label}
              </div>
            ))}
          </div>
          <div className="border-t border-[#e0e0e0] px-3 py-2">
            <ExternalPlatformLink platform="linkedin" postUrl={post.post_url} />
          </div>
        </>
      ) : null}
    </PlatformChrome>
  );
}
