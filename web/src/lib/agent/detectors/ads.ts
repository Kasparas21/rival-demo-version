import type { SupabaseClient } from "@supabase/supabase-js";

import { calculateThreatScore } from "@/lib/agent/threat-score";
import type { AgentAdInput, AgentBaselineMetrics, DetectedAgentSignal } from "@/lib/agent/types";
import type { Database } from "@/lib/supabase/types";

function extractCtaFromAd(ad: AgentAdInput): string | null {
  if (ad.cta?.trim()) return ad.cta.trim();
  const raw = ad.raw_payload;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const cta = (raw as Record<string, unknown>).cta ?? (raw as Record<string, unknown>).call_to_action;
    if (typeof cta === "string" && cta.trim()) return cta.trim();
  }
  const match = ad.ad_text.match(/\b(shop now|learn more|sign up|get started|buy now|try free)\b/i);
  return match ? match[0] : null;
}

function extractHeadline(ad: AgentAdInput): string | null {
  if (ad.headline?.trim()) return ad.headline.trim();
  const firstLine = ad.ad_text.split("\n").map((l) => l.trim()).find(Boolean);
  return firstLine ?? null;
}

function groupAdsByStableKey(ads: AgentAdInput[]): AgentAdInput[] {
  const byKey = new Map<string, AgentAdInput & { platforms: string[] }>();

  for (const ad of ads) {
    const existing = byKey.get(ad.stable_ad_key);
    if (!existing) {
      byKey.set(ad.stable_ad_key, { ...ad, platforms: [ad.platform] });
      continue;
    }
    if (!existing.platforms.includes(ad.platform)) existing.platforms.push(ad.platform);
    if (new Date(ad.last_seen_at).getTime() > new Date(existing.last_seen_at).getTime()) {
      byKey.set(ad.stable_ad_key, { ...ad, platforms: existing.platforms });
    }
  }

  return [...byKey.values()];
}

async function isNewAngle(
  admin: SupabaseClient<Database>,
  competitorId: string,
  ad: AgentAdInput,
): Promise<boolean> {
  const angle = ad.ai_extracted_angle?.trim().toLowerCase();
  if (!angle) return false;

  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const { data } = await admin
    .from("scraped_ads")
    .select("ai_extracted_angle")
    .eq("competitor_id", competitorId)
    .gte("first_seen_at", since)
    .neq("stable_ad_key", ad.stable_ad_key)
    .limit(200);

  const known = new Set(
    (data ?? [])
      .map((r) => r.ai_extracted_angle?.trim().toLowerCase())
      .filter(Boolean) as string[],
  );

  return !known.has(angle);
}

async function isNewCta(
  admin: SupabaseClient<Database>,
  competitorId: string,
  cta: string,
  stableAdKey: string,
): Promise<boolean> {
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const { data } = await admin
    .from("scraped_ads")
    .select("ad_text, raw_payload, stable_ad_key")
    .eq("competitor_id", competitorId)
    .gte("first_seen_at", since)
    .neq("stable_ad_key", stableAdKey)
    .limit(200);

  const normalized = cta.trim().toLowerCase();
  for (const row of data ?? []) {
    const existing = extractCtaFromAd(row as AgentAdInput);
    if (existing?.trim().toLowerCase() === normalized) return false;
  }
  return true;
}

async function detectNewPlatforms(
  admin: SupabaseClient<Database>,
  competitorId: string,
  platforms: string[],
): Promise<string[]> {
  const { data } = await admin
    .from("scraped_ads")
    .select("platform")
    .eq("competitor_id", competitorId);

  const historical = new Set((data ?? []).map((r) => r.platform));
  return platforms.filter((p) => !historical.has(p));
}

export async function detectAdsSignals(params: {
  admin: SupabaseClient<Database>;
  competitorId: string;
  newAds: AgentAdInput[];
  baseline: AgentBaselineMetrics;
}): Promise<DetectedAgentSignal[]> {
  const { admin, competitorId, newAds, baseline } = params;
  const signals: DetectedAgentSignal[] = [];
  const grouped = groupAdsByStableKey(newAds);
  const now = Date.now();

  for (const ad of grouped) {
    const daysRunning = Math.max(
      0,
      Math.round((now - new Date(ad.first_seen_at).getTime()) / 86_400_000),
    );
    const platforms = ad.platforms ?? [ad.platform];
    const headline = extractHeadline(ad);
    const cta = extractCtaFromAd(ad);
    const isNewAngleFlag = await isNewAngle(admin, competitorId, ad);

    if (daysRunning >= 7) {
      const threat = calculateThreatScore({
        days_running: daysRunning,
        platform_count: platforms.length,
        is_new_angle: isNewAngleFlag,
        baseline_avg_duration: baseline.ads?.avg_ad_duration_days ?? 5,
      });

      if (threat >= 5) {
        signals.push({
          signal_type: "new_winning_ad",
          source: "ads",
          threat_score: threat,
          payload: {
            ad,
            days_running: daysRunning,
            platforms,
            hook: headline,
            cta,
            creative_url: ad.ad_creative_url,
            is_new_angle: isNewAngleFlag,
          },
        });
      }
    }

    if (cta && (await isNewCta(admin, competitorId, cta, ad.stable_ad_key))) {
      signals.push({
        signal_type: "new_cta",
        source: "ads",
        threat_score: 6,
        payload: { ad, new_cta: cta },
      });
    }

    const newPlatforms = await detectNewPlatforms(admin, competitorId, platforms);
    if (newPlatforms.length > 0) {
      signals.push({
        signal_type: "platform_expansion",
        source: "ads",
        threat_score: 7,
        payload: { ad, new_platforms: newPlatforms },
      });
    }
  }

  return signals;
}
