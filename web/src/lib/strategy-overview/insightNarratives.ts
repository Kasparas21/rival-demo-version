/**
 * Single OpenRouter pass: strategic narratives for Strategy Insight cards + map tone/audience,
 * grounded in derived metrics and sampled ad copy from scraped rows.
 */

import { z } from "zod";

import { openRouterChatText } from "@/lib/llm/openrouter";
import type { CompetitorStrategyOverviewPayload } from "@/lib/strategy-overview/payload-types";
import { parseStage, type ScrapedAdInput } from "@/lib/strategy-overview/strategyDerivation";

function stripJsonFences(text: string): string {
  let t = text.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
  }
  return t.trim();
}

const insightLlmSchema = z.object({
  funnel_architecture: z.string().optional(),
  budget_allocation: z.string().optional(),
  creative_cadence: z.string().optional(),
  audience_signal_map: z.string().optional(),
  angle_clustering: z.string().optional(),
  voice_tone_fingerprint: z.string().optional(),
  performance_pulse: z.string().optional(),
  tone_primary: z.string().optional(),
  tone_attributes: z.array(z.string()).optional(),
  budget_insight: z.string().optional(),
  audience_interests: z.array(z.string()).optional(),
  audience_age_range: z.string().optional(),
  audience_geo: z.string().optional(),
  targeting_types: z.array(z.string()).optional(),
});

function enrichedAdsForSample(ads: ScrapedAdInput[]): ScrapedAdInput[] {
  return ads.filter(
    (a) =>
      a.ai_extracted_angle != null &&
      a.ai_extracted_angle.trim().length > 0 &&
      parseStage(a.funnel_stage) != null &&
      (a.ad_text ?? "").trim().length > 10
  );
}

const MIN_ENRICHED_FOR_INSIGHT_LLM = 5;

export async function enrichStrategyOverviewWithInsightLLM(
  payload: CompetitorStrategyOverviewPayload,
  ads: ScrapedAdInput[]
): Promise<{ payload: CompetitorStrategyOverviewPayload; usageCostUsd: number }> {
  let usageCostUsd = 0;

  if (!process.env.OPENROUTER_API_KEY?.trim() || ads.length === 0) {
    const n = enrichedAdsForSample(ads).length;
    console.log(`[insightLLM] sample size=${n} | enrichedOnly=true (skip: no key or zero ads)`);
    console.log(`[insightLLM] response valid=false`);
    return { payload, usageCostUsd };
  }

  const enrichedAds = enrichedAdsForSample(ads);
  if (enrichedAds.length < MIN_ENRICHED_FOR_INSIGHT_LLM) {
    console.log(
      `[insightLLM] sample size=${enrichedAds.length} | enrichedOnly=true — skip LLM (insufficient enriched)`
    );
    console.log(`[insightLLM] response valid=false`);
    return {
      payload: { ...payload, insufficientEnrichedAds: true },
      usageCostUsd,
    };
  }

  const sample = enrichedAds.slice(0, 48).map((a) => ({
    platform: a.platform,
    format: a.format,
    text: (a.ad_text ?? "").slice(0, 260),
    angle: a.ai_extracted_angle,
    funnel: a.funnel_stage,
  }));

  console.log(`[insightLLM] sample size=${sample.length} | enrichedOnly=true`);

  const { map, insights } = payload;

  const digest = {
    brand: map.competitor,
    activeAdCount: map.activeAdCount,
    totalAdSpendEur: {
      mid: map.totalAdSpend.value,
      low: map.totalAdSpend.low ?? map.totalAdSpend.value,
      high: map.totalAdSpend.high ?? map.totalAdSpend.value,
    },
    brandScaleScore: map.totalAdSpend.brandScaleScore ?? 1,
    platforms: map.platformNodes.map((n) => ({
      platform: n.platform,
      label: n.label,
      ads: n.adCount,
      funnelStage: n.funnelStage,
      estSpendEur: n.estSpendEur,
      estSpendEurLow: n.estSpendEurLow ?? n.estSpendEur,
      estSpendEurHigh: n.estSpendEurHigh ?? n.estSpendEur,
    })),
    funnelEdges: map.funnelEdges,
    topAngles: map.topAngles,
    dominantFormat: map.dominantFormat,
    spendBand: map.spendVsSimilar,
  };

  const res = await openRouterChatText({
    messages: [
      {
        role: "system",
        content: `You are a performance marketing strategist analyzing a competitor's paid advertising strategy. You will receive a structured JSON digest of their ad activity and a sample of real ad creatives.

CRITICAL RULES:
- Every claim you make must be directly traceable to a specific ad in the sample or a metric in the digest. Do not generalize.
- If the sample shows only 1-2 platforms, only analyze those platforms. Do not speculate about platforms not in the data.
- Funnel stage assignments come from the pre-labeled 'funnel' field — trust those labels, do not re-classify.
- Angle assignments come from the pre-labeled 'angle' field — use them to identify dominant patterns.
- Output ONLY valid JSON matching the exact schema provided. No prose outside the JSON object.`,
      },
      {
        role: "user",
        content: `Analyze this competitor's paid social / search strategy.

Derived summary (JSON):
${JSON.stringify(digest)}

Representative ads (${sample.length} enriched of ${ads.length} total, truncated):
${JSON.stringify(sample)}

Return ONLY valid JSON, no markdown. Each narrative value: 2–4 sentences, max ~520 characters.
{
  "funnel_architecture": "",
  "budget_allocation": "",
  "creative_cadence": "",
  "audience_signal_map": "",
  "angle_clustering": "",
  "voice_tone_fingerprint": "",
  "performance_pulse": "",
  "tone_primary": "short phrase",
  "tone_attributes": ["3-5 labels"],
  "budget_insight": "one punchy sentence about estimated spend / platform mix",
  "audience_interests": ["3 inferred interest labels"],
  "audience_age_range": "e.g. 25–44",
  "audience_geo": "short geographic read",
  "targeting_types": ["2-4 e.g. Interest-based, Retargeting"]
}`,
      },
    ],
    maxCompletionTokens: 2800,
  });

  usageCostUsd += res.ok && res.usage?.costUsd != null ? res.usage.costUsd : 0;

  if (!res.ok) {
    console.warn("[insightLLM] OpenRouter:", res.error);
    console.log(`[insightLLM] response valid=false`);
    return { payload, usageCostUsd };
  }

  const rawJson = stripJsonFences(res.text);
  let parsedZ: z.infer<typeof insightLlmSchema>;
  try {
    const asJson = JSON.parse(rawJson) as unknown;
    const zResult = insightLlmSchema.safeParse(asJson);
    if (!zResult.success) {
      console.warn(
        `[insightLLM] invalid JSON: ${zResult.error.message} raw=${rawJson.slice(0, 400)}`
      );
      console.log(`[insightLLM] response valid=false`);
      return { payload, usageCostUsd };
    }
    parsedZ = zResult.data;
  } catch {
    console.warn(`[insightLLM] invalid JSON: parse error raw=${rawJson.slice(0, 400)}`);
    console.log(`[insightLLM] response valid=false`);
    return { payload, usageCostUsd };
  }

  const parsed = parsedZ;
  console.log(`[insightLLM] response valid=true`);

  const llmSource = "llm" as const;

  return {
    payload: {
      ...payload,
      insufficientEnrichedAds: false,
      map: {
        ...map,
        toneOfVoice: {
          primary: parsed.tone_primary?.trim() || map.toneOfVoice.primary,
          attributes:
            Array.isArray(parsed.tone_attributes) && parsed.tone_attributes.length > 0
              ? parsed.tone_attributes.map((x) => String(x).trim()).filter(Boolean)
              : map.toneOfVoice.attributes,
        },
        audienceSignals: {
          interests:
            Array.isArray(parsed.audience_interests) && parsed.audience_interests.length > 0
              ? parsed.audience_interests.map((x) => String(x).trim()).filter(Boolean)
              : map.audienceSignals.interests,
          ageRange: parsed.audience_age_range?.trim() || map.audienceSignals.ageRange,
          geo: parsed.audience_geo?.trim() || map.audienceSignals.geo,
          targetingType:
            Array.isArray(parsed.targeting_types) && parsed.targeting_types.length > 0
              ? parsed.targeting_types.map((x) => String(x).trim()).filter(Boolean)
              : map.audienceSignals.targetingType,
        },
      },
      insights: {
        funnel_architecture: {
          ...insights.funnel_architecture,
          aiNarrative: parsed.funnel_architecture?.trim() || insights.funnel_architecture.aiNarrative,
          aiNarrativeSource: llmSource,
        },
        budget_allocation: {
          ...insights.budget_allocation,
          aiNarrative: parsed.budget_allocation?.trim() || insights.budget_allocation.aiNarrative,
          insight: parsed.budget_insight?.trim() || insights.budget_allocation.insight,
          aiNarrativeSource: llmSource,
        },
        creative_cadence: {
          ...insights.creative_cadence,
          aiNarrative: parsed.creative_cadence?.trim() || insights.creative_cadence.aiNarrative,
          aiNarrativeSource: llmSource,
        },
        audience_signal_map: {
          ...insights.audience_signal_map,
          aiNarrative: parsed.audience_signal_map?.trim() || insights.audience_signal_map.aiNarrative,
          aiNarrativeSource: llmSource,
        },
        angle_clustering: {
          ...insights.angle_clustering,
          aiNarrative: parsed.angle_clustering?.trim() || insights.angle_clustering.aiNarrative,
          aiNarrativeSource: llmSource,
        },
        voice_tone_fingerprint: {
          ...insights.voice_tone_fingerprint,
          aiNarrative: parsed.voice_tone_fingerprint?.trim() || insights.voice_tone_fingerprint.aiNarrative,
          aiNarrativeSource: llmSource,
        },
        performance_pulse: {
          ...insights.performance_pulse,
          aiNarrative: parsed.performance_pulse?.trim() || insights.performance_pulse.aiNarrative,
          aiNarrativeSource: llmSource,
        },
      },
    },
    usageCostUsd,
  };
}
