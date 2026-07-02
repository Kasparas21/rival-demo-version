"use client";

import { BarChart2, Heart, MessageCircle, Repeat2, Share } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

import {
  AuthorAvatar,
  ExternalPlatformLink,
  formatRelativeTime,
  MediaFrame,
  PlatformChrome,
  resolveAuthor,
  EngagementCount,
  type PlatformCardProps,
} from "./shared";

export function XPostCard({ post, socials, highlightEngagement, className }: PlatformCardProps) {
  const [expanded, setExpanded] = useState(false);
  const author = resolveAuthor(post, socials);
  const content = post.content?.trim() ?? "";
  const thumbnail = post.media_urls[0] ?? null;
  const showExpand = content.length > 280;

  return (
    <PlatformChrome platform="twitter" className={cn(highlightEngagement && "ring-2 ring-amber-300", className)}>
      <div className="flex gap-3 px-3 py-3">
        <AuthorAvatar name={author.displayName} avatarUrl={author.avatarUrl} className="h-10 w-10 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-1 text-[14px] leading-tight">
            <span className="font-bold text-black">{author.displayName ?? author.username}</span>
            {author.handleLabel ? <span className="text-slate-500">{author.handleLabel}</span> : null}
            <span className="text-slate-500">·</span>
            <time className="text-slate-500">{formatRelativeTime(post.posted_at)}</time>
          </div>

          {content ? (
            <p className={cn("mt-1 whitespace-pre-wrap text-[15px] leading-snug text-black", !expanded && showExpand && "line-clamp-6")}>
              {content}
            </p>
          ) : null}
          {showExpand ? (
            <button type="button" onClick={() => setExpanded((v) => !v)} className="mt-1 text-[13px] text-sky-600">
              {expanded ? "Show less" : "Show more"}
            </button>
          ) : null}

          {thumbnail ? (
            <div className="mt-3 overflow-hidden rounded-2xl border border-[#eff3f4]">
              <MediaFrame src={thumbnail} aspect={post.media_aspect ?? "landscape"} />
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

          <ExternalPlatformLink platform="twitter" postUrl={post.post_url} className="mt-2 inline-block" />
        </div>
      </div>
    </PlatformChrome>
  );
}
