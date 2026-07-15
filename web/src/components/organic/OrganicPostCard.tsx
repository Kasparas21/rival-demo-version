"use client";

import { Bookmark, BookmarkCheck } from "lucide-react";
import type { ReactNode } from "react";

import type { OrganicMediaAspect } from "@/lib/organic-content/post-display";
import type { OrganicSocials } from "@/lib/organic-content/types";
import { cn } from "@/lib/utils";

import { FacebookPostCard } from "./platform-cards/facebook-post-card";
import { InstagramPostCard } from "./platform-cards/instagram-post-card";
import { LinkedInPostCard } from "./platform-cards/linkedin-post-card";
import { TikTokPostCard } from "./platform-cards/tiktok-post-card";
import { XPostCard } from "./platform-cards/x-post-card";
import { YouTubePostCard } from "./platform-cards/youtube-post-card";

export type OrganicPostCardData = {
  id: string;
  platform: string;
  post_id: string;
  content: string | null;
  media_urls: string[];
  likes: number;
  comments: number;
  shares: number;
  views?: number;
  posted_at: string | null;
  post_url?: string | null;
  product_type?: string | null;
  author_username?: string | null;
  author_display_name?: string | null;
  author_avatar_url?: string | null;
  media_aspect?: OrganicMediaAspect;
};

export type OrganicPostSaveProps = {
  isSaved: boolean;
  onToggle: () => void;
};

export function OrganicPostCard({
  post,
  socials,
  highlightEngagement,
  className,
  variant = "section",
  onPostClick,
  save,
}: {
  post: OrganicPostCardData;
  socials?: OrganicSocials;
  highlightEngagement?: boolean;
  className?: string;
  variant?: "standalone" | "section";
  onPostClick?: (post: OrganicPostCardData) => void;
  save?: OrganicPostSaveProps;
}) {
  const props = { post, socials, highlightEngagement, className: cn(className), variant, onPostClick };

  let card: ReactNode;
  switch (post.platform) {
    case "instagram":
      card = <InstagramPostCard {...props} />;
      break;
    case "twitter":
      card = <XPostCard {...props} />;
      break;
    case "linkedin":
      card = <LinkedInPostCard {...props} />;
      break;
    case "tiktok":
      card = <TikTokPostCard {...props} />;
      break;
    case "youtube":
      card = <YouTubePostCard {...props} />;
      break;
    case "facebook":
      card = <FacebookPostCard {...props} />;
      break;
    default:
      card = <InstagramPostCard {...props} />;
  }

  if (!save) return <>{card}</>;

  return (
    <div className="group/organic-save relative">
      {card}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          save.onToggle();
        }}
        aria-label={save.isSaved ? "Unsave post" : "Save post"}
        title={save.isSaved ? "Remove from Saved" : "Save to your collection"}
        className={cn(
          "absolute right-2 top-2 z-10 inline-flex items-center justify-center rounded-lg border p-1.5 shadow-sm transition",
          save.isSaved
            ? "border-sky-200 bg-sky-50 text-sky-800 opacity-100 hover:bg-sky-100"
            : "border-slate-200 bg-white/95 text-slate-500 opacity-0 hover:border-slate-300 hover:text-slate-800 group-hover/organic-save:opacity-100 focus-visible:opacity-100",
        )}
      >
        {save.isSaved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
      </button>
    </div>
  );
}
