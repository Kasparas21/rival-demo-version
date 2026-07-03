import type { SupabaseClient } from "@supabase/supabase-js";

import { stripJsonFences } from "@/lib/email-intelligence/analyze";
import { anthropicHaiku } from "@/lib/llm/anthropic";
import type { Database } from "@/lib/supabase/types";

import { ORGANIC_INSIGHTS_MAX_TOKENS } from "./constants";
import { insightAiSectionsEmpty, sanitizeInsightItem } from "./insight-utils";
import { organicInsightsAnalysisSchema, type OrganicInsightsAnalysis } from "./types";

export { insightAiSectionsEmpty };

const SYSTEM_PROMPT =
  "You are an organic social media analyst. Return ONLY valid JSON. No markdown, no preamble.";

const INSIGHTS_POST_LIMIT = 30;

type OrganicPostRow = Database["public"]["Tables"]["organic_posts"]["Row"];

export function compactPostForInsights(post: OrganicPostRow) {
  const raw =
    post.raw_data && typeof post.raw_data === "object"
      ? (post.raw_data as Record<string, unknown>)
      : null;
  const productType = raw?.product_type ?? raw?.productType;
  return {
    post_id: post.post_id,
    platform: post.platform,
    content: (post.content ?? "").slice(0, 400),
    likes: post.likes,
    comments: post.comments,
    shares: post.shares,
    views: post.views,
    posted_at: post.posted_at,
    ...(typeof productType === "string" && productType.trim()
      ? { product_type: productType.trim() }
      : {}),
  };
}

function analysisHasContent(parsed: OrganicInsightsAnalysis): boolean {
  return (
    parsed.whats_working.length > 0 ||
    parsed.whats_flopping.length > 0 ||
    parsed.hot_right_now.length > 0
  );
}

function normalizeInsightJson(raw: unknown): OrganicInsightsAnalysis {
  const rec = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const normalizeItems = (items: unknown) => {
    if (!Array.isArray(items)) return [];
    return items.map((item) => {
      const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      const postIds = Array.isArray(row.post_ids)
        ? row.post_ids.map((id) => String(id))
        : [];
      return sanitizeInsightItem({
        summary: String(row.summary ?? "").trim(),
        why: row.why != null ? String(row.why) : undefined,
        post_ids: postIds,
      });
    }).filter((item) => item.summary.length > 0);
  };

  const normalizeHot = (items: unknown) => {
    if (!Array.isArray(items)) return [];
    return items
      .map((item) => {
        const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
        return {
          post_id: String(row.post_id ?? ""),
          platform: String(row.platform ?? ""),
          engagement_total: Number(row.engagement_total ?? 0),
          summary: String(row.summary ?? "").trim(),
        };
      })
      .filter((item) => item.post_id && item.summary);
  };

  return organicInsightsAnalysisSchema.parse({
    whats_working: normalizeItems(rec.whats_working),
    whats_flopping: normalizeItems(rec.whats_flopping),
    top_collaborators: Array.isArray(rec.top_collaborators) ? rec.top_collaborators : [],
    hot_right_now: normalizeHot(rec.hot_right_now),
    metrics_overview:
      rec.metrics_overview && typeof rec.metrics_overview === "object" ? rec.metrics_overview : {},
  });
}

async function fetchPostsForInsights(
  admin: SupabaseClient<Database>,
  competitorId: string,
  userId: string,
  platform: string,
) {
  let query = admin
    .from("organic_posts")
    .select("*")
    .eq("competitor_id", competitorId)
    .eq("user_id", userId)
    .order("posted_at", { ascending: false })
    .limit(INSIGHTS_POST_LIMIT);

  if (platform !== "all") {
    query = query.eq("platform", platform);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function fetchCollabsForInsights(
  admin: SupabaseClient<Database>,
  competitorId: string,
  userId: string,
  platform: string,
) {
  let query = admin
    .from("organic_collaborators")
    .select("handle, platform, post_count, collab_types, display_name")
    .eq("competitor_id", competitorId)
    .eq("user_id", userId)
    .order("post_count", { ascending: false })
    .limit(10);

  if (platform !== "all") {
    query = query.eq("platform", platform);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function generateInsightsForPlatform(
  admin: SupabaseClient<Database>,
  params: {
    competitorId: string;
    userId: string;
    platform: string;
  },
): Promise<{ ok: boolean; error?: string; skipped?: boolean }> {
  const { competitorId, userId, platform } = params;

  const posts = await fetchPostsForInsights(admin, competitorId, userId, platform);
  if (posts.length === 0) {
    return { ok: true, skipped: true };
  }

  const collabs = await fetchCollabsForInsights(admin, competitorId, userId, platform);
  const compactPosts = posts.map(compactPostForInsights);

  const userPrompt = `Analyze the following organic social posts from a competitor brand.

Reference posts ONLY via the post_ids array — never put post_id strings, shortcodes, or IDs in summary or why text.
Write summary and why in plain English for marketers (no technical IDs, no parenthetical post codes).

Posts (JSON):
${JSON.stringify(compactPosts, null, 2)}

Top collaborators:
${JSON.stringify(collabs, null, 2)}

Return ONLY a JSON object with this exact structure:
{
  "whats_working": [
    { "summary": "string", "why": "string", "post_ids": ["id1", "id2"] }
  ],
  "whats_flopping": [
    { "summary": "string", "why": "string", "post_ids": ["id1"] }
  ],
  "top_collaborators": [
    { "handle": "string", "platform": "string", "post_count": 0, "collab_types": [] }
  ],
  "hot_right_now": [
    { "post_id": "string", "platform": "string", "engagement_total": 0, "summary": "string" }
  ],
  "metrics_overview": {
    "avg_likes": 0,
    "avg_comments": 0,
    "avg_shares": 0,
    "post_frequency_per_week": 0,
    "best_platform": "string",
    "best_post_type": "string"
  }
}

Provide 2-4 whats_working items and 1-3 whats_flopping items when patterns exist.
No preamble. No markdown. Pure JSON only.`;

  const out = await anthropicHaiku({
    systemPrompt: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
    maxTokens: ORGANIC_INSIGHTS_MAX_TOKENS,
  });

  if (!out.ok) {
    return { ok: false, error: out.error };
  }

  let parsed: OrganicInsightsAnalysis;
  try {
    parsed = normalizeInsightJson(JSON.parse(stripJsonFences(out.text)));
  } catch {
    return { ok: false, error: "Failed to parse AI insight response" };
  }

  if (!analysisHasContent(parsed)) {
    return { ok: false, error: "AI returned empty insight sections" };
  }

  const { error } = await admin.from("organic_insights").upsert(
    {
      competitor_id: competitorId,
      user_id: userId,
      platform,
      generated_at: new Date().toISOString(),
      whats_working: parsed.whats_working,
      whats_flopping: parsed.whats_flopping,
      top_collaborators: parsed.top_collaborators,
      hot_right_now: parsed.hot_right_now,
      metrics_overview: parsed.metrics_overview ?? {},
      raw_analysis: out.text || null,
    },
    { onConflict: "competitor_id,platform" },
  );

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function generateOrganicInsights(
  admin: SupabaseClient<Database>,
  params: { competitorId: string; userId: string },
): Promise<{ platforms: string[]; errors: string[] }> {
  const { competitorId, userId } = params;
  const errors: string[] = [];

  const { data: platformRows, error } = await admin
    .from("organic_posts")
    .select("platform")
    .eq("competitor_id", competitorId)
    .eq("user_id", userId);

  if (error) {
    return { platforms: [], errors: [error.message] };
  }

  const uniquePlatforms = [...new Set((platformRows ?? []).map((r) => r.platform))];
  const platforms = ["all", ...uniquePlatforms];

  for (const platform of platforms) {
    const result = await generateInsightsForPlatform(admin, { competitorId, userId, platform });
    if (!result.ok && result.error) errors.push(`${platform}: ${result.error}`);
  }

  return { platforms, errors };
}

export async function regenerateOrganicInsightsForScope(
  admin: SupabaseClient<Database>,
  params: { competitorId: string; userId: string; platform?: string },
): Promise<{ ok: boolean; errors: string[]; platforms: string[] }> {
  const { competitorId, userId, platform } = params;
  const errors: string[] = [];
  const ran: string[] = [];

  if (platform && platform !== "all") {
    const result = await generateInsightsForPlatform(admin, { competitorId, userId, platform });
    if (!result.ok && result.error) errors.push(result.error);
    if (result.ok && !result.skipped) ran.push(platform);
    return { ok: errors.length === 0, errors, platforms: ran };
  }

  const { data: platformRows, error } = await admin
    .from("organic_posts")
    .select("platform")
    .eq("competitor_id", competitorId)
    .eq("user_id", userId);

  if (error) {
    return { ok: false, errors: [error.message], platforms: [] };
  }

  const uniquePlatforms = [...new Set((platformRows ?? []).map((r) => r.platform))];
  const targets = ["all", ...uniquePlatforms];

  for (const p of targets) {
    const result = await generateInsightsForPlatform(admin, { competitorId, userId, platform: p });
    if (!result.ok && result.error) errors.push(`${p}: ${result.error}`);
    if (result.ok && !result.skipped) ran.push(p);
  }

  return { ok: errors.length === 0, errors, platforms: ran };
}
