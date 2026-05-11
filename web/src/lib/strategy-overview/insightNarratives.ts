/**
 * Single Anthropic (Sonnet) pass: short insight lines for Strategy Insight cards,
 * grounded in derived metrics and sampled ad copy. No invented audience segments.
 */

import { z } from "zod";

import { anthropicSonnet } from "@/lib/llm/anthropic";
import type { CompetitorStrategyOverviewPayload } from "@/lib/strategy-overview/payload-types";
import { parseStage, type ScrapedAdInput } from "@/lib/strategy-overview/strategyDerivation";

const MAX_INSIGHT_LEN = 140;

function stripJsonFences(text: string): string {
  let t = text.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
  }
  return t.trim();
}

const insightLlmSchema = z.object({
  funnel_distribution_insight: z.string().optional(),
  budget_allocation_insight: z.string().optional(),
  library_activity_insight: z.string().optional(),
  ad_format_mix_insight: z.string().optional(),
  angle_clustering_insight: z.string().optional(),
  voice_tone_insight: z.string().optional(),
  platform_footprint_insight: z.string().optional(),
  tone_primary: z.string().optional(),
  tone_attributes: z.array(z.string()).optional(),
});

function clipInsight(s: string | undefined): string | null {
  const t = s?.trim();
  if (!t) return null;
  return t.length > MAX_INSIGHT_LEN ? t.slice(0, MAX_INSIGHT_LEN - 1).trimEnd() + "…" : t;
}

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

  if (!process.env.ANTHROPIC_API_KEY?.trim() || ads.length === 0) {
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

  const allow = {
    funnel: !insights.funnel_distribution.insufficientData,
    budget: insights.budget_allocation.segments.length > 0,
    library: insights.library_activity_timeline.months.some(
      (m) => m.launchCount > 0 || m.detectionCount > 0
    ),
    formats: insights.ad_format_mix.formats.length > 0,
    angles: !insights.angle_clustering.insufficientData && insights.angle_clustering.angles.length > 0,
    voice:
      insights.voice_tone_position.competitor != null &&
      !insights.voice_tone_position.competitor.insufficientData,
    footprint: insights.platform_footprint.platforms.length > 0,
  };

  const digest = {
    brand: map.competitor,
    activeAdCount: map.activeAdCount,
    totalAdSpendEur: {
      mid: map.totalAdSpend.value,
      low: map.totalAdSpend.low ?? map.totalAdSpend.value,
      high: map.totalAdSpend.high ?? map.totalAdSpend.value,
    },
    brandScaleScore: map.totalAdSpend.brandScaleScore ?? 1,
    cards: {
      funnel_distribution: allow.funnel
        ? {
            stages: insights.funnel_distribution.stages.map((s) => ({
              stage: s.stage,
              sharePct: s.sharePct,
              adCount: s.adCount,
            })),
            totalClassified: insights.funnel_distribution.totalClassified,
            totalAds: insights.funnel_distribution.totalAds,
          }
        : { skipped: "insufficient classified funnel stages" },
      budget_allocation: allow.budget
        ? {
            segments: insights.budget_allocation.segments.map((s) => ({
              label: s.label,
              pct: s.pct,
              estSpendEur: s.estSpendEur,
              adCount: s.adCount,
            })),
            totalEstSpendEur: insights.budget_allocation.totalEstSpendEur,
          }
        : { skipped: "no segments" },
      library_activity_timeline: allow.library
        ? {
            dataQuality: insights.library_activity_timeline.dataQuality,
            tailMonths: insights.library_activity_timeline.months.slice(-6),
          }
        : { skipped: "no timeline points" },
      ad_format_mix: allow.formats
        ? { formats: insights.ad_format_mix.formats.slice(0, 8) }
        : { skipped: "no formats" },
      angle_clustering: allow.angles
        ? {
            top: insights.angle_clustering.angles.slice(0, 6),
            unclassifiedPct: insights.angle_clustering.unclassifiedPct,
          }
        : { skipped: "insufficient angle labels" },
      voice_tone_position: allow.voice
        ? {
            competitor: insights.voice_tone_position.competitor,
            sampleSize: insights.voice_tone_position.sampleSize,
          }
        : { skipped: "insufficient voice_tone scores" },
      platform_footprint: allow.footprint
        ? { platforms: insights.platform_footprint.platforms }
        : { skipped: "no platforms" },
    },
  };

  const allowedList = [
    allow.funnel && "funnel_distribution_insight",
    allow.budget && "budget_allocation_insight",
    allow.library && "library_activity_insight",
    allow.formats && "ad_format_mix_insight",
    allow.angles && "angle_clustering_insight",
    allow.voice && "voice_tone_insight",
    allow.footprint && "platform_footprint_insight",
  ].filter(Boolean);

  const res = await anthropicSonnet({
    systemPrompt: `You write ultra-short insight lines for a competitor ad-strategy dashboard.

STRICT RULES:
- Each insight must cite ONLY numbers or patterns present in the JSON digest or the sample creatives. Never invent platforms, percentages, dates, demographics, or branded claims.
- If you are unsure, omit that field (do not guess).
- Each non-empty insight must be ≤${MAX_INSIGHT_LEN} characters, one sentence.
- Tone: descriptive and neutral. No prescriptive recommendations ("you should…").
- Do not mention audience segments unless they appear verbatim in the sample text.`,
    messages: [
      {
        role: "user",
        content: `You may fill ONLY these narrative slots (omit the rest or use empty string): ${allowedList.join(", ")}

Derived summary:
${JSON.stringify(digest)}

Representative ads (${sample.length} enriched of ${ads.length} total, truncated):
${JSON.stringify(sample)}

Return ONLY valid JSON, no markdown:
{
  "funnel_distribution_insight": "",
  "budget_allocation_insight": "",
  "library_activity_insight": "",
  "ad_format_mix_insight": "",
  "angle_clustering_insight": "",
  "voice_tone_insight": "",
  "platform_footprint_insight": "",
  "tone_primary": "",
  "tone_attributes": []
}`,
      },
    ],
    maxTokens: 2048,
  });

  usageCostUsd += res.ok && res.usage?.costUsd != null ? res.usage.costUsd : 0;

  if (!res.ok) {
    console.warn("[insightLLM] Anthropic:", res.error);
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

  const narr = (allowed: boolean, s: string | undefined) =>
    allowed ? clipInsight(s) : null;

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
      },
      insights: {
        ...insights,
        platform_footprint: {
          ...insights.platform_footprint,
          aiNarrative: narr(allow.footprint, parsed.platform_footprint_insight),
          aiNarrativeSource: allow.footprint && parsed.platform_footprint_insight?.trim() ? llmSource : undefined,
        },
        budget_allocation: {
          ...insights.budget_allocation,
          aiNarrative: narr(allow.budget, parsed.budget_allocation_insight),
          aiNarrativeSource: allow.budget && parsed.budget_allocation_insight?.trim() ? llmSource : undefined,
        },
        library_activity_timeline: {
          ...insights.library_activity_timeline,
          aiNarrative: narr(allow.library, parsed.library_activity_insight),
          aiNarrativeSource: allow.library && parsed.library_activity_insight?.trim() ? llmSource : undefined,
        },
        funnel_distribution: {
          ...insights.funnel_distribution,
          aiNarrative: narr(allow.funnel, parsed.funnel_distribution_insight),
          aiNarrativeSource: allow.funnel && parsed.funnel_distribution_insight?.trim() ? llmSource : undefined,
        },
        angle_clustering: {
          ...insights.angle_clustering,
          aiNarrative: narr(allow.angles, parsed.angle_clustering_insight),
          aiNarrativeSource: allow.angles && parsed.angle_clustering_insight?.trim() ? llmSource : undefined,
        },
        voice_tone_position: {
          ...insights.voice_tone_position,
          aiNarrative: narr(allow.voice, parsed.voice_tone_insight),
          aiNarrativeSource: allow.voice && parsed.voice_tone_insight?.trim() ? llmSource : undefined,
        },
        ad_format_mix: {
          ...insights.ad_format_mix,
          aiNarrative: narr(allow.formats, parsed.ad_format_mix_insight),
          aiNarrativeSource: allow.formats && parsed.ad_format_mix_insight?.trim() ? llmSource : undefined,
        },
      },
    },
    usageCostUsd,
  };
}
