export type OrganicPostMetricRow = {
  platform: string;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  posted_at: string | null;
  product_type?: string | null;
};

export type OrganicMetricsOverview = {
  avg_likes: number;
  avg_comments: number;
  avg_shares: number;
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
    post_frequency_per_week: roundMetric(Number(m.post_frequency_per_week ?? 0)),
    best_platform: String(m.best_platform ?? "").trim(),
    best_post_type: String(m.best_post_type ?? "").trim(),
  };
}

/** Best platform by average engagement — always computed across all provided posts. */
export function computeBestPlatform(posts: OrganicPostMetricRow[]): string {
  const platformEngagement = new Map<string, { total: number; count: number }>();
  for (const post of posts) {
    const engagement = (post.likes ?? 0) + (post.comments ?? 0) + (post.shares ?? 0);
    const row = platformEngagement.get(post.platform) ?? { total: 0, count: 0 };
    row.total += engagement;
    row.count += 1;
    platformEngagement.set(post.platform, row);
  }

  let best_platform = "";
  let bestAvg = -1;
  for (const [plat, { total, count }] of platformEngagement) {
    const avg = total / count;
    if (avg > bestAvg) {
      bestAvg = avg;
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

  const avg_likes = posts.reduce((s, p) => s + (p.likes ?? 0), 0) / posts.length;
  const avg_comments = posts.reduce((s, p) => s + (p.comments ?? 0), 0) / posts.length;
  const avg_shares = posts.reduce((s, p) => s + (p.shares ?? 0), 0) / posts.length;

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
