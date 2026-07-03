import type { SupabaseClient } from "@supabase/supabase-js";

import {
  AGENT_COLD_START_CYCLES,
  type AgentBaselineMetrics,
  type AgentScrapeCycles,
  type AgentSignalSource,
} from "@/lib/agent/types";
import type { Database, Json } from "@/lib/supabase/types";

const BASELINE_WINDOW_DAYS = 30;

function parseScrapeCycles(raw: Json | null | undefined): AgentScrapeCycles {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ads: 0, email: 0, organic: 0 };
  }
  const o = raw as Record<string, unknown>;
  return {
    ads: typeof o.ads === "number" ? o.ads : 0,
    email: typeof o.email === "number" ? o.email : 0,
    organic: typeof o.organic === "number" ? o.organic : 0,
  };
}

function parseBaseline(raw: Json | null | undefined): AgentBaselineMetrics {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as AgentBaselineMetrics;
}

export async function getCompetitorBaseline(
  admin: SupabaseClient<Database>,
  competitorId: string,
): Promise<{ baseline: AgentBaselineMetrics; cycles: AgentScrapeCycles }> {
  const { data } = await admin
    .from("saved_competitors")
    .select("baseline_metrics, agent_scrape_cycles")
    .eq("id", competitorId)
    .maybeSingle();

  return {
    baseline: parseBaseline(data?.baseline_metrics),
    cycles: parseScrapeCycles(data?.agent_scrape_cycles),
  };
}

export function shouldSkipDetection(cycles: AgentScrapeCycles, source: AgentSignalSource): boolean {
  if (source === "cross_competitor" || source === "strategy_map") return false;
  const key = source as keyof AgentScrapeCycles;
  return (cycles[key] ?? 0) < AGENT_COLD_START_CYCLES;
}

export async function incrementScrapeCycle(
  admin: SupabaseClient<Database>,
  competitorId: string,
  source: AgentSignalSource,
): Promise<AgentScrapeCycles> {
  if (source === "cross_competitor" || source === "strategy_map") {
    const { cycles } = await getCompetitorBaseline(admin, competitorId);
    return cycles;
  }

  const key = source as keyof AgentScrapeCycles;
  const { cycles } = await getCompetitorBaseline(admin, competitorId);
  const next = { ...cycles, [key]: (cycles[key] ?? 0) + 1 };

  await admin
    .from("saved_competitors")
    .update({ agent_scrape_cycles: next as unknown as Json })
    .eq("id", competitorId);

  return next;
}

function windowStartIso(now = new Date()): string {
  return new Date(now.getTime() - BASELINE_WINDOW_DAYS * 86_400_000).toISOString();
}

export async function recalculateBaseline(
  admin: SupabaseClient<Database>,
  competitorId: string,
  userId: string,
): Promise<AgentBaselineMetrics> {
  const since = windowStartIso();

  const [adsRes, emailRes, organicRes] = await Promise.all([
    admin
      .from("scraped_ads")
      .select("platform, first_seen_at, last_seen_at, is_active")
      .eq("competitor_id", competitorId)
      .eq("user_id", userId)
      .gte("first_seen_at", since),
    admin
      .from("competitor_emails")
      .select("received_at, ai_angle, email_type")
      .eq("competitor_id", competitorId)
      .eq("user_id", userId)
      .gte("received_at", since),
    admin
      .from("organic_posts")
      .select("likes, comments, shares, posted_at")
      .eq("competitor_id", competitorId)
      .eq("user_id", userId)
      .gte("posted_at", since),
  ]);

  const ads = adsRes.data ?? [];
  const emails = emailRes.data ?? [];
  const posts = organicRes.data ?? [];

  const now = Date.now();
  let totalDurationDays = 0;
  let durationCount = 0;
  const platformSet = new Set<string>();
  let activeAds = 0;

  for (const ad of ads) {
    platformSet.add(ad.platform);
    if (ad.is_active) activeAds += 1;
    const first = new Date(ad.first_seen_at).getTime();
    const last = new Date(ad.last_seen_at).getTime();
    const days = Math.max(0, Math.round((Math.min(now, last) - first) / 86_400_000));
    totalDurationDays += days;
    durationCount += 1;
  }

  const avgAdDuration = durationCount > 0 ? totalDurationDays / durationCount : 5;
  const weeksInWindow = BASELINE_WINDOW_DAYS / 7;
  const avgEmailsPerWeek = emails.length / weeksInWindow;

  const hookTypes = new Set<string>();
  for (const e of emails) {
    if (e.ai_angle?.trim()) hookTypes.add(e.ai_angle.trim().toLowerCase());
    if (e.email_type?.trim()) hookTypes.add(e.email_type.trim().toLowerCase());
  }

  let totalLikes = 0;
  let totalComments = 0;
  let totalShares = 0;
  for (const p of posts) {
    totalLikes += p.likes ?? 0;
    totalComments += p.comments ?? 0;
    totalShares += p.shares ?? 0;
  }
  const postCount = posts.length || 1;

  const baseline: AgentBaselineMetrics = {
    ads: {
      avg_ad_duration_days: Math.round(avgAdDuration * 10) / 10,
      avg_active_ads: activeAds,
      platforms: [...platformSet],
    },
    email: {
      avg_emails_per_week: Math.round(avgEmailsPerWeek * 10) / 10,
      common_hooks: [...hookTypes].slice(0, 10),
    },
    organic: {
      avg_likes: Math.round(totalLikes / postCount),
      avg_comments: Math.round(totalComments / postCount),
      avg_shares: Math.round(totalShares / postCount),
      post_freq_per_week: Math.round((posts.length / weeksInWindow) * 10) / 10,
    },
  };

  await admin
    .from("saved_competitors")
    .update({ baseline_metrics: baseline as unknown as Json })
    .eq("id", competitorId);

  return baseline;
}
