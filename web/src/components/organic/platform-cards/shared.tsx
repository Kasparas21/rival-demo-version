"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";

import { ExpandableAdText } from "@/components/ads-library/expandable-ad-text";
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

export type OrganicCardVariant = "standalone" | "section";

export type PlatformCardProps = {
  post: OrganicPostCardData;
  socials?: OrganicSocials;
  highlightEngagement?: boolean;
  className?: string;
  variant?: OrganicCardVariant;
  onPostClick?: (post: OrganicPostCardData) => void;
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

function isLoadableImageUrl(url: string | null | undefined): url is string {
  const trimmed = url?.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function AuthorAvatar({
  avatarUrl,
  className,
}: {
  name?: string | null;
  avatarUrl: string | null;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  const src = isLoadableImageUrl(avatarUrl) ? avatarUrl.trim() : null;

  useEffect(() => {
    setBroken(false);
  }, [src]);

  if (!src || broken) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className={cn("rounded-full object-cover", className)}
      loading="lazy"
      onError={() => setBroken(true)}
    />
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

export function PostExternalLinkIcon({
  platform,
  postUrl,
  className,
  dark = false,
}: {
  platform: string;
  postUrl: string | null | undefined;
  className?: string;
  dark?: boolean;
}) {
  if (!postUrl) return null;
  const label = PLATFORM_LINK_LABELS[platform as OrganicPlatform] ?? "View post";
  return (
    <a
      href={postUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
        dark
          ? "text-white/80 hover:bg-white/10 hover:text-white"
          : "text-slate-500 hover:bg-slate-100 hover:text-slate-700",
        className,
      )}
    >
      <ExternalLink className="h-4 w-4" />
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
  variant = "section",
  showPlatformBar,
  onClick,
}: {
  platform: string;
  children: ReactNode;
  className?: string;
  dark?: boolean;
  variant?: OrganicCardVariant;
  /** Show logo + platform label bar in section mode (e.g. Hot Right Now cards). */
  showPlatformBar?: boolean;
  onClick?: () => void;
}) {
  const key = platform as OrganicPlatform;
  const chrome = PLATFORM_CHROME[key] ?? PLATFORM_CHROME.instagram;
  const Logo = chrome.Logo;
  const isSection = variant === "section";
  const showBar = showPlatformBar ?? !isSection;

  return (
    <article
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={cn(
        "relative w-full overflow-hidden border",
        isSection
          ? "rounded-2xl transition-shadow hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)] hover:ring-2 hover:ring-slate-200"
          : "mx-auto max-w-[420px] rounded-none shadow-sm",
        onClick && "cursor-pointer",
        dark ? "border-black bg-black text-white" : cn(chrome.border, chrome.bg),
        className,
      )}
    >
      {showBar ? (
        <div
          className={cn(
            "flex items-center gap-1.5 border-b px-3 py-2",
            dark ? "border-white/10 bg-black" : "border-inherit bg-inherit",
          )}
        >
          <Logo className="h-4 w-4 shrink-0" />
          <span
            className={cn(
              "text-[11px] font-semibold uppercase tracking-wide",
              dark ? "text-white/90" : "text-slate-600",
            )}
          >
            {ORGANIC_PLATFORM_LABELS[key] ?? platform}
          </span>
        </div>
      ) : null}
      {children}
    </article>
  );
}

export function MediaFrame({
  src,
  aspect,
  platform,
  className,
  overlay,
  capVerticalHeight = false,
}: {
  src: string | null;
  aspect: OrganicMediaAspect;
  platform?: OrganicPlatform;
  className?: string;
  overlay?: ReactNode;
  capVerticalHeight?: boolean;
}) {
  const [broken, setBroken] = useState(false);
  const showPlaceholder = !src || broken;
  const aspectClass =
    aspect === "vertical" ? "aspect-[9/16]" : aspect === "square" ? "aspect-square" : "aspect-video";
  const heightCap =
    capVerticalHeight && aspect === "vertical" ? "max-h-[420px] [&_img]:object-cover" : "";

  if (showPlaceholder) {
    const Logo = platform ? PLATFORM_CHROME[platform]?.Logo : null;
    return (
      <div
        className={cn(
          "relative flex w-full min-h-[180px] flex-col items-center justify-center gap-2 bg-[#f3f4f6]",
          aspectClass,
          heightCap,
          className,
        )}
      >
        {Logo ? <Logo className="h-8 w-8 opacity-40" /> : null}
        <span className="text-[12px] font-medium text-[#94a3b8]">No preview</span>
      </div>
    );
  }

  return (
    <div className={cn("relative w-full overflow-hidden bg-black/5", aspectClass, heightCap, className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        className="h-full w-full object-cover"
        loading="lazy"
        onError={() => setBroken(true)}
      />
      {overlay}
    </div>
  );
}

export function EngagementCount({ value }: { value: number }) {
  return <span>{formatEngagementCount(value)}</span>;
}

export function ExpandableCaption({
  content,
  username,
  className,
}: {
  content: string;
  username?: string | null;
  className?: string;
}) {
  const text = username ? `${username} ${content}` : content;
  return (
    <ExpandableAdText
      text={text}
      className={cn("text-[13px] leading-snug text-inherit", className)}
      scrollWhenExpanded={false}
    />
  );
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
