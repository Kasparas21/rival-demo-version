import type { SupabaseClient } from "@supabase/supabase-js";

import type { AgentAdInput, AgentEmailInput, AgentOrganicPostInput } from "@/lib/agent/types";
import type { Database } from "@/lib/supabase/types";

export async function fetchAdsForAgentFromBatch(
  admin: SupabaseClient<Database>,
  params: { userId: string; competitorId: string; scrapeBatchId: string },
): Promise<AgentAdInput[]> {
  const { data } = await admin
    .from("scraped_ads")
    .select(
      "id, platform, stable_ad_key, ad_text, ad_creative_url, first_seen_at, last_seen_at, is_active, ai_extracted_angle, raw_payload",
    )
    .eq("user_id", params.userId)
    .eq("competitor_id", params.competitorId)
    .eq("scrape_batch_id", params.scrapeBatchId);

  return (data ?? []) as AgentAdInput[];
}

export async function fetchEmailForAgent(
  admin: SupabaseClient<Database>,
  emailId: string,
): Promise<AgentEmailInput | null> {
  const { data } = await admin
    .from("competitor_emails")
    .select(
      "id, subject, preview_text, received_at, email_type, ai_summary, ai_cta, ai_angle, html_body",
    )
    .eq("id", emailId)
    .maybeSingle();

  return (data as AgentEmailInput | null) ?? null;
}

export function organicPostsToAgentInput(
  posts: Array<{
    id?: string;
    platform: string;
    post_id: string;
    content: string | null;
    media_urls: string[];
    likes: number;
    comments: number;
    shares: number;
    posted_at: string | null;
  }>,
): AgentOrganicPostInput[] {
  return posts.map((p) => ({
    id: p.id,
    platform: p.platform,
    post_id: p.post_id,
    content: p.content,
    media_urls: p.media_urls ?? [],
    likes: p.likes ?? 0,
    comments: p.comments ?? 0,
    shares: p.shares ?? 0,
    posted_at: p.posted_at,
  }));
}

export async function runAgentAfterAdsScrape(
  admin: SupabaseClient<Database>,
  params: { userId: string; competitorId: string; scrapeBatchId: string },
): Promise<void> {
  const { runAgentForUserCompetitor } = await import("@/lib/agent/run-agent");
  const newAds = await fetchAdsForAgentFromBatch(admin, params);
  if (newAds.length === 0) return;

  await runAgentForUserCompetitor(admin, {
    userId: params.userId,
    competitorId: params.competitorId,
    scrapeResults: { newAds },
  });
}
