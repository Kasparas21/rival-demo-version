import { knownLikes, repeatsHiddenLikesPlaceholder } from "@/lib/organic-content/known-likes";

export type OrganicPostMetricRow = {
  platform: string;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  views?: number | null;
  posted_at: string | null;
  product_type?: string | null;
};

/**
 * `avg_*` hold the typical (median) post: one viral post no longer sets the "average" for the account.
 * Likes come only from posts whose likes are visible ({@link knownLikes}).
 */
export type OrganicMetricsOverview = {
  avg_likes: number;
  avg_comments: number;
  avg_shares: number;
  /** Posts whose like count is real; 0 with posts means the account hides likes. */
  likes_known_posts?: number;
  post_frequency_per_week: number;
  best_platform: string;
  best_post_type: string;
};

function roundMetric(n: number): number {
  return Math.round(Number.isFinite(n) ? n : 0);
}

export function normalizeMetricsOverview(
  metrics: Record<string, unknown> | OrganicMetricsOverview | null | undefined,
): OrganicMetricsOverview {
  const m = metrics && typeof metrics === "object" ? metrics : {};
  return {
    avg_likes: roundMetric(Number(m.avg_likes ?? 0)),
    avg_comments: roundMetric(Number(m.avg_comments ?? 0)),
    avg_shares: roundMetric(Number(m.avg_shares ?? 0)),
    ...(m.likes_known_posts != null ? { likes_known_posts: roundMetric(Number(m.likes_known_posts)) } : {}),
    post_frequency_per_week: roundMetric(Number(m.post_frequency_per_week ?? 0)),
    best_platform: String(m.best_platform ?? "").trim(),
    best_post_type: String(m.best_post_type ?? "").trim(),
  };
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

/**
 * Best platform by typical (median) engagement per post. Posts with hidden likes are left out rather than
 * counted as 3, unless no platform has visible likes (then everything compares on comments + shares).
 */
export function computeBestPlatform(posts: OrganicPostMetricRow[]): string {
  const repeated = repeatsHiddenLikesPlaceholder(posts);
  const anyKnown = posts.some((p) => knownLikes(p, repeated) != null);
  const byPlatform = new Map<string, number[]>();
  for (const post of posts) {
    const likes = knownLikes(post, repeated);
    if (anyKnown && likes == null) continue;
    const engagement = (likes ?? 0) + (post.comments ?? 0) + (post.shares ?? 0);
    const list = byPlatform.get(post.platform) ?? [];
    list.push(engagement);
    byPlatform.set(post.platform, list);
  }

  let best_platform = "";
  let bestTypical = -1;
  for (const [plat, values] of byPlatform) {
    const typical = median(values);
    if (typical > bestTypical) {
      bestTypical = typical;
      best_platform = plat;
    }
  }
  return best_platform;
}

export function computeOrganicMetricsOverview(posts: OrganicPostMetricRow[]): OrganicMetricsOverview {
  if (posts.length === 0) {
    return {
      avg_likes: 0,
      avg_comments: 0,
      avg_shares: 0,
      post_frequency_per_week: 0,
      best_platform: "",
      best_post_type: "",
    };
  }

  const repeated = repeatsHiddenLikesPlaceholder(posts);
  const visibleLikes = posts.map((p) => knownLikes(p, repeated)).filter((n): n is number => n != null);
  const avg_likes = median(visibleLikes);
  const avg_comments = median(posts.map((p) => p.comments ?? 0));
  const avg_shares = median(posts.map((p) => p.shares ?? 0));

  const dated = posts.filter((p) => p.posted_at);
  let post_frequency_per_week = posts.length;
  if (dated.length >= 2) {
    const times = dated.map((p) => new Date(p.posted_at!).getTime()).sort((a, b) => a - b);
    const spanMs = times[times.length - 1]! - times[0]!;
    const spanWeeks = Math.max(1, spanMs / (7 * 24 * 60 * 60 * 1000));
    post_frequency_per_week = posts.length / spanWeeks;
  }

  const best_platform = computeBestPlatform(posts);

  const typeCounts = new Map<string, number>();
  for (const post of posts) {
    const t = post.product_type?.trim() || "post";
    typeCounts.set(t, (typeCounts.get(t) ?? 0) + 1);
  }
  let best_post_type = "";
  let bestTypeCount = 0;
  for (const [t, count] of typeCounts) {
    if (count > bestTypeCount) {
      bestTypeCount = count;
      best_post_type = t;
    }
  }

  return {
    avg_likes: roundMetric(avg_likes),
    avg_comments: roundMetric(avg_comments),
    avg_shares: roundMetric(avg_shares),
    likes_known_posts: visibleLikes.length,
    post_frequency_per_week: roundMetric(post_frequency_per_week),
    best_platform,
    best_post_type,
  };
}

export function metricsOverviewIsEmpty(metrics: Record<string, unknown> | null | undefined): boolean {
  if (!metrics) return true;
  const avgLikes = Number(metrics.avg_likes ?? 0);
  const avgComments = Number(metrics.avg_comments ?? 0);
  const freq = Number(metrics.post_frequency_per_week ?? 0);
  const bestPlatform = String(metrics.best_platform ?? "").trim();
  return avgLikes === 0 && avgComments === 0 && freq === 0 && !bestPlatform;
}

export function computeHotRightNowFromPosts(
  posts: Array<{
    post_id: string;
    platform: string;
    likes: number | null;
    comments: number | null;
    shares: number | null;
    content: string | null;
  }>,
  limit = 3,
) {
  return [...posts]
    .map((p) => ({
      post_id: p.post_id,
      platform: p.platform,
      engagement_total: (p.likes ?? 0) + (p.comments ?? 0) + (p.shares ?? 0),
      summary: (p.content ?? "").trim().slice(0, 140) || "High-engagement post",
    }))
    .sort((a, b) => b.engagement_total - a.engagement_total)
    .slice(0, limit);
}
