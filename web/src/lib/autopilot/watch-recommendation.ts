import { isAlertType, type AlertType } from "@/lib/alerts/alert-types";
import { anthropicHaiku } from "@/lib/llm/anthropic";
import type { CompetitorStrategyOverviewPayload } from "@/lib/strategy-overview/payload-types";

import { watchFallbackRecommendation } from "./watch-fallback-templates";
import type { WatchRecommendation } from "./types";

const HEADLINE_MAX = 90;
const RECOMMENDATION_MAX = 220;

function truncate(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function strategySummaryForPrompt(payload: CompetitorStrategyOverviewPayload | null): string {
  if (!payload) return "";
  const parts: string[] = [];
  const footprint = payload.insights?.platform_footprint;
  if (footprint?.aiNarrative?.trim()) parts.push(`Platform footprint: ${footprint.aiNarrative.trim()}`);
  if (footprint?.subtitle?.trim()) parts.push(footprint.subtitle.trim());
  const budget = payload.insights?.budget_allocation;
  if (budget?.insight?.trim()) parts.push(`Budget: ${budget.insight.trim()}`);
  const angles = payload.insights?.angle_clustering?.angles?.slice(0, 3).map((a) => a.angle);
  if (angles?.length) parts.push(`Active angles: ${angles.join(", ")}`);
  return parts.join("\n");
}

function parseRecommendationJson(text: string): WatchRecommendation | null {
  const trimmed = text.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    const o = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    const headline = typeof o.headline === "string" ? truncate(o.headline, HEADLINE_MAX) : "";
    const recommendation =
      typeof o.recommendation === "string" ? truncate(o.recommendation, RECOMMENDATION_MAX) : "";
    const conf = o.confidence;
    const confidence =
      conf === "high" || conf === "medium" || conf === "low" ? conf : "medium";
    if (!headline || !recommendation) return null;
    return { headline, recommendation, confidence };
  } catch {
    return null;
  }
}

async function callHaikuOnce(params: {
  alertType: AlertType;
  competitorName: string;
  alertTitle: string;
  alertBody: string | null;
  strategyContext: string;
}): Promise<WatchRecommendation | null> {
  const systemPrompt = `You are a competitive intelligence advisor for marketers. Respond with ONLY valid JSON (no markdown): {"headline": string (max 90 chars), "recommendation": string (max 220 chars, imperative and concrete — what to do next), "confidence": "high"|"medium"|"low"}. Every output must end in a recommended action, not just information.`;

  const userContent = [
    `Competitor: ${params.competitorName}`,
    `Alert type: ${params.alertType}`,
    `Alert title: ${params.alertTitle}`,
    params.alertBody ? `Alert detail: ${params.alertBody}` : "",
    params.strategyContext ? `Strategy context:\n${params.strategyContext}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const result = await anthropicHaiku({
    systemPrompt,
    messages: [{ role: "user", content: userContent }],
    maxTokens: 512,
  });

  if (!result.ok) return null;
  return parseRecommendationJson(result.text);
}

export async function generateWatchRecommendation(params: {
  alertType: string;
  competitorName: string;
  alertTitle: string;
  alertBody: string | null;
  strategyPayload: CompetitorStrategyOverviewPayload | null;
}): Promise<WatchRecommendation> {
  const type = isAlertType(params.alertType) ? params.alertType : "new_angle";
  const name = params.competitorName.trim() || "Competitor";
  const strategyContext = strategySummaryForPrompt(params.strategyPayload);

  let rec = await callHaikuOnce({
    alertType: type,
    competitorName: name,
    alertTitle: params.alertTitle,
    alertBody: params.alertBody,
    strategyContext,
  });

  if (!rec) {
    rec = await callHaikuOnce({
      alertType: type,
      competitorName: name,
      alertTitle: params.alertTitle,
      alertBody: params.alertBody,
      strategyContext: "",
    });
  }

  return rec ?? watchFallbackRecommendation(type, name);
}
