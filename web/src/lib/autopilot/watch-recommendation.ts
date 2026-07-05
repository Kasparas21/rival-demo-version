import { isAlertType, type AlertType } from "@/lib/alerts/alert-types";
import { llmFast } from "@/lib/llm/anthropic";
import type { CompetitorStrategyOverviewPayload } from "@/lib/strategy-overview/payload-types";
import type { Json } from "@/lib/supabase/types";

import { watchFallbackRecommendation } from "./watch-fallback-templates";
import type { UserBrandContext } from "./user-brand-context";
import type { WatchRecommendation } from "./types";

const HEADLINE_MAX = 100;
const CONTEXT_MAX = 450;
const RECOMMENDATION_MAX = 550;

function truncate(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

/** Hard rule: autopilot copy never uses em/en dashes — always a plain hyphen. */
function normalizeDashes(s: string): string {
  return s.replace(/\s*[—–]\s*/g, " - ");
}

function strategySummaryForPrompt(payload: CompetitorStrategyOverviewPayload | null): string {
  if (!payload) return "";
  const parts: string[] = [];
  const footprint = payload.insights?.platform_footprint;
  if (footprint?.aiNarrative?.trim()) parts.push(`Platform footprint: ${footprint.aiNarrative.trim()}`);
  if (footprint?.subtitle?.trim()) parts.push(footprint.subtitle.trim());
  const platforms = footprint?.platforms?.slice(0, 5).map((p) => {
    const ads = typeof p.activeAds === "number" ? ` (${p.activeAds} ads)` : "";
    return `${p.platform}${ads}`;
  });
  if (platforms?.length) parts.push(`Active platforms: ${platforms.join(", ")}`);
  const budget = payload.insights?.budget_allocation;
  if (budget?.insight?.trim()) parts.push(`Budget: ${budget.insight.trim()}`);
  const angles = payload.insights?.angle_clustering?.angles?.slice(0, 4).map((a) => {
    const share = typeof a.sharePct === "number" ? ` ${Math.round(a.sharePct)}%` : "";
    return `${a.angle}${share}`;
  });
  if (angles?.length) parts.push(`Active angles: ${angles.join("; ")}`);
  return parts.join("\n");
}

function alertMetadataSummary(metadata: Json): string {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return "";
  const m = metadata as Record<string, unknown>;
  const parts: string[] = [];
  if (typeof m.platform === "string") parts.push(`Platform: ${m.platform}`);
  if (typeof m.angle === "string") parts.push(`Messaging angle: ${m.angle}`);
  if (typeof m.activeAds === "number") parts.push(`Active ads on platform: ${m.activeAds}`);
  if (typeof m.priorActiveAds === "number") parts.push(`Prior active ads: ${m.priorActiveAds}`);
  if (typeof m.scoreBefore === "number" && typeof m.scoreAfter === "number") {
    parts.push(`Activity score: ${m.scoreBefore} → ${m.scoreAfter}`);
  }
  if (typeof m.scoreDelta === "number") {
    parts.push(`Activity change: ${m.scoreDelta > 0 ? "+" : ""}${m.scoreDelta}`);
  }
  if (typeof m.email_type === "string") parts.push(`Email type: ${m.email_type}`);
  if (typeof m.subject === "string") parts.push(`Email subject: ${m.subject}`);
  if (typeof m.offer === "string") parts.push(`Offer: ${m.offer}`);
  return parts.join("; ");
}

function userBrandSummary(brand: UserBrandContext | null | undefined): string {
  if (!brand) return "";
  const parts = [`Client brand: ${brand.brandName}`];
  if (brand.brandDomain) parts.push(`Domain: ${brand.brandDomain}`);
  if (brand.brandContext) parts.push(`Positioning: ${brand.brandContext}`);
  return parts.join("\n");
}

function parseRecommendationJson(text: string): WatchRecommendation | null {
  const trimmed = text.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    const o = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    const headline =
      typeof o.headline === "string" ? truncate(normalizeDashes(o.headline), HEADLINE_MAX) : "";
    const context = typeof o.context === "string" ? truncate(normalizeDashes(o.context), CONTEXT_MAX) : "";
    const recommendation =
      typeof o.recommendation === "string"
        ? truncate(normalizeDashes(o.recommendation), RECOMMENDATION_MAX)
        : "";
    const conf = o.confidence;
    const confidence =
      conf === "high" || conf === "medium" || conf === "low" ? conf : "medium";
    if (!headline || !recommendation) return null;
    return {
      headline,
      context: context || headline,
      recommendation,
      confidence,
    };
  } catch {
    return null;
  }
}

async function callLlmOnce(params: {
  alertType: AlertType;
  competitorName: string;
  alertTitle: string;
  alertBody: string | null;
  alertMetadata: string;
  strategyContext: string;
  userBrandContext: string;
}): Promise<WatchRecommendation | null> {
  const systemPrompt = `You are a senior performance marketing strategist advising a client who runs paid ads (Meta, Google, TikTok, YouTube, etc.). Personalize every word to THEIR brand and competitive position.

Respond with ONLY valid JSON (no markdown):
{
  "headline": string (max 100 chars — urgent, specific hook naming platform/angle/offer when known),
  "context": string (max 450 chars — 2-4 sentences: what the competitor changed, on which channels, scale signals, creative/offer specifics from the data; write as intel briefing for the client),
  "recommendation": string (max 550 chars — concrete paid-media playbook: which channels to act on, creative/audience tests, defensive vs offensive moves, rough priority and timeline; reference the client's brand where relevant),
  "confidence": "high"|"medium"|"low"
}

Every output must end in actionable paid-media steps, not generic advice. Never use em dashes or en dashes anywhere in the copy; use a plain hyphen (-) instead.`;

  const userContent = [
    params.userBrandContext,
    `Competitor: ${params.competitorName}`,
    `Alert type: ${params.alertType}`,
    `Alert title: ${params.alertTitle}`,
    params.alertBody ? `Alert detail: ${params.alertBody}` : "",
    params.alertMetadata ? `Alert signals: ${params.alertMetadata}` : "",
    params.strategyContext ? `Competitor strategy context:\n${params.strategyContext}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const result = await llmFast({
    task: "watch_recommendation",
    systemPrompt,
    messages: [{ role: "user", content: userContent }],
    maxTokens: 1024,
  });

  if (!result.ok) return null;
  return parseRecommendationJson(result.text);
}

export async function generateWatchRecommendation(params: {
  alertType: string;
  competitorName: string;
  alertTitle: string;
  alertBody: string | null;
  alertMetadata?: Json;
  strategyPayload: CompetitorStrategyOverviewPayload | null;
  userBrand?: UserBrandContext | null;
}): Promise<WatchRecommendation> {
  const type = isAlertType(params.alertType) ? params.alertType : "new_angle";
  const name = params.competitorName.trim() || "Competitor";
  const strategyContext = strategySummaryForPrompt(params.strategyPayload);
  const alertMetadata = alertMetadataSummary(params.alertMetadata ?? null);
  const userBrandContext = userBrandSummary(params.userBrand);

  let rec = await callLlmOnce({
    alertType: type,
    competitorName: name,
    alertTitle: params.alertTitle,
    alertBody: params.alertBody,
    alertMetadata,
    strategyContext,
    userBrandContext,
  });

  if (!rec) {
    rec = await callLlmOnce({
      alertType: type,
      competitorName: name,
      alertTitle: params.alertTitle,
      alertBody: params.alertBody,
      alertMetadata,
      strategyContext: "",
      userBrandContext,
    });
  }

  const out = rec ?? watchFallbackRecommendation(type, name, params.userBrand);
  return {
    ...out,
    headline: normalizeDashes(out.headline),
    context: normalizeDashes(out.context),
    recommendation: normalizeDashes(out.recommendation),
  };
}
