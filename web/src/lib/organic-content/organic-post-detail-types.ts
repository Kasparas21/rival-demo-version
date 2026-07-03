import type { OrganicMediaAspect } from "@/lib/organic-content/post-display";
import type { OrganicPostPreviewAnalysis, OrganicPostAnalysisQuota } from "@/lib/organic-content/organic-post-ai-analysis-types";

export type OrganicPostDetailPost = {
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
  scraped_at?: string | null;
};

export type OrganicPostDetailPayload = {
  ok: boolean;
  error?: string;
  post?: OrganicPostDetailPost;
  competitor?: {
    id: string;
    name: string;
    domain?: string | null;
    logo_url?: string | null;
  };
  context?: {
    preview_analysis?: OrganicPostPreviewAnalysis;
    preview_analysis_computed_at?: string | null;
    preview_analysis_quota?: OrganicPostAnalysisQuota;
  };
};

export type OrganicPostDetailData = {
  post: OrganicPostDetailPost;
  competitor: NonNullable<OrganicPostDetailPayload["competitor"]>;
  context: NonNullable<OrganicPostDetailPayload["context"]>;
};
