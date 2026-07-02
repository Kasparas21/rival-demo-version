"use client";

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

export function OrganicPostCard({
  post,
  socials,
  highlightEngagement,
  className,
}: {
  post: OrganicPostCardData;
  socials?: OrganicSocials;
  highlightEngagement?: boolean;
  className?: string;
}) {
  const props = { post, socials, highlightEngagement, className: cn(className) };

  switch (post.platform) {
    case "instagram":
      return <InstagramPostCard {...props} />;
    case "twitter":
      return <XPostCard {...props} />;
    case "linkedin":
      return <LinkedInPostCard {...props} />;
    case "tiktok":
      return <TikTokPostCard {...props} />;
    case "youtube":
      return <YouTubePostCard {...props} />;
    case "facebook":
      return <FacebookPostCard {...props} />;
    default:
      return <InstagramPostCard {...props} />;
  }
}
