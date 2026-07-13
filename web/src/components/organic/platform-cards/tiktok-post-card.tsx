"use client";

import { Heart, MessageCircle, Music2, Share2 } from "lucide-react";

import { cn } from "@/lib/utils";

import {
  EngagementCount,
  ExternalPlatformLink,
  PlatformChrome,
  PostExternalLinkIcon,
  resolveAuthor,
  type PlatformCardProps,
} from "./shared";
import { OrganicPostMedia } from "./organic-post-media";

export function TikTokPostCard({
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
      platform="tiktok"
      dark
      variant={variant}
      className={cn(highlightEngagement && "ring-2 ring-amber-300", className)}
      onClick={onPostClick ? () => onPostClick(post) : undefined}
    >
      <div className="relative">
        {isSection ? (
          <div className="absolute right-2.5 top-2.5 z-20">
            <PostExternalLinkIcon platform="tiktok" postUrl={post.post_url} dark />
          </div>
        ) : null}
        <OrganicPostMedia
          platform="tiktok"
          mediaUrls={post.media_urls}
          productType={post.product_type}
          mediaAspect="vertical"
          variant={variant}
          capVerticalHeight={isSection}
          className="bg-black"
          overlay={
            <>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent px-3 pb-4 pt-16">
                <p className="text-[14px] font-bold text-white">
                  {author.handleLabel ?? author.displayName ?? "Unknown"}
                </p>
                {content ? (
                  <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-white/95">{content}</p>
                ) : null}
                <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1 text-[11px] text-white">
                  <Music2 className="h-3 w-3" />
                  Original sound
                </div>
              </div>

              <div className="absolute bottom-16 right-2 flex flex-col items-center gap-4 text-white">
                <div className="flex flex-col items-center gap-1 text-[11px]">
                  <Heart className="h-7 w-7" />
                  <EngagementCount value={post.likes} />
                </div>
                <div className="flex flex-col items-center gap-1 text-[11px]">
                  <MessageCircle className="h-7 w-7" />
                  <EngagementCount value={post.comments} />
                </div>
                <div className="flex flex-col items-center gap-1 text-[11px]">
                  <Share2 className="h-7 w-7" />
                  <EngagementCount value={post.shares} />
                </div>
              </div>

              {(post.views ?? 0) > 0 ? (
                <div className="absolute left-3 top-3 rounded bg-black/50 px-2 py-0.5 text-[11px] text-white">
                  <EngagementCount value={post.views ?? 0} /> views
                </div>
              ) : null}
            </>
          }
        />
      </div>

      {!isSection ? (
        <div className="border-t border-white/10 px-3 py-2">
          <ExternalPlatformLink platform="tiktok" postUrl={post.post_url} className="text-white/80 hover:text-white" />
        </div>
      ) : null}
    </PlatformChrome>
  );
}
