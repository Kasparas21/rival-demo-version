"use client";

import { Globe, MessageCircle, Share2, ThumbsUp } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

import {
  AuthorAvatar,
  CaptionText,
  EngagementCount,
  ExternalPlatformLink,
  formatRelativeTime,
  MediaFrame,
  PlatformChrome,
  resolveAuthor,
  type PlatformCardProps,
} from "./shared";

export function FacebookPostCard({ post, socials, highlightEngagement, className }: PlatformCardProps) {
  const [expanded, setExpanded] = useState(false);
  const author = resolveAuthor(post, socials);
  const content = post.content?.trim() ?? "";
  const thumbnail = post.media_urls[0] ?? null;

  return (
    <PlatformChrome platform="facebook" className={cn(highlightEngagement && "ring-2 ring-amber-300", className)}>
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
      </header>

      {content ? (
        <div className="px-3 pb-3">
          <CaptionText
            content={content}
            username={null}
            expanded={expanded}
            onToggle={() => setExpanded((v) => !v)}
            maxLines={3}
            className="text-[15px] text-[#050505]"
          />
        </div>
      ) : null}

      {thumbnail ? <MediaFrame src={thumbnail} aspect={post.media_aspect ?? "landscape"} /> : null}

      <div className="flex items-center justify-between border-b border-[#dddfe2] px-3 py-2 text-[13px] text-[#65676b]">
        <span>
          <EngagementCount value={post.likes} /> likes
        </span>
        <span>
          <EngagementCount value={post.comments} /> comments · <EngagementCount value={post.shares} /> shares
        </span>
      </div>

      <div className="grid grid-cols-3 px-2 py-1 text-[#65676b]">
        {[
          { icon: ThumbsUp, label: "Like" },
          { icon: MessageCircle, label: "Comment" },
          { icon: Share2, label: "Share" },
        ].map(({ icon: Icon, label }) => (
          <button
            key={label}
            type="button"
            className="flex items-center justify-center gap-2 rounded px-2 py-2 text-[13px] font-semibold hover:bg-[#f2f3f5]"
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      <div className="border-t border-[#dddfe2] px-3 py-2">
        <ExternalPlatformLink platform="facebook" postUrl={post.post_url} />
      </div>
    </PlatformChrome>
  );
}
