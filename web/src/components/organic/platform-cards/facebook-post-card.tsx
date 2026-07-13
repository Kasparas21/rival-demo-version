"use client";

import { Globe, MessageCircle, Share2, ThumbsUp } from "lucide-react";

import { cn } from "@/lib/utils";

import {
  AuthorAvatar,
  EngagementCount,
  ExpandableCaption,
  ExternalPlatformLink,
  formatRelativeTime,
  PlatformChrome,
  PostExternalLinkIcon,
  resolveAuthor,
  type PlatformCardProps,
} from "./shared";
import { OrganicPostMedia } from "./organic-post-media";

export function FacebookPostCard({
  post,
  socials,
  highlightEngagement,
  className,
  variant = "section",
  onPostClick,
}: PlatformCardProps) {
  const author = resolveAuthor(post, socials);
  const content = post.content?.trim() ?? "";
  const isSection = variant === "section";

  return (
    <PlatformChrome
      platform="facebook"
      variant={variant}
      standaloneMaxWidthClass={variant === "standalone" ? "max-w-[560px]" : undefined}
      className={cn(highlightEngagement && "ring-2 ring-amber-300", className)}
      onClick={onPostClick ? () => onPostClick(post) : undefined}
    >
      <header className="flex items-center gap-2.5 px-3 py-3">
        <AuthorAvatar name={author.displayName} avatarUrl={author.avatarUrl} className="h-10 w-10" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-[#050505]">{author.displayName ?? author.username}</p>
          <div className="flex items-center gap-1 text-[12px] text-[#65676b]">
            <time>{formatRelativeTime(post.posted_at)}</time>
            <span>·</span>
            <Globe className="h-3 w-3" aria-hidden />
          </div>
        </div>
        {isSection ? <PostExternalLinkIcon platform="facebook" postUrl={post.post_url} /> : null}
      </header>

      {content ? (
        <div className="px-3 pb-3">
          <ExpandableCaption content={content} className="text-[15px] text-[#050505]" />
        </div>
      ) : null}

      <OrganicPostMedia
        platform="facebook"
        mediaUrls={post.media_urls}
        productType={post.product_type}
        mediaAspect={post.media_aspect ?? "landscape"}
        variant={variant}
      />

      <div className="flex items-center justify-between border-b border-[#dddfe2] px-3 py-2 text-[13px] text-[#65676b]">
        <span>
          <EngagementCount value={post.likes} /> likes
        </span>
        <span>
          <EngagementCount value={post.comments} /> comments · <EngagementCount value={post.shares} /> shares
        </span>
      </div>

      {!isSection ? (
        <>
          <div className="grid grid-cols-3 px-2 py-1 text-[#65676b]">
            {[
              { icon: ThumbsUp, label: "Like" },
              { icon: MessageCircle, label: "Comment" },
              { icon: Share2, label: "Share" },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center justify-center gap-2 rounded px-2 py-2 text-[13px] font-semibold"
              >
                <Icon className="h-4 w-4" />
                {label}
              </div>
            ))}
          </div>
          <div className="border-t border-[#dddfe2] px-3 py-2">
            <ExternalPlatformLink platform="facebook" postUrl={post.post_url} />
          </div>
        </>
      ) : null}
    </PlatformChrome>
  );
}
