"use client";

import type { ReactNode } from "react";

import {
  FacebookLogo,
  InstagramLogo,
  LinkedInLogo,
  TikTokLogo,
  XLogo,
  YouTubeLogo,
} from "@/components/platform-logos";
import type { OrganicMediaAspect } from "@/lib/organic-content/post-display";
import { ORGANIC_PLATFORM_LABELS } from "@/lib/organic-content/constants";
import type { OrganicPlatform, OrganicSocials } from "@/lib/organic-content/types";
import { cn } from "@/lib/utils";

import { formatEngagementCount } from "../organic-ui-utils";
import type { OrganicPostCardData } from "../OrganicPostCard";

export type PlatformCardProps = {
  post: OrganicPostCardData;
  socials?: OrganicSocials;
  highlightEngagement?: boolean;
  className?: string;
};

export function resolveAuthor(post: OrganicPostCardData, socials?: OrganicSocials) {
  const platform = post.platform as OrganicPlatform;
  const fallbackHandle = socials?.[platform]?.replace(/^@/, "").trim() ?? null;

  const username = post.author_username ?? fallbackHandle;
  const displayName = post.author_display_name ?? username;
  const avatarUrl = post.author_avatar_url ?? null;

  return {
    username,
    displayName,
    avatarUrl,
    handleLabel: username ? `@${username.replace(/^@/, "")}` : null,
  };
}

export function formatRelativeTime(iso: string | null): string {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 0) return "now";
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 60) return `${Math.max(1, minutes)}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w`;
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(iso));
}

export function AuthorAvatar({
  name,
  avatarUrl,
  className,
}: {
  name: string | null;
  avatarUrl: string | null;
  className?: string;
}) {
  const initial = (name ?? "?").replace(/^@/, "").charAt(0).toUpperCase();
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt=""
        className={cn("rounded-full object-cover bg-slate-200", className)}
        loading="lazy"
      />
    );
  }
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-gradient-to-br from-slate-300 to-slate-400 text-[11px] font-bold text-white",
        className,
      )}
    >
      {initial}
    </div>
  );
}

const PLATFORM_LINK_LABELS: Record<OrganicPlatform, string> = {
  instagram: "View on Instagram",
  twitter: "View on X",
  linkedin: "View on LinkedIn",
  tiktok: "View on TikTok",
  facebook: "View on Facebook",
  youtube: "View on YouTube",
};

export function ExternalPlatformLink({
  platform,
  postUrl,
  className,
}: {
  platform: string;
  postUrl: string | null | undefined;
  className?: string;
}) {
  if (!postUrl) return null;
  const label = PLATFORM_LINK_LABELS[platform as OrganicPlatform] ?? "View post";
  return (
    <a
      href={postUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cn("text-[12px] font-medium text-sky-600 hover:underline", className)}
    >
      {label} →
    </a>
  );
}

const PLATFORM_CHROME: Record<
  OrganicPlatform,
  { border: string; bg: string; Logo: React.ComponentType<{ className?: string }> }
> = {
  instagram: { border: "border-[#dbdbdb]", bg: "bg-white", Logo: InstagramLogo },
  twitter: { border: "border-[#eff3f4]", bg: "bg-white", Logo: XLogo },
  linkedin: { border: "border-[#e0e0e0]", bg: "bg-white", Logo: LinkedInLogo },
  tiktok: { border: "border-black", bg: "bg-black", Logo: TikTokLogo },
  facebook: { border: "border-[#dddfe2]", bg: "bg-white", Logo: FacebookLogo },
  youtube: { border: "border-[#e5e5e5]", bg: "bg-white", Logo: YouTubeLogo },
};

export function PlatformChrome({
  platform,
  children,
  className,
  dark = false,
}: {
  platform: string;
  children: ReactNode;
  className?: string;
  dark?: boolean;
}) {
  const key = platform as OrganicPlatform;
  const chrome = PLATFORM_CHROME[key] ?? PLATFORM_CHROME.instagram;
  const Logo = chrome.Logo;

  return (
    <article
      className={cn(
        "mx-auto w-full max-w-[420px] overflow-hidden border shadow-sm",
        dark ? "border-black bg-black text-white" : cn(chrome.border, chrome.bg),
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center gap-1.5 border-b px-3 py-1.5",
          dark ? "border-white/10 bg-black" : "border-inherit bg-inherit",
        )}
      >
        <Logo className="h-3.5 w-3.5 shrink-0" />
        <span className={cn("text-[10px] font-semibold uppercase tracking-wide", dark ? "text-white/70" : "text-slate-500")}>
          {ORGANIC_PLATFORM_LABELS[key] ?? platform}
        </span>
      </div>
      {children}
    </article>
  );
}

export function MediaFrame({
  src,
  aspect,
  className,
  overlay,
}: {
  src: string | null;
  aspect: OrganicMediaAspect;
  className?: string;
  overlay?: ReactNode;
}) {
  if (!src) return null;
  const aspectClass =
    aspect === "vertical" ? "aspect-[9/16]" : aspect === "square" ? "aspect-square" : "aspect-video";

  return (
    <div className={cn("relative w-full overflow-hidden bg-black/5", aspectClass, className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
      {overlay}
    </div>
  );
}

export function EngagementCount({ value }: { value: number }) {
  return <span>{formatEngagementCount(value)}</span>;
}

export function CaptionText({
  content,
  username,
  expanded,
  onToggle,
  maxLines = 2,
  className,
}: {
  content: string;
  username: string | null;
  expanded: boolean;
  onToggle?: () => void;
  maxLines?: number;
  className?: string;
}) {
  const showToggle = content.length > 120;
  return (
    <div className={className}>
      <p className={cn("text-[13px] leading-snug", !expanded && maxLines === 2 && "line-clamp-2")}>
        {username ? <span className="font-semibold">{username} </span> : null}
        {content}
      </p>
      {showToggle && onToggle ? (
        <button type="button" onClick={onToggle} className="mt-0.5 text-[12px] text-slate-500">
          {expanded ? "less" : "more"}
        </button>
      ) : null}
    </div>
  );
}
