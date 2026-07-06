import type { CompetitorStrategyOverviewPayload } from "@/lib/strategy-overview/payload-types";

/** Compact strategy payload for MCP — enough for analysis without dumping full map JSON. */
export function summarizeStrategyForMcp(cached: CompetitorStrategyOverviewPayload) {
  const map = cached.map;
  const cells = Array.isArray(map.funnelCells) ? map.funnelCells : [];

  return {
    pipeline_status: cached.pipelineStatus ?? null,
    total_ad_count: cached.totalAdCount ?? null,
    active_ad_count: map.activeAdCount ?? null,
    enriched_ad_count: cached.enrichedAdCount ?? null,
    derivation_quality: cached.derivationQuality ?? null,
    map_title: map.title ?? null,
    spend_band: map.spendVsSimilar ?? null,
    platform_count: map.platformCount ?? null,
    funnel_cells: cells.map((c) => ({
      id: c.id,
      platform: c.platform,
      stage: c.funnelStage,
      ad_count: c.adCount,
      est_spend_eur_low: c.estSpendEurLow,
      est_spend_eur_high: c.estSpendEurHigh,
    })),
    top_angles: (map.topAngles ?? []).slice(0, 10),
    angle_categories: (map.sidebarExtras?.angleCategories ?? []).slice(0, 12),
    format_mix: (map.sidebarExtras?.formatMix ?? []).slice(0, 8),
    tone_of_voice: map.toneOfVoice?.primary ?? null,
    dominant_format: map.dominantFormat ?? null,
    audience_signals: {
      age_range: map.audienceSignals?.ageRange ?? null,
      geo: map.audienceSignals?.geo ?? null,
      interests: (map.audienceSignals?.interests ?? []).slice(0, 8),
    },
    insight_cards: Object.entries(cached.insights ?? {})
      .filter(([, v]) => v && typeof v === "object" && "title" in (v as object))
      .map(([key, v]) => {
        const card = v as { title?: string; subtitle?: string };
        return { key, title: card.title ?? key, subtitle: card.subtitle ?? null };
      })
      .slice(0, 12),
  };
}
