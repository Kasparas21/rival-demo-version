import type {
  JourneyGoalDeal,
  JourneyGoalEdgePayload,
  JourneyPathIntent,
  JourneyPathIntentSummary,
  StrategyChannelSignals,
  StrategyJourneyGoal,
} from "@/lib/strategy-overview/payload-types";

export const PATH_INTENT_COLORS: Record<JourneyPathIntent, string> = {
  direct_sale: "#10b981",
  discount_sale: "#f59e0b",
  retargeting: "#8b5cf6",
  nurture: "#0ea5e9",
  awareness: "#60a5fa",
  lead_capture: "#6366f1",
};

export type JourneyIcpInsight = {
  id: string;
  label: string;
  value: string;
  detail: string;
  tone: "rose" | "amber" | "emerald" | "violet" | "slate";
};

export type JourneyChartSlice = {
  name: string;
  value: number;
  fill: string;
  key?: string;
};

export type JourneyGoalAnalytics = {
  insights: JourneyIcpInsight[];
  pathMix: JourneyChartSlice[];
  destinationBars: { name: string; share: number; ads: number }[];
  categoryBars: { name: string; share: number; ads: number }[];
  dealSources: JourneyChartSlice[];
  platformMix: JourneyChartSlice[];
  alignment: { direct: number; supporting: number };
  channelPulse: {
    organicPostsPerWeek: number | null;
    emailPerWeek: number | null;
    emailOfferSharePct: number | null;
    organicPlatforms: number;
  };
  concentrationPct: number;
  dominantPath: JourneyPathIntentSummary | null;
};

function formatCategoryLabel(label: string): string {
  if (/^\d{4,}$/.test(label.trim())) return "Collection page";
  if (label.length > 22) return `${label.slice(0, 20)}…`;
  return label;
}

function countAlignment(edges: JourneyGoalEdgePayload[]) {
  let direct = 0;
  let supporting = 0;
  for (const e of edges) {
    if (e.alignment === "direct") direct++;
    else supporting++;
  }
  return { direct, supporting };
}

function dealSourceSplit(deals: JourneyGoalDeal[]): JourneyChartSlice[] {
  let email = 0;
  let ad = 0;
  for (const d of deals) {
    if (d.source === "email") email++;
    else ad++;
  }
  const slices: JourneyChartSlice[] = [];
  if (email > 0) slices.push({ name: "Email", value: email, fill: "#f43f5e" });
  if (ad > 0) slices.push({ name: "Paid ads", value: ad, fill: "#3b82f6" });
  return slices;
}

function platformMixFromGoal(goal: StrategyJourneyGoal): JourneyChartSlice[] {
  const counts = new Map<string, number>();
  for (const c of goal.evidence.topCreatives) {
    counts.set(c.platform, (counts.get(c.platform) ?? 0) + 1);
  }
  for (const lp of goal.evidence.landingPreviews) {
    for (const p of lp.platforms) {
      counts.set(p, (counts.get(p) ?? 0) + lp.adCount);
    }
  }
  const palette = ["#1877F2", "#34A853", "#111827", "#0A66C2", "#E60023", "#ca8a04", "#8b5cf6"];
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, value], i) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      fill: palette[i % palette.length]!,
      key: name,
    }));
}

function buildIcpInsights(
  goal: StrategyJourneyGoal,
  analytics: Pick<
    JourneyGoalAnalytics,
    "dominantPath" | "concentrationPct" | "alignment" | "channelPulse"
  >,
): JourneyIcpInsight[] {
  const insights: JourneyIcpInsight[] = [];
  const ev = goal.evidence;

  if (analytics.dominantPath) {
    insights.push({
      id: "play",
      label: "Primary play",
      value: analytics.dominantPath.label,
      detail: `${analytics.dominantPath.sharePct}% of BOF paths · ${analytics.dominantPath.pathCount} route${analytics.dominantPath.pathCount === 1 ? "" : "s"}`,
      tone: analytics.dominantPath.intent === "discount_sale" ? "amber" : "emerald",
    });
  }

  if (ev.deals.length > 0) {
    const emailDeals = ev.deals.filter((d) => d.source === "email").length;
    insights.push({
      id: "promo",
      label: "Promo pressure",
      value: `${ev.deals.length} active offer${ev.deals.length === 1 ? "" : "s"}`,
      detail:
        emailDeals > 0
          ? `${emailDeals} from email${ev.emailOfferSummary ? ` · ${ev.emailOfferSummary}` : ""}`
          : "Pulled from BOF ad copy",
      tone: "rose",
    });
  }

  if (analytics.concentrationPct > 0) {
    const top = goal.topDestinations[0];
    insights.push({
      id: "lp",
      label: "LP concentration",
      value: `${analytics.concentrationPct}% on top page`,
      detail: top
        ? `${top.displayUrl} · ${top.adCount} BOF ads`
        : "Traffic clusters on a few destinations",
      tone: analytics.concentrationPct >= 45 ? "amber" : "slate",
    });
  }

  if (analytics.alignment.direct > 0 || analytics.alignment.supporting > 0) {
    insights.push({
      id: "paths",
      label: "Path mix",
      value: `${analytics.alignment.direct} direct · ${analytics.alignment.supporting} supporting`,
      detail:
        analytics.alignment.supporting > analytics.alignment.direct
          ? "Awareness/nurture feeds conversion — not every path closes"
          : "Most paths aim straight at conversion",
      tone: "violet",
    });
  }

  if (analytics.channelPulse.emailPerWeek != null && analytics.channelPulse.emailPerWeek > 0) {
    insights.push({
      id: "email",
      label: "Email cadence",
      value: `~${analytics.channelPulse.emailPerWeek.toFixed(1)}/wk`,
      detail:
        analytics.channelPulse.emailOfferSharePct != null
          ? `${Math.round(analytics.channelPulse.emailOfferSharePct)}% of emails carry offers`
          : "Captured inbox activity in lookback window",
      tone: "rose",
    });
  }

  if (ev.angleHighlights.length > 0) {
    insights.push({
      id: "angles",
      label: "Messaging",
      value: ev.angleHighlights.slice(0, 2).join(" · "),
      detail: `${ev.angleHighlights.length} angle${ev.angleHighlights.length === 1 ? "" : "s"} on BOF creatives`,
      tone: "slate",
    });
  }

  return insights.slice(0, 4);
}

export function computeJourneyGoalAnalytics(
  goal: StrategyJourneyGoal,
  channelSignals?: StrategyChannelSignals | null,
): JourneyGoalAnalytics {
  const ev = goal.evidence;
  const dominantPath = goal.pathIntentBreakdown[0] ?? null;
  const concentrationPct = goal.topDestinations[0]?.sharePct ?? 0;

  const pathMix = goal.pathIntentBreakdown.map((p) => ({
    name: p.label,
    value: p.sharePct,
    fill: PATH_INTENT_COLORS[p.intent],
    key: p.intent,
  }));

  const destinationSource =
    goal.topDestinations.length > 0 ? goal.topDestinations : ev.landingPreviews;

  const destinationBars = destinationSource.slice(0, 6).map((d) => {
    const preview = "categoryLabel" in d ? d : null;
    const name =
      preview?.categoryLabel != null && String(preview.categoryLabel).trim()
        ? formatCategoryLabel(String(preview.categoryLabel))
        : d.displayUrl;
    return {
      name,
      share: d.sharePct,
      ads: d.adCount,
    };
  });

  const categoryBars = ev.categories.slice(0, 6).map((c) => ({
    name: formatCategoryLabel(c.label),
    share: c.sharePct,
    ads: c.adCount,
  }));

  const alignment = countAlignment(goal.goalEdges);
  const dealSources = dealSourceSplit(ev.deals);
  const platformMix = platformMixFromGoal(goal);

  const organicNodes = channelSignals?.organicNodes ?? [];
  const emailNode = channelSignals?.emailNode ?? null;
  const channelPulse = {
    organicPostsPerWeek:
      organicNodes.length > 0
        ? organicNodes.reduce((s, n) => s + n.postsPerWeek, 0) / organicNodes.length
        : null,
    emailPerWeek: emailNode?.emailsPerWeek ?? null,
    emailOfferSharePct: emailNode?.offerSharePct ?? null,
    organicPlatforms: organicNodes.length,
  };

  const analyticsBase = {
    dominantPath,
    concentrationPct,
    alignment,
    channelPulse,
  };

  return {
    insights: buildIcpInsights(goal, analyticsBase),
    pathMix,
    destinationBars,
    categoryBars,
    dealSources,
    platformMix,
    alignment,
    channelPulse,
    concentrationPct,
    dominantPath,
  };
}

export function parseJourneySteps(summary: string): string[] {
  return summary
    .split("→")
    .map((s) => s.trim())
    .filter(Boolean);
}
