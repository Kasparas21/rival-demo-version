import type {
  StrategyChannelSignals,
  StrategyJourneyGoal,
} from "@/lib/strategy-overview/payload-types";

export function summarizeChannelSignalsForMcp(signals: StrategyChannelSignals | null) {
  if (!signals) return null;

  return {
    organic_nodes: (signals.organicNodes ?? []).map((n) => ({
      id: n.id,
      platform: n.platform,
      label: n.label,
      post_count: n.postCount,
      posts_per_week: n.postsPerWeek,
      avg_engagement: n.avgEngagement,
      last_post_at: n.lastPostAt,
      top_themes: n.topThemes.slice(0, 5),
      paired_paid_platform: n.pairedPaidPlatform,
    })),
    email_node: signals.emailNode
      ? {
          email_count: signals.emailNode.emailCount,
          emails_per_week: signals.emailNode.emailsPerWeek,
          dominant_type: signals.emailNode.dominantType,
          dominant_angle: signals.emailNode.dominantAngle,
          offer_share_pct: signals.emailNode.offerSharePct,
          last_email_at: signals.emailNode.lastEmailAt,
          esp_detected: signals.emailNode.espDetected,
        }
      : null,
    channel_edges: (signals.channelEdges ?? []).map((e) => ({
      from: e.from,
      to: e.to,
      kind: e.kind,
      confidence: e.confidence,
      reasoning: e.reasoning,
      style: e.style,
    })),
  };
}

/** Full journey goal payload for MCP — mirrors dashboard JourneyGoalSheet data. */
export function summarizeJourneyGoalForMcp(goal: StrategyJourneyGoal) {
  return {
    kind: goal.kind,
    label: goal.label,
    subtitle: goal.subtitle,
    catalog_breadth: goal.catalogBreadth,
    catalog_label: goal.catalogLabel,
    confidence: goal.confidence,
    journey_summary: goal.journeySummary,
    macro_framing: goal.macroFraming,
    signals: goal.signals,
    path_intent_breakdown: goal.pathIntentBreakdown,
    top_destinations: goal.topDestinations,
    goal_edges: goal.goalEdges.map((e) => ({
      from: e.from,
      path_intent: e.pathIntent,
      path_intent_label: e.pathIntentLabel,
      alignment: e.alignment,
      confidence: e.confidence,
      reasoning: e.reasoning,
      style: e.style,
    })),
    evidence: {
      narrative: goal.evidence.narrative,
      deals: goal.evidence.deals,
      categories: goal.evidence.categories,
      top_creatives: goal.evidence.topCreatives,
      landing_previews: goal.evidence.landingPreviews,
      angle_highlights: goal.evidence.angleHighlights,
      email_offer_summary: goal.evidence.emailOfferSummary,
    },
    computed_at: goal.computedAt,
  };
}
