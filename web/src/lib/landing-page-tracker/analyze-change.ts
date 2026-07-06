import { resolveModelForTask } from "@/lib/llm/model-routing";
import { openRouterChatVision } from "@/lib/llm/openrouter";

import type { LandingPageChangeAnalysis, LandingPageText } from "./constants";

function parseAnalysisJson(text: string): LandingPageChangeAnalysis | null {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() ?? trimmed;
  try {
    const parsed = JSON.parse(candidate) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed as LandingPageChangeAnalysis;
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        const parsed = JSON.parse(candidate.slice(start, end + 1)) as unknown;
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
        return parsed as LandingPageChangeAnalysis;
      } catch {
        return null;
      }
    }
    return null;
  }
}

export async function analyzeLandingPageChange(params: {
  url: string;
  label: string;
  competitorName: string;
  prevHeroBytes: Buffer;
  newHeroBytes: Buffer;
  prevText: LandingPageText;
  newText: LandingPageText;
  pixelDiffPct: number;
}): Promise<LandingPageChangeAnalysis> {
  const textDiff = {
    headline_changed: params.prevText.headline !== params.newText.headline,
    prev_headline: params.prevText.headline,
    new_headline: params.newText.headline,
    cta_changed: params.prevText.cta_text !== params.newText.cta_text,
    prev_cta: params.prevText.cta_text,
    new_cta: params.newText.cta_text,
    pricing_changed:
      JSON.stringify(params.prevText.pricing_tiers ?? []) !==
      JSON.stringify(params.newText.pricing_tiers ?? []),
  };

  const prompt = `You are Rival's competitive intelligence analyst. You are comparing two versions of a competitor's landing page.

Competitor: ${params.competitorName}
Page: ${params.label} (${params.url})
Pixels changed: ${params.pixelDiffPct}%

Text changes detected:
${JSON.stringify(textDiff, null, 2)}

The first image is the PREVIOUS version. The second image is the NEW version.

Analyze what changed and return ONLY a JSON object with this exact structure:
{
  "what_changed": "Plain English description of exactly what changed. Be specific — name the section, the element, the copy. Not vague.",
  "sections_changed": ["hero", "pricing", "cta", "social_proof", "nav", "footer"],
  "strategic_interpretation": "Why did they probably make this change? What does it tell you about what they tested and what's working? Be opinionated.",
  "what_to_do": "One specific action the user should take based on this change. Not generic advice.",
  "urgency": "high|medium|low",
  "threat_score": 0
}

Urgency guide:
- high: headline change, pricing change, new offer, CTA change above the fold
- medium: new social proof section, layout restructure, new feature emphasis
- low: image swap, color change, footer update, minor copy tweak

Threat score guide (1-10):
- 8-10: headline changed, pricing restructured, free trial added/removed
- 6-7: new social proof, new section added, CTA changed
- 4-5: layout change, image swap
- 1-3: minor copy tweak, footer change, animation/shimmer/rendering variance (use threat_score 1-2)

If the only difference is animation, loading shimmer, carousel timing, or sub-5% pixel noise with identical copy, set threat_score to 1 and describe that nothing meaningful changed.

No preamble. No markdown. Pure JSON only.`;

  const route = resolveModelForTask("landing_page_change_analysis");
  const result = await openRouterChatVision({
    model: route.model,
    maxTokens: 1000,
    images: [
      { label: "Previous version:", base64Png: params.prevHeroBytes.toString("base64") },
      { label: "New version:", base64Png: params.newHeroBytes.toString("base64") },
    ],
    prompt,
  });

  if (!result.ok) {
    return {
      what_changed: result.error.slice(0, 500),
      sections_changed: [],
      strategic_interpretation: "",
      what_to_do: "",
      urgency: "low",
      threat_score: 3,
    };
  }

  const parsed = parseAnalysisJson(result.text);
  if (parsed) return parsed;

  return {
    what_changed: result.text.slice(0, 500),
    sections_changed: [],
    strategic_interpretation: "",
    what_to_do: "",
    urgency: "low",
    threat_score: 3,
  };
}
