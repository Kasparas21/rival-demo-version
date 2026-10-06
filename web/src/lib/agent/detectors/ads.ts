import type { SupabaseClient } from "@supabase/supabase-js";

import { calculateThreatScore } from "@/lib/agent/threat-score";
import type { AgentAdInput, AgentBaselineMetrics, DetectedAgentSignal } from "@/lib/agent/types";
import type { Database } from "@/lib/supabase/types";

function extractCtaFromAd(
  ad: Pick<AgentAdInput, "ad_text" | "raw_payload"> & { cta?: AgentAdInput["cta"] },
): string | null {
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

/** Recent ads compared against (30 days); one read per competitor instead of three per new ad. */
const RECENT_WINDOW_DAYS = 30;
const RECENT_ADS_LIMIT = 1000;

type DetectionContext = {
  /** angle (lowercase) → stable keys of recent ads using it */
  anglesByKey: Map<string, Set<string>>;
  /** CTA (lowercase) → stable keys of recent ads using it */
  ctasByKey: Map<string, Set<string>>;
  /** Platforms this competitor has any scraped ad on */
  knownPlatforms: Set<string>;
};

function addToIndex(index: Map<string, Set<string>>, value: string | null | undefined, stableKey: string): void {
  const v = value?.trim().toLowerCase();
  if (!v) return;
  const keys = index.get(v) ?? new Set<string>();
  keys.add(stableKey);
  index.set(v, keys);
}

/** True when some ad other than `stableKey` already uses `value`. */
function seenOnOtherAd(index: Map<string, Set<string>>, value: string, stableKey: string): boolean {
  const keys = index.get(value.trim().toLowerCase());
  if (!keys) return false;
  for (const k of keys) if (k !== stableKey) return true;
  return false;
}

async function loadDetectionContext(
  admin: SupabaseClient<Database>,
  competitorId: string,
  platforms: string[],
): Promise<DetectionContext> {
  const since = new Date(Date.now() - RECENT_WINDOW_DAYS * 86_400_000).toISOString();
  const [recentRes, platformHits] = await Promise.all([
    admin
      .from("scraped_ads")
      .select("stable_ad_key, ai_extracted_angle, ad_text, cta:raw_payload->>cta, call_to_action:raw_payload->>call_to_action")
      .eq("competitor_id", competitorId)
      .gte("first_seen_at", since)
      .order("first_seen_at", { ascending: false })
      .limit(RECENT_ADS_LIMIT),
    /** Existence per platform (at most 6 tiny reads) instead of every row the competitor has. */
    Promise.all(
      platforms.map(async (platform) => {
        const { data } = await admin
          .from("scraped_ads")
          .select("id")
          .eq("competitor_id", competitorId)
          .eq("platform", platform)
          .limit(1);
        return (data ?? []).length > 0 ? platform : null;
      }),
    ),
  ]);

  const anglesByKey = new Map<string, Set<string>>();
  const ctasByKey = new Map<string, Set<string>>();
  for (const row of (recentRes.data ?? []) as Array<{
    stable_ad_key: string;
    ai_extracted_angle: string | null;
    ad_text: string;
    cta: string | null;
    call_to_action: string | null;
  }>) {
    addToIndex(anglesByKey, row.ai_extracted_angle, row.stable_ad_key);
    const cta = extractCtaFromAd({
      ad_text: row.ad_text ?? "",
      raw_payload: { cta: row.cta, call_to_action: row.call_to_action },
    });
    addToIndex(ctasByKey, cta, row.stable_ad_key);
  }

  return {
    anglesByKey,
    ctasByKey,
    knownPlatforms: new Set(platformHits.filter((p): p is string => p !== null)),
  };
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
  const allPlatforms = [...new Set(grouped.flatMap((ad) => ad.platforms ?? [ad.platform]))];
  const ctx = await loadDetectionContext(admin, competitorId, allPlatforms);

  for (const ad of grouped) {
    const daysRunning = Math.max(
      0,
      Math.round((now - new Date(ad.first_seen_at).getTime()) / 86_400_000),
    );
    const platforms = ad.platforms ?? [ad.platform];
    const headline = extractHeadline(ad);
    const cta = extractCtaFromAd(ad);
    const angle = ad.ai_extracted_angle?.trim();
    const isNewAngleFlag = Boolean(angle) && !seenOnOtherAd(ctx.anglesByKey, angle!, ad.stable_ad_key);

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

    if (cta && !seenOnOtherAd(ctx.ctasByKey, cta, ad.stable_ad_key)) {
      signals.push({
        signal_type: "new_cta",
        source: "ads",
        threat_score: 6,
        payload: { ad, new_cta: cta },
      });
    }

    const newPlatforms = platforms.filter((p) => !ctx.knownPlatforms.has(p));
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
