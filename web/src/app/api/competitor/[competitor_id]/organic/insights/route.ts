import { NextResponse } from "next/server";

import {
  computeHotRightNowFromPosts,
  computeOrganicMetricsOverview,
  normalizeMetricsOverview,
  type OrganicPostMetricRow,
} from "@/lib/organic-content/compute-metrics";
import { sanitizeInsightItem } from "@/lib/organic-content/insight-utils";
import { toOrganicPostClientPayload } from "@/lib/organic-content/post-display";
import { parseOrganicSocials } from "@/lib/organic-content/socials";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type InsightRow = {
  generated_at: string;
  whats_working: unknown;
  whats_flopping: unknown;
  top_collaborators: unknown;
  hot_right_now: unknown;
  metrics_overview: unknown;
  platform: string;
};

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function sanitizeInsightItems(items: unknown) {
  return asArray<{ summary: string; why?: string; post_ids?: string[] }>(items).map(
    sanitizeInsightItem,
  );
}

function extractProductType(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  const t = rec.product_type ?? rec.productType;
  return typeof t === "string" && t.trim() ? t.trim() : null;
}

function toMetricRows(
  posts: Array<{
    platform: string;
    likes: number;
    comments: number;
    shares: number;
    posted_at: string | null;
    raw_data: unknown;
  }>,
): OrganicPostMetricRow[] {
  return posts.map((p) => ({
    platform: p.platform,
    likes: p.likes,
    comments: p.comments,
    shares: p.shares,
    posted_at: p.posted_at,
    product_type: extractProductType(p.raw_data),
  }));
}

function mergePlatformInsights(rows: InsightRow[]): Omit<InsightRow, "platform"> | null {
  if (rows.length === 0) return null;

  const whats_working = rows.flatMap((r) => asArray(r.whats_working)).slice(0, 6);
  const whats_flopping = rows.flatMap((r) => asArray(r.whats_flopping)).slice(0, 6);
  const top_collaborators = rows.flatMap((r) => asArray(r.top_collaborators)).slice(0, 10);
  const hot_right_now = rows
    .flatMap((r) => asArray<{ engagement_total?: number }>(r.hot_right_now))
    .sort((a, b) => (b.engagement_total ?? 0) - (a.engagement_total ?? 0))
    .slice(0, 3);

  const latestGenerated = rows.reduce(
    (max, r) => (r.generated_at > max ? r.generated_at : max),
    rows[0]!.generated_at,
  );

  return {
    generated_at: latestGenerated,
    whats_working,
    whats_flopping,
    top_collaborators,
    hot_right_now,
    metrics_overview: {},
  };
}

export async function GET(
  req: Request,
  context: { params: Promise<{ competitor_id: string }> },
) {
  const { competitor_id: competitorIdRaw } = await context.params;
  const competitorId = competitorIdRaw?.trim() ?? "";
  const platform = new URL(req.url).searchParams.get("platform")?.trim() || "all";

  if (!competitorId || !UUID_RE.test(competitorId)) {
    return NextResponse.json({ ok: false, error: "Invalid competitor_id" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { data: competitor, error: compErr } = await supabase
    .from("saved_competitors")
    .select("id, socials, organic_next_scrape_at, organic_last_scraped_at")
    .eq("id", competitorId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (compErr) {
    return NextResponse.json({ ok: false, error: compErr.message }, { status: 500 });
  }
  if (!competitor) {
    return NextResponse.json({ ok: false, error: "Competitor not found" }, { status: 404 });
  }

  let postsQuery = supabase
    .from("organic_posts")
    .select(
      "id, post_id, platform, content, media_urls, likes, comments, shares, views, posted_at, raw_data",
    )
    .eq("competitor_id", competitorId)
    .eq("user_id", user.id)
    .order("posted_at", { ascending: false })
    .limit(100);

  if (platform !== "all") {
    postsQuery = postsQuery.eq("platform", platform);
  }

  const { data: postsRaw, error: postsErr } = await postsQuery;
  if (postsErr) {
    return NextResponse.json({ ok: false, error: postsErr.message }, { status: 500 });
  }

  const posts = postsRaw ?? [];
  const metricRows = toMetricRows(posts);
  const computedMetrics = computeOrganicMetricsOverview(metricRows);

  const { data: insight, error: insightErr } = await supabase
    .from("organic_insights")
    .select("*")
    .eq("competitor_id", competitorId)
    .eq("user_id", user.id)
    .eq("platform", platform)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (insightErr) {
    return NextResponse.json({ ok: false, error: insightErr.message }, { status: 500 });
  }

  let resolvedInsight: Omit<InsightRow, "platform"> | null = insight
    ? {
        generated_at: insight.generated_at,
        whats_working: insight.whats_working,
        whats_flopping: insight.whats_flopping,
        top_collaborators: insight.top_collaborators,
        hot_right_now: insight.hot_right_now,
        metrics_overview: insight.metrics_overview,
      }
    : null;

  const aiSectionsEmpty =
    !resolvedInsight ||
    (asArray(resolvedInsight.whats_working).length === 0 &&
      asArray(resolvedInsight.whats_flopping).length === 0);

  if (platform === "all" && aiSectionsEmpty) {
    const { data: platformInsights } = await supabase
      .from("organic_insights")
      .select("*")
      .eq("competitor_id", competitorId)
      .eq("user_id", user.id)
      .neq("platform", "all");

    const merged = mergePlatformInsights((platformInsights ?? []) as InsightRow[]);
    if (merged) {
      resolvedInsight = {
        ...merged,
        metrics_overview: resolvedInsight?.metrics_overview ?? merged.metrics_overview,
      };
    }
  }

  if (posts.length > 0) {
    const storedMetrics =
      resolvedInsight?.metrics_overview && typeof resolvedInsight.metrics_overview === "object"
        ? (resolvedInsight.metrics_overview as Record<string, unknown>)
        : null;

    const metrics = normalizeMetricsOverview({
      ...(storedMetrics ?? {}),
      ...computedMetrics,
    });

    const hotFallback = computeHotRightNowFromPosts(posts);
    const hotStored = asArray(resolvedInsight?.hot_right_now);

    resolvedInsight = {
      generated_at: resolvedInsight?.generated_at ?? new Date().toISOString(),
      whats_working: sanitizeInsightItems(resolvedInsight?.whats_working),
      whats_flopping: sanitizeInsightItems(resolvedInsight?.whats_flopping),
      top_collaborators: asArray(resolvedInsight?.top_collaborators),
      hot_right_now: hotStored.length > 0 ? hotStored : hotFallback,
      metrics_overview: metrics,
    };
  }

  const { data: platformRows } = await supabase
    .from("organic_posts")
    .select("platform")
    .eq("competitor_id", competitorId)
    .eq("user_id", user.id);

  const platformsWithPosts = [...new Set((platformRows ?? []).map((r) => r.platform))];

  const postIds = new Set<string>();
  if (resolvedInsight) {
    for (const section of [resolvedInsight.whats_working, resolvedInsight.whats_flopping]) {
      for (const item of asArray<{ post_ids?: string[] }>(section)) {
        for (const id of item.post_ids ?? []) postIds.add(id);
      }
    }
    for (const item of asArray<{ post_id?: string }>(resolvedInsight.hot_right_now)) {
      if (item.post_id) postIds.add(item.post_id);
    }
  }

  // Always include top hot posts in linked cards when present
  if (postIds.size === 0 && posts.length > 0) {
    for (const hot of computeHotRightNowFromPosts(posts)) {
      postIds.add(hot.post_id);
    }
  }

  let linkedPosts: ReturnType<typeof toOrganicPostClientPayload>[] = [];
  if (postIds.size > 0) {
    const { data: linkedRaw } = await supabase
      .from("organic_posts")
      .select("id, post_id, platform, content, media_urls, likes, comments, shares, views, posted_at, raw_data")
      .eq("competitor_id", competitorId)
      .eq("user_id", user.id)
      .in("post_id", [...postIds]);
    linkedPosts = (linkedRaw ?? []).map((post) => toOrganicPostClientPayload(post));
  }

  return NextResponse.json({
    ok: true,
    insight: resolvedInsight,
    linkedPosts,
    platformsWithPosts,
    socials: parseOrganicSocials(competitor.socials),
    organic_next_scrape_at: competitor.organic_next_scrape_at,
    organic_last_scraped_at: competitor.organic_last_scraped_at,
  });
}
