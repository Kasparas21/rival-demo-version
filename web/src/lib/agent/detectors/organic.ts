import type { SupabaseClient } from "@supabase/supabase-js";

import type { AgentBaselineMetrics, AgentOrganicPostInput, DetectedAgentSignal } from "@/lib/agent/types";
import type { Database } from "@/lib/supabase/types";

async function getRecentCollabs(
  admin: SupabaseClient<Database>,
  competitorId: string,
  platform: string,
  days: number,
): Promise<Array<{ handle: string; display_name: string | null; post_count: number }>> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const { data } = await admin
    .from("organic_collaborators")
    .select("handle, display_name, post_count, last_seen_at")
    .eq("competitor_id", competitorId)
    .eq("platform", platform)
    .gte("last_seen_at", since)
    .gte("post_count", 3);

  return (data ?? []).map((r) => ({
    handle: r.handle,
    display_name: r.display_name,
    post_count: r.post_count,
  }));
}

export async function detectOrganicSignals(params: {
  admin: SupabaseClient<Database>;
  competitorId: string;
  newPosts: AgentOrganicPostInput[];
  baseline: AgentBaselineMetrics;
}): Promise<DetectedAgentSignal[]> {
  const { admin, competitorId, newPosts, baseline } = params;
  const signals: DetectedAgentSignal[] = [];

  const avgEngagement =
    (baseline.organic?.avg_likes ?? 0) +
    (baseline.organic?.avg_comments ?? 0) +
    (baseline.organic?.avg_shares ?? 0);

  const seenCollabs = new Set<string>();

  for (const post of newPosts) {
    const postEngagement = (post.likes ?? 0) + (post.comments ?? 0) + (post.shares ?? 0);

    if (avgEngagement > 0 && postEngagement >= avgEngagement * 2) {
      const threat = postEngagement < avgEngagement * 4 ? 6 : 8;
      signals.push({
        signal_type: "organic_spike",
        source: "organic",
        threat_score: threat,
        payload: {
          post,
          engagement: postEngagement,
          vs_average: Math.round((postEngagement / avgEngagement) * 10) / 10,
          platform: post.platform,
          media_urls: post.media_urls ?? [],
        },
      });
    }

    const collabs = await getRecentCollabs(admin, competitorId, post.platform, 7);
    for (const collab of collabs) {
      const key = `${post.platform}:${collab.handle}`;
      if (seenCollabs.has(key)) continue;
      seenCollabs.add(key);

      signals.push({
        signal_type: "influencer_push",
        source: "organic",
        threat_score: 7,
        payload: {
          collaborator: collab,
          platform: post.platform,
          post_count_this_week: collab.post_count,
        },
      });
    }
  }

  return signals;
}
