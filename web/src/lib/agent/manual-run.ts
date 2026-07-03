import type { SupabaseClient } from "@supabase/supabase-js";

import type { AgentAdInput, AgentEmailInput, AgentOrganicPostInput } from "@/lib/agent/types";
import type { Database } from "@/lib/supabase/types";

const RECENT_WINDOW_DAYS = 30;

function recentSinceIso(): string {
  return new Date(Date.now() - RECENT_WINDOW_DAYS * 86_400_000).toISOString();
}

export async function gatherRecentDataForManualAgentRun(
  admin: SupabaseClient<Database>,
  params: { userId: string; competitorId: string },
): Promise<{
  newAds: AgentAdInput[];
  newEmails: AgentEmailInput[];
  newOrganicPosts: AgentOrganicPostInput[];
}> {
  const since = recentSinceIso();

  const [adsRes, emailsRes, organicRes] = await Promise.all([
    admin
      .from("scraped_ads")
      .select(
        "id, platform, stable_ad_key, ad_text, ad_creative_url, first_seen_at, last_seen_at, is_active, ai_extracted_angle, raw_payload",
      )
      .eq("user_id", params.userId)
      .eq("competitor_id", params.competitorId)
      .eq("is_active", true)
      .gte("last_seen_at", since)
      .limit(200),
    admin
      .from("competitor_emails")
      .select(
        "id, subject, preview_text, received_at, email_type, ai_summary, ai_cta, ai_angle, html_body",
      )
      .eq("user_id", params.userId)
      .eq("competitor_id", params.competitorId)
      .gte("received_at", since)
      .order("received_at", { ascending: false })
      .limit(50),
    admin
      .from("organic_posts")
      .select("id, platform, post_id, content, media_urls, likes, comments, shares, posted_at")
      .eq("user_id", params.userId)
      .eq("competitor_id", params.competitorId)
      .gte("posted_at", since)
      .order("posted_at", { ascending: false })
      .limit(100),
  ]);

  return {
    newAds: (adsRes.data ?? []) as AgentAdInput[],
    newEmails: (emailsRes.data ?? []) as AgentEmailInput[],
    newOrganicPosts: (organicRes.data ?? []).map((p) => ({
      id: p.id,
      platform: p.platform,
      post_id: p.post_id,
      content: p.content,
      media_urls: p.media_urls ?? [],
      likes: p.likes ?? 0,
      comments: p.comments ?? 0,
      shares: p.shares ?? 0,
      posted_at: p.posted_at,
    })),
  };
}

export type ManualAgentRunResult = {
  ok: boolean;
  signalsDetected: number;
  delivered: boolean;
  message: string;
  error?: string;
};

export async function runManualAgentForCompetitor(
  admin: SupabaseClient<Database>,
  params: { userId: string; competitorId: string },
): Promise<ManualAgentRunResult> {
  const { getOrCreateAgentSettings, parseAgentChannels } = await import("@/lib/agent/settings");
  const { runAgentForUserCompetitor } = await import("@/lib/agent/run-agent");

  const settings = await getOrCreateAgentSettings(admin, params.userId);
  if (!settings.enabled) {
    return {
      ok: false,
      signalsDetected: 0,
      delivered: false,
      message: "Rival Agent is disabled. Enable it in Settings.",
      error: "agent_disabled",
    };
  }

  const channels = parseAgentChannels(settings.channels);
  const hasChannel =
    (channels.slack?.enabled && channels.slack.webhook_url?.trim()) ||
    (channels.discord?.enabled && channels.discord.webhook_url?.trim()) ||
    channels.email?.enabled;

  if (!hasChannel) {
    return {
      ok: false,
      signalsDetected: 0,
      delivered: false,
      message: "Configure at least one delivery channel in Settings → Rival Agent.",
      error: "no_channels",
    };
  }

  const data = await gatherRecentDataForManualAgentRun(admin, params);
  const hasData =
    data.newAds.length > 0 || data.newEmails.length > 0 || data.newOrganicPosts.length > 0;

  if (!hasData) {
    return {
      ok: true,
      signalsDetected: 0,
      delivered: false,
      message: "No recent competitor data to analyze. Run a scrape first.",
    };
  }

  const outcome = await runAgentForUserCompetitor(admin, {
    userId: params.userId,
    competitorId: params.competitorId,
    scrapeResults: data,
    skipColdStart: true,
    skipDuplicateCheck: true,
  });

  if (outcome.signalsDetected === 0) {
    return {
      ok: true,
      signalsDetected: 0,
      delivered: false,
      message: "No high-signal moves detected in recent data.",
    };
  }

  if (!outcome.delivered) {
    return {
      ok: true,
      signalsDetected: outcome.signalsDetected,
      delivered: false,
      message:
        outcome.skippedReason ??
        `Detected ${outcome.signalsDetected} signal(s) but nothing was sent. Check your threat threshold in Settings.`,
    };
  }

  return {
    ok: true,
    signalsDetected: outcome.signalsDetected,
    delivered: true,
    message: `Intel sent — ${outcome.signalsDetected} signal${outcome.signalsDetected === 1 ? "" : "s"} analyzed.`,
  };
}
