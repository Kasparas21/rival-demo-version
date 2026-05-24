import type { AdDetailDrawerPayload } from "@/lib/ad-detail/ad-detail-types";
import type { AdDetailOpenSeed } from "@/lib/ad-detail/ad-detail-cache";
import type { Json } from "@/lib/supabase/types";

/** Minimal drawer payload for instant creative preview while full detail loads. */
export function adDetailPayloadFromSeed(seed: AdDetailOpenSeed): AdDetailDrawerPayload {
  const now = new Date().toISOString();
  return {
    ok: true,
    ad: {
      id: seed.adId,
      display_label: seed.display_label ?? seed.ad_text?.slice(0, 50) ?? "Ad preview",
      platform: seed.platform,
      format: seed.format ?? "unknown",
      ad_creative_url: seed.ad_creative_url ?? null,
      ad_text: seed.ad_text ?? "",
      cta: seed.cta ?? null,
      first_seen_at: seed.first_seen_at ?? now,
      last_seen_at: seed.last_seen_at ?? now,
      is_killed: seed.is_killed ?? false,
      lifespan_days: seed.lifespan_days ?? 0,
      raw_payload: (seed.raw_payload ?? {}) as Json,
    },
    competitor: {
      id: seed.competitor.id,
      name: seed.competitor.name,
      domain: seed.competitor.domain,
      logo_url: seed.competitor.logo_url ?? null,
      brand_context: null,
    },
    ai: {
      angle: null,
      funnel_stage: null,
      voice_tone: null,
      launch_date: null,
      enrichment_status: "unknown",
    },
    context: {
      landing_page_url: null,
      landing_page_display: null,
      is_creative_test_winner: false,
    },
  };
}

export function isFullAdDetailPayload(res: AdDetailDrawerPayload): boolean {
  return Boolean(res.ok && res.ad && res.competitor && res.ai && res.context);
}
