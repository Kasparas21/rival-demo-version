"use client";

import { Globe, MessageCircle, Repeat2, Send, ThumbsUp } from "lucide-react";
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

export function LinkedInPostCard({ post, socials, highlightEngagement, className }: PlatformCardProps) {
  const [expanded, setExpanded] = useState(false);
  const author = resolveAuthor(post, socials);
  const content = post.content?.trim() ?? "";
  const thumbnail = post.media_urls[0] ?? null;

  return (
    <PlatformChrome platform="linkedin" className={cn(highlightEngagement && "ring-2 ring-amber-300", className)}>
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
      </header>

      {content ? (
        <div className="px-3 pb-2">
          <CaptionText
            content={content}
            username={null}
            expanded={expanded}
            onToggle={() => setExpanded((v) => !v)}
            maxLines={3}
            className="text-[14px] text-[#0a0a0a]"
          />
        </div>
      ) : null}

      {thumbnail ? <MediaFrame src={thumbnail} aspect={post.media_aspect ?? "landscape"} /> : null}

      <div className="border-t border-[#e0e0e0] px-3 py-2">
        <p className="text-[12px] text-[#666]">
          <EngagementCount value={post.likes} /> reactions · <EngagementCount value={post.comments} /> comments
        </p>
      </div>

      <div className="grid grid-cols-4 border-t border-[#e0e0e0] px-1 py-1 text-[#666]">
        {[
          { icon: ThumbsUp, label: "Like" },
          { icon: MessageCircle, label: "Comment" },
          { icon: Repeat2, label: "Repost" },
          { icon: Send, label: "Send" },
        ].map(({ icon: Icon, label }) => (
          <button
            key={label}
            type="button"
            className="flex flex-col items-center gap-0.5 rounded px-1 py-2 text-[11px] font-semibold hover:bg-slate-50"
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      <div className="border-t border-[#e0e0e0] px-3 py-2">
        <ExternalPlatformLink platform="linkedin" postUrl={post.post_url} />
      </div>
    </PlatformChrome>
  );
}
