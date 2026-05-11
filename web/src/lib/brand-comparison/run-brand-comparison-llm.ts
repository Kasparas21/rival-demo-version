import { z } from "zod";

import { anthropicSonnet } from "@/lib/llm/anthropic";

function stripJsonFences(text: string): string {
  let t = text.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
  }
  return t.trim();
}

export const brandComparisonResponseSchema = z.object({
  competitorArchetype: z.object({
    headline: z.string(),
    subtitle: z.string(),
  }),
  userArchetype: z.object({
    headline: z.string(),
    subtitle: z.string(),
  }),
  theirAdvantage: z.object({
    title: z.string(),
    body: z.string(),
  }),
  yourAdvantage: z.object({
    title: z.string(),
    body: z.string(),
  }),
  recommendation: z.object({
    title: z.string(),
    body: z.string(),
  }),
  actionItems: z.array(z.string()).length(3),
  biggestGapNarrative: z.string(),
  biggestAdvantageNarrative: z.string(),
  voiceMapCaption: z.string(),
  velocityCaption: z.string(),
  audienceComparisonNarrative: z.string(),
});

export type BrandComparisonLlmResult = z.infer<typeof brandComparisonResponseSchema>;

export async function runBrandComparisonLlm(params: {
  competitorName: string;
  competitorDomain: string;
  userBrandName: string;
  userBrandDomain?: string;
  userBrandContext?: string;
  /** Optional raw ad-library digest (legacy) */
  adEvidence?: string;
  /** JSON string of structured strategy aggregates for both brands */
  structuredDigest?: string;
}): Promise<
  | { ok: true; result: BrandComparisonLlmResult; model: string }
  | { ok: false; error: string; model?: string }
> {
  const {
    competitorName,
    competitorDomain,
    userBrandName,
    userBrandDomain,
    userBrandContext,
    adEvidence,
    structuredDigest,
  } = params;

  if (!process.env.ANTHROPIC_API_KEY?.trim()) {
    return { ok: false, error: "ANTHROPIC_API_KEY not configured" };
  }

  const userBits = [
    `User brand: ${userBrandName}${userBrandDomain ? ` (${userBrandDomain})` : ""}`,
    userBrandContext?.trim() ? `User brand positioning / notes: ${userBrandContext.trim()}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const digestSection =
    structuredDigest && structuredDigest.trim().length > 0
      ? `STRUCTURED_STRATEGY_JSON (ground truth from Rival — use for platform mix, funnel, voice-by-platform, angles, testing velocity). Do not invent platforms or percentages beyond what is implied here:\n${structuredDigest.trim()}`
      : "";

  const evidenceSection =
    adEvidence && adEvidence.trim().length > 0
      ? `Optional raw ad creative samples (may be empty if structured JSON above is primary):\n${adEvidence.trim()}`
      : "No raw ad creative blocks provided; rely on STRUCTURED_STRATEGY_JSON and brand names.";

  const res = await anthropicSonnet({
    maxTokens: 4_096,
    systemPrompt: `You are Rival's strategic comparison analyst. You compare a user's brand vs a competitor using structured data from Rival's strategy engine.

STRICT RULES:
1. NEVER invent specific Euro amounts, percentages, day counts, or campaign names that are not explicitly present in the structured data passed to you.
2. NEVER invent product names, offers, or claims that aren't observable in the data.
3. NEVER fabricate prices like "€2,062.70" or specific timeframes like "111 days" unless you can directly reference the exact field in the structured JSON.
4. When referring to estimated spend, say "estimated" or "modeled" — never imply you have invoiced spend data.
5. Compare brands by what they observably do, not by inventing financial details.
6. If you don't have data for a specific claim, OMIT it. Do not fabricate.

Output ONLY valid JSON (no markdown fences, no commentary) with this exact structure and key casing:
{
  "competitorArchetype": { "headline": string, "subtitle": string },
  "userArchetype": { "headline": string, "subtitle": string },
  "theirAdvantage": { "title": string, "body": string },
  "yourAdvantage": { "title": string, "body": string },
  "recommendation": { "title": string, "body": string },
  "actionItems": [ string, string, string ],
  "biggestGapNarrative": string,
  "biggestAdvantageNarrative": string,
  "voiceMapCaption": string,
  "velocityCaption": string,
  "audienceComparisonNarrative": string
}

FORBIDDEN PHRASES / PATTERNS (never use):
- Specific Euro amounts you did not see in STRUCTURED_STRATEGY_JSON.
- Day-count claims you can't trace to fields in the JSON.
- Product names or offer details not grounded in angles or provided text.
- Industry jargon abbreviations (e.g. made-up codes) unless the literal token appears in the structured data.

ALLOWED CLAIMS (ground in STRUCTURED_STRATEGY_JSON):
- Platform presence and funnel gaps.
- Voice differences using formal/emotional numbers from the JSON.
- Testing velocity using new-in-30 patterns from the JSON.
- Angle gaps using angle labels/counts from the JSON.

Headlines/subtitles are short positioning labels, not questions. "theirAdvantage" = competitor strength in paid/media; "yourAdvantage" = user brand strengths. actionItems = exactly 3 imperative bullets. biggestGapNarrative / biggestAdvantageNarrative = one concise sentence each. voiceMapCaption / velocityCaption = one sentence each when data exists. audienceComparisonNarrative = exactly ONE sentence on audience overlap or divergence, grounded ONLY in audienceInference fields inside STRUCTURED_STRATEGY_JSON when present; if missing or null for both brands, state that audience inference is not available.

Use the real brand names from the user message. JSON only.`,
    messages: [
      {
        role: "user",
        content: `COMPETITOR (viewed on dashboard): ${competitorName} (${competitorDomain})

${userBits}

${digestSection ? `${digestSection}\n\n` : ""}${evidenceSection}`,
      },
    ],
  });

  if (!res.ok) {
    return { ok: false, error: res.error };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripJsonFences(res.text));
  } catch {
    return { ok: false, error: "Model returned non-JSON", model: res.model };
  }

  const checked = brandComparisonResponseSchema.safeParse(parsed);
  if (!checked.success) {
    return { ok: false, error: "Model JSON failed validation", model: res.model };
  }

  return { ok: true, result: checked.data, model: res.model };
}
