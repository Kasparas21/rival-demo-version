import type { SupabaseClient } from "@supabase/supabase-js";

import { stripJsonFences } from "@/lib/email-intelligence/analyze";
import { anthropicHaiku } from "@/lib/llm/anthropic";
import type { Database } from "@/lib/supabase/types";

import { ORGANIC_INSIGHTS_MAX_TOKENS } from "./constants";
import { organicInsightsAnalysisSchema } from "./types";

const SYSTEM_PROMPT =
  "You are an organic social media analyst. Return ONLY valid JSON. No markdown, no preamble.";

async function fetchPostsForInsights(
  admin: SupabaseClient<Database>,
  competitorId: string,
  platform: string,
) {
  let query = admin
    .from("organic_posts")
    .select("*")
    .eq("competitor_id", competitorId)
    .order("posted_at", { ascending: false })
    .limit(50);

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
  platform: string,
) {
  let query = admin
    .from("organic_collaborators")
    .select("*")
    .eq("competitor_id", competitorId)
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
): Promise<{ ok: boolean; error?: string }> {
  const { competitorId, userId, platform } = params;

  const posts = await fetchPostsForInsights(admin, competitorId, platform);
  if (posts.length === 0) {
    return { ok: true };
  }

  const collabs = await fetchCollabsForInsights(admin, competitorId, platform);

  const userPrompt = `Analyze the following posts from a competitor brand.

Posts (JSON):
${JSON.stringify(posts, null, 2)}

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

No preamble. No markdown. Pure JSON only.`;

  const out = await anthropicHaiku({
    systemPrompt: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
    maxTokens: ORGANIC_INSIGHTS_MAX_TOKENS,
  });

  const rawText = out.ok ? out.text : "";
  let parsed = organicInsightsAnalysisSchema.parse({});

  if (out.ok && rawText) {
    try {
      parsed = organicInsightsAnalysisSchema.parse(JSON.parse(stripJsonFences(rawText)));
    } catch {
      parsed = organicInsightsAnalysisSchema.parse({});
    }
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
      raw_analysis: rawText || null,
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
    .eq("competitor_id", competitorId);

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
