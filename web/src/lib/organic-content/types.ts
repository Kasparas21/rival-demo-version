import { z } from "zod";

export const ORGANIC_PLATFORMS = [
  "linkedin",
  "twitter",
  "instagram",
  "tiktok",
  "facebook",
  "youtube",
] as const;

export type OrganicPlatform = (typeof ORGANIC_PLATFORMS)[number];

export type OrganicSocials = Partial<Record<OrganicPlatform, string>>;

export type OrganicCollaboratorAccount = {
  handle?: string;
  username?: string;
  name?: string;
  url?: string;
};

export type NormalizedOrganicPost = {
  platform: OrganicPlatform;
  post_id: string;
  content: string | null;
  media_urls: string[];
  likes: number;
  comments: number;
  shares: number;
  views: number;
  posted_at: string | null;
  tagged_accounts: OrganicCollaboratorAccount[];
  co_authors: OrganicCollaboratorAccount[];
  raw_data: Record<string, unknown>;
};

export type OrganicPostSort = "recent" | "likes" | "comments";

export const organicSocialsSchema = z.object({
  linkedin: z.string().optional(),
  twitter: z.string().optional(),
  instagram: z.string().optional(),
  tiktok: z.string().optional(),
  facebook: z.string().optional(),
  youtube: z.string().optional(),
});

export const organicInsightItemSchema = z.object({
  summary: z.string(),
  why: z.string().optional(),
  post_ids: z.array(z.string()).default([]),
});

export const organicHotPostSchema = z.object({
  post_id: z.string(),
  platform: z.string(),
  engagement_total: z.number(),
  summary: z.string(),
});

export const organicTopCollaboratorSchema = z.object({
  handle: z.string(),
  platform: z.string(),
  post_count: z.number(),
  collab_types: z.array(z.string()).default([]),
});

export const organicMetricsOverviewSchema = z.object({
  avg_likes: z.number().default(0),
  avg_comments: z.number().default(0),
  avg_shares: z.number().default(0),
  post_frequency_per_week: z.number().default(0),
  best_platform: z.string().default(""),
  best_post_type: z.string().default(""),
});

export const organicInsightsAnalysisSchema = z.object({
  whats_working: z.array(organicInsightItemSchema).default([]),
  whats_flopping: z.array(organicInsightItemSchema).default([]),
  top_collaborators: z.array(organicTopCollaboratorSchema).default([]),
  hot_right_now: z.array(organicHotPostSchema).default([]),
  metrics_overview: organicMetricsOverviewSchema.optional(),
});

export type OrganicInsightsAnalysis = z.infer<typeof organicInsightsAnalysisSchema>;

export type ScrapeOrganicCompetitorRow = {
  id: string;
  user_id: string;
  socials: OrganicSocials | null;
  organic_baseline_date: string | null;
};
