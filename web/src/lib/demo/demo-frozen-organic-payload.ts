import type { OrganicPostCardData } from "@/components/organic/OrganicPostCard";
import { isDemoOwnBrandDomain } from "@/lib/demo/dashboard-demo-config";
import {
  FROZEN_ORGANIC_BRAND_NAME as ADIDAS_ORGANIC_BRAND_NAME,
  FROZEN_ORGANIC_HANDLES as ADIDAS_ORGANIC_HANDLES,
  FROZEN_ORGANIC_POSTS as ADIDAS_ORGANIC_POSTS,
  type FrozenOrganicPost,
} from "@/lib/demo/frozen/frozen-adidas-com-organic";
import {
  FROZEN_ORGANIC_BRAND_NAME as NIKE_ORGANIC_BRAND_NAME,
  FROZEN_ORGANIC_HANDLES as NIKE_ORGANIC_HANDLES,
  FROZEN_ORGANIC_POSTS as NIKE_ORGANIC_POSTS,
} from "@/lib/demo/frozen/frozen-nike-com-organic";
import type { OrganicMediaAspect } from "@/lib/organic-content/post-display";
import type { OrganicPlatform, OrganicSocials } from "@/lib/organic-content/types";

export type { FrozenOrganicPost };

export type DemoOrganicHandles = {
  instagram: string;
  tiktok: string;
  youtube: string;
  linkedin: string;
  x: string;
  facebook: string;
};

export type DemoOrganicInsights = {
  totalPosts: number;
  avgEngagement: number;
  topPlatform: string;
  postingCadence: string;
  collaborators: readonly { handle: string; platform: string; posts: number; tags: string[] }[];
};

export type DemoOrganicInsightItem = {
  summary: string;
  why?: string;
  post_ids?: string[];
};

export type DemoOrganicHotPost = {
  post_id: string;
  platform: string;
  engagement_total: number;
  summary: string;
};

export type DemoOrganicTopCollaborator = {
  handle: string;
  platform: string;
  post_count: number;
  collab_types: string[];
};

export type DemoOrganicMetricsOverview = {
  avg_likes?: number;
  avg_comments?: number;
  avg_shares?: number;
  post_frequency_per_week?: number;
  best_platform?: string;
  best_post_type?: string;
};

export type DemoOrganicInsightsPayload = {
  generated_at: string;
  whats_working: DemoOrganicInsightItem[];
  whats_flopping: DemoOrganicInsightItem[];
  top_collaborators: DemoOrganicTopCollaborator[];
  hot_right_now: DemoOrganicHotPost[];
  metrics_overview: DemoOrganicMetricsOverview;
};

function engagementTotal(post: FrozenOrganicPost): number {
  return post.likes + post.comments;
}

function topPostsByEngagement(posts: FrozenOrganicPost[], count: number): FrozenOrganicPost[] {
  return [...posts].sort((a, b) => engagementTotal(b) - engagementTotal(a)).slice(0, count);
}

function bottomPostsByEngagement(posts: FrozenOrganicPost[], count: number): FrozenOrganicPost[] {
  return [...posts].sort((a, b) => engagementTotal(a) - engagementTotal(b)).slice(0, count);
}

function buildAdidasOrganicInsightsPayload(posts: FrozenOrganicPost[]): DemoOrganicInsightsPayload {
  const hotPosts = topPostsByEngagement(posts, 3);
  const avgLikes = posts.length ? Math.round(posts.reduce((s, p) => s + p.likes, 0) / posts.length) : 0;
  const avgComments = posts.length ? Math.round(posts.reduce((s, p) => s + p.comments, 0) / posts.length) : 0;

  return {
    generated_at: new Date(Date.now() - 18 * 3_600_000).toISOString(),
    metrics_overview: {
      avg_likes: avgLikes || 2847,
      avg_comments: avgComments || 24,
      avg_shares: 31,
      post_frequency_per_week: 4.6,
      best_platform: "facebook",
      best_post_type: "event-led image",
    },
    whats_working: [
      {
        summary: "World Cup match-ball moments are dominating Facebook reach",
        why: "Tournament tie-ins with celebrity ball deliveries are pulling 7–16k likes per post — roughly 6× the account median.",
        post_ids: ["19e86076-3c6d-41b8-b731-d31b253c804a", "5032c3e0-618c-4872-88f2-dd6dab813214"],
      },
      {
        summary: "YouTube athlete shorts keep steady mid-funnel engagement",
        why: "Legend roster clips (#pogba, #kaka, #pedri) hold 250–1k likes with healthy view-to-like ratios on 13–14d posts.",
        post_ids: ["6bbbc77a-901a-4813-bbd9-e7e91d621467", "b1d9466c-965b-45ae-8445-f2be00d82ace"],
      },
    ],
    whats_flopping: [
      {
        summary: "Niche athlete welcome posts miss the World Cup wave",
        why: "College football signings get ~400 likes — decent reach, but far below tournament content this week.",
        post_ids: ["334b5f98-f555-4793-8ee8-d5a705829735"],
      },
    ],
    top_collaborators: [
      { handle: "@vol_sports", platform: "facebook", post_count: 2, collab_types: ["tagged athlete", "team launch"] },
      { handle: "@pedri", platform: "youtube", post_count: 3, collab_types: ["athlete cameo", "short-form"] },
      { handle: "@pogba", platform: "youtube", post_count: 2, collab_types: ["skills challenge", "brand moment"] },
      { handle: "Tate McRae", platform: "facebook", post_count: 1, collab_types: ["celebrity delivery", "event"] },
    ],
    hot_right_now: hotPosts.map((post) => ({
      post_id: post.id,
      platform: post.platform,
      engagement_total: engagementTotal(post),
      summary: post.content.trim().slice(0, 140),
    })),
  };
}

function buildGenericOrganicInsightsPayload(posts: FrozenOrganicPost[]): DemoOrganicInsightsPayload {
  const hotPosts = topPostsByEngagement(posts, 3);
  const weakPosts = bottomPostsByEngagement(posts, 2);
  const avgLikes = posts.length ? Math.round(posts.reduce((s, p) => s + p.likes, 0) / posts.length) : 0;
  const avgComments = posts.length ? Math.round(posts.reduce((s, p) => s + p.comments, 0) / posts.length) : 0;
  const byPlatform = new Map<string, number>();
  for (const post of posts) {
    byPlatform.set(post.platform, (byPlatform.get(post.platform) ?? 0) + engagementTotal(post));
  }
  const bestPlatform = [...byPlatform.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "instagram";

  return {
    generated_at: new Date(Date.now() - 6 * 3_600_000).toISOString(),
    metrics_overview: {
      avg_likes: avgLikes || 4120,
      avg_comments: avgComments || 38,
      avg_shares: 22,
      post_frequency_per_week: 3.8,
      best_platform: bestPlatform,
      best_post_type: "image",
    },
    whats_working: [
      {
        summary: "Top-of-feed hero posts are carrying most of the engagement",
        why: "Highest-like posts cluster around product drops and athlete-led storytelling.",
        post_ids: hotPosts.slice(0, 2).map((p) => p.id),
      },
    ],
    whats_flopping: [
      {
        summary: "Lower-reach posts lack a clear hook or collab angle",
        why: "Bottom quartile posts skew informational and skip the strong visual or talent cue winners use.",
        post_ids: weakPosts.map((p) => p.id),
      },
    ],
    top_collaborators: [
      { handle: "@athlete", platform: bestPlatform, post_count: 4, collab_types: ["tagged", "co-post"] },
      { handle: "@partner", platform: "instagram", post_count: 2, collab_types: ["brand collab"] },
    ],
    hot_right_now: hotPosts.map((post) => ({
      post_id: post.id,
      platform: post.platform,
      engagement_total: engagementTotal(post),
      summary: post.content.trim().slice(0, 140),
    })),
  };
}

export function buildDemoOrganicInsightsPayload(domain?: string): DemoOrganicInsightsPayload {
  const posts = postsForDomain(domain);
  if (domain && isDemoOwnBrandDomain(domain)) {
    return buildGenericOrganicInsightsPayload(posts);
  }
  return buildAdidasOrganicInsightsPayload(posts);
}

function organicPostHasPreview(post: FrozenOrganicPost): boolean {
  return Boolean(post.previewUrl?.trim());
}

function postsForDomain(domain?: string): FrozenOrganicPost[] {
  const raw =
    domain && isDemoOwnBrandDomain(domain) ? NIKE_ORGANIC_POSTS : ADIDAS_ORGANIC_POSTS;
  return raw.filter(organicPostHasPreview);
}

function handlesForDomain(domain?: string): DemoOrganicHandles {
  if (domain && isDemoOwnBrandDomain(domain)) return NIKE_ORGANIC_HANDLES;
  return ADIDAS_ORGANIC_HANDLES;
}

function brandNameForDomain(domain?: string): string {
  if (domain && isDemoOwnBrandDomain(domain)) return NIKE_ORGANIC_BRAND_NAME;
  return ADIDAS_ORGANIC_BRAND_NAME;
}

function demoOrganicPlatformFromString(platform: string): OrganicPlatform {
  const p = platform.trim().toLowerCase();
  if (p === "x") return "twitter";
  if (
    p === "instagram" ||
    p === "tiktok" ||
    p === "youtube" ||
    p === "linkedin" ||
    p === "facebook" ||
    p === "twitter"
  ) {
    return p;
  }
  return "instagram";
}

function parseDemoOrganicPostedAt(relative: string): string {
  const match = relative.trim().match(/^(\d+)\s*([mhdw])\s*ago$/i);
  if (!match) return new Date().toISOString();
  const amount = Number.parseInt(match[1] ?? "0", 10);
  const unit = (match[2] ?? "d").toLowerCase();
  const unitMs =
    unit === "m"
      ? 60_000
      : unit === "h"
        ? 3_600_000
        : unit === "w"
          ? 7 * 86_400_000
          : 86_400_000;
  return new Date(Date.now() - amount * unitMs).toISOString();
}

function extractOrganicHandle(value: string | undefined, platform: OrganicPlatform): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  if (!raw.startsWith("http")) return raw.replace(/^@/, "");
  try {
    const segments = new URL(raw).pathname.split("/").filter(Boolean);
    const last = segments[segments.length - 1];
    if (!last) return null;
    if (platform === "youtube") return last.replace(/^@/, "");
    return last;
  } catch {
    return raw.replace(/^@/, "");
  }
}

function mediaMetaForPost(
  platform: OrganicPlatform,
  post: FrozenOrganicPost,
): { product_type: string | null; media_aspect: OrganicMediaAspect } {
  if (post.isVideo) {
    if (platform === "tiktok" || platform === "instagram") {
      return { product_type: "clips", media_aspect: "vertical" };
    }
    if (platform === "youtube") {
      return { product_type: "shorts", media_aspect: "vertical" };
    }
    return { product_type: "video", media_aspect: "landscape" };
  }
  if (platform === "youtube") return { product_type: null, media_aspect: "landscape" };
  if (platform === "linkedin" || platform === "facebook") {
    return { product_type: null, media_aspect: "landscape" };
  }
  return { product_type: null, media_aspect: "square" };
}

export function getDemoOrganicBrandName(domain?: string): string {
  return brandNameForDomain(domain);
}

export function getDemoOrganicSocials(domain?: string): OrganicSocials {
  const handles = handlesForDomain(domain);
  return {
    instagram: handles.instagram,
    tiktok: handles.tiktok,
    youtube: handles.youtube,
    linkedin: handles.linkedin,
    twitter: handles.x,
    facebook: handles.facebook,
  };
}

export function frozenOrganicPostToCardData(
  post: FrozenOrganicPost,
  socials: OrganicSocials,
  brandName: string,
): OrganicPostCardData {
  const platform = demoOrganicPlatformFromString(post.platform);
  const { product_type, media_aspect } = mediaMetaForPost(platform, post);
  const handle = extractOrganicHandle(socials[platform], platform);

  return {
    id: post.id,
    platform,
    post_id: post.id,
    content: post.content,
    media_urls: post.previewUrl ? [post.previewUrl] : [],
    likes: post.likes,
    comments: post.comments,
    shares: 0,
    views: post.views ?? 0,
    posted_at: parseDemoOrganicPostedAt(post.postedAt),
    author_username: handle ?? brandName.toLowerCase().replace(/\s+/g, ""),
    author_display_name: brandName,
    product_type,
    media_aspect,
  };
}

export function frozenOrganicPostsToCardData(
  domain?: string,
  brandName?: string,
): OrganicPostCardData[] {
  const socials = getDemoOrganicSocials(domain);
  const name = brandName?.trim() || brandNameForDomain(domain);
  return postsForDomain(domain).map((post) => frozenOrganicPostToCardData(post, socials, name));
}

export function getDemoOrganicPosts(domain?: string): FrozenOrganicPost[] {
  return postsForDomain(domain);
}

export function getDemoOrganicHandles(domain?: string): DemoOrganicHandles {
  return handlesForDomain(domain);
}

export function buildDemoOrganicInsights(domain?: string): DemoOrganicInsights {
  const posts = postsForDomain(domain);
  const totalEngagement = posts.reduce((sum, p) => sum + p.likes + p.comments, 0);
  const byPlatform = new Map<string, number>();
  for (const post of posts) {
    byPlatform.set(post.platform, (byPlatform.get(post.platform) ?? 0) + 1);
  }
  const topPlatform =
    [...byPlatform.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "instagram";

  return {
    totalPosts: posts.length,
    avgEngagement: posts.length ? Math.round(totalEngagement / posts.length) : 0,
    topPlatform,
    postingCadence: posts.length >= 8 ? "3–4 posts / week" : "1–2 posts / week",
    collaborators: [],
  };
}
