import { z } from "zod";

import { googleAdCopy } from "@/lib/ad-library/google-ad-copy";
import {
  describeMetaAudienceEvidence,
  hasRepresentativeReach,
  metaAudienceEvidence,
  type MetaAudienceEvidence,
} from "@/lib/comparison/meta-audience-evidence";
import { llmSmart } from "@/lib/llm/anthropic";
import type {
  AudienceInferenceResult,
  CompetitorStrategyOverviewPayload,
} from "@/lib/strategy-overview/payload-types";

function stripJsonFences(text: string): string {
  let t = text.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
  }
  return t.trim();
}

export const audienceInferenceParsedSchema = z.object({
  segments: z
    .array(
      z.object({
        name: z.string(),
        confidence: z.number().min(0).max(1),
        signals: z.array(z.string()).min(2).max(5),
      })
    )
    .min(1)
    .max(3),
  primarySegmentName: z.string(),
  summary: z.string(),
});

export type AudienceInferenceInput = {
  brandName: string;
  brandDomain: string;
  brandContext?: string;
  platformMix: { platform: string; adCount: number; spendShare: number }[];
  topAngles: { angle: string; count: number }[];
  voiceAverages: { formal: number; emotional: number };
  formatMix: { format: string; share: number }[];
  /** Meta's published reach and targeting for these ads, when there is any. */
  metaAudience?: MetaAudienceEvidence | null;
  /** Real ad texts (longest-running first), so segments rest on what the ads say. */
  copySamples?: string[];
};

type AdForAudience = {
  platform: string;
  ad_text: string;
  first_seen_at: string;
  last_seen_at: string;
  raw_payload?: unknown;
};

const COPY_SAMPLES = 12;
const COPY_SAMPLE_CHARS = 240;

/** Longest-running ads with real copy, one per opening line. */
export function audienceCopySamples(ads: AdForAudience[]): string[] {
  const runtime = (a: AdForAudience) => Date.parse(a.last_seen_at) - Date.parse(a.first_seen_at);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const ad of [...ads].sort((a, b) => (runtime(b) || 0) - (runtime(a) || 0))) {
    const text = (ad.platform === "google" ? googleAdCopy(ad.ad_text) : ad.ad_text).replace(/\s+/g, " ").trim();
    if (text.length < 20) continue;
    const key = text.slice(0, 60).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text.slice(0, COPY_SAMPLE_CHARS));
    if (out.length >= COPY_SAMPLES) break;
  }
  return out;
}

/** Evidence from the ads themselves, added to {@link buildAudienceInferenceInputFromPayload}'s input. */
export function withAdEvidence(input: AudienceInferenceInput, ads: AdForAudience[]): AudienceInferenceInput {
  return { ...input, metaAudience: metaAudienceEvidence(ads), copySamples: audienceCopySamples(ads) };
}

/** Without representative published reach the segments rest on copy and platform mix: cap the model's self-rating. */
const MAX_CONFIDENCE_WITHOUT_REACH = 0.6;

export function buildAudienceInferenceInputFromPayload(
  meta: { brandName: string; brandDomain: string; brandContext?: string | null },
  p: CompetitorStrategyOverviewPayload
): AudienceInferenceInput {
  const platformMix = (p.insights.platform_footprint.platforms ?? []).map((x) => ({
    platform: x.platform,
    adCount: x.activeAds,
    spendShare: x.spendShare,
  }));

  const topAngles = (p.insights.angle_clustering.angles ?? []).map((a) => ({
    angle: a.angle,
    count: a.adCount,
  }));

  const vc = p.insights.voice_tone_position.competitor;
  const voiceAverages =
    vc && !vc.insufficientData
      ? { formal: vc.formal, emotional: vc.emotional }
      : { formal: 0.5, emotional: 0.5 };

  const formatMix = (p.insights.ad_format_mix.formats ?? []).map((f) => ({
    format: f.format,
    share: f.sharePct,
  }));

  return {
    brandName: meta.brandName,
    brandDomain: meta.brandDomain,
    brandContext: meta.brandContext?.trim() || undefined,
    platformMix,
    topAngles,
    voiceAverages,
    formatMix,
  };
}

export async function inferAudience(input: AudienceInferenceInput): Promise<AudienceInferenceResult | null> {
  if (!process.env.OPENROUTER_API_KEY?.trim()) {
    console.warn("[audience-inference] OPENROUTER_API_KEY missing");
    return null;
  }

  const systemPrompt = `You are an audience analyst. Given structured advertising data about a brand, infer the most likely target audience segments.

STRICT RULES:
1. Output 1-3 segments only. Quality > quantity.
2. Each segment must have a specific name (e.g. "Budget-conscious parents 30-45 buying back-to-school items"), not generic ("General consumers").
3. Confidence score: 0.4-0.6 = "data is suggestive", 0.6-0.8 = "data is fairly clear", 0.8+ = "data is very clear". Be conservative.
4. Signals must reference observable patterns from the data given: a reach or targeting figure, a phrase quoted from the ad copy, or the platform/angle/format mix. Nothing else.
5. When Meta reach data is given, any age or gender in a segment name must agree with it (do not call an audience "young" when most reach is 55+, or "women" when reach is mostly men).
6. Without reach data, do not state ages or genders unless the ad copy says them.
7. Output strict JSON only matching the provided schema. No markdown fences.`;

  const userPrompt = `Analyze this brand's audience based on advertising patterns:

Brand: ${input.brandName} (${input.brandDomain})
${input.brandContext ? `Context: ${input.brandContext}` : ""}

Platform mix:
${input.platformMix.map((p) => `- ${p.platform}: ${p.adCount} ads (${p.spendShare}% est spend)`).join("\n")}

Top creative angles:
${input.topAngles.slice(0, 8).map((a) => `- ${a.angle} (${a.count} ads)`).join("\n")}

Voice tone averages: ${input.voiceAverages.formal.toFixed(2)} formal, ${input.voiceAverages.emotional.toFixed(2)} emotional

Format mix:
${input.formatMix.map((f) => `- ${f.format}: ${f.share}%`).join("\n")}
${input.metaAudience ? `\n${describeMetaAudienceEvidence(input.metaAudience)}\n` : "\nNo Meta reach or targeting data published for these ads.\n"}
${input.copySamples?.length ? `Ad copy (longest-running first):\n${input.copySamples.map((c) => `- "${c}"`).join("\n")}\n` : ""}
Return JSON: { "segments": [{ "name", "confidence", "signals": [string] }], "primarySegmentName", "summary" }
Summary: 2 sentences describing the brand's audience strategy overall.`;

  const result = await llmSmart({
    task: "audience_inference",
    systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
    maxTokens: 1500,
  });

  if (!result.ok) {
    console.warn("[audience-inference] failed:", result.error);
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(stripJsonFences(result.text));
    const validated = audienceInferenceParsedSchema.safeParse(parsed);
    if (!validated.success) {
      console.warn("[audience-inference] schema validation failed", validated.error.flatten());
      return null;
    }
    const hasReach = hasRepresentativeReach(input.metaAudience);
    return {
      ...validated.data,
      segments: validated.data.segments.map((s) => ({
        ...s,
        confidence: hasReach ? s.confidence : Math.min(s.confidence, MAX_CONFIDENCE_WITHOUT_REACH),
      })),
      evidence: { meta: input.metaAudience ?? null, copySamples: input.copySamples?.length ?? 0 },
    };
  } catch (e) {
    console.warn("[audience-inference] JSON parse failed", e);
    return null;
  }
}
