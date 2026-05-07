import { z } from "zod";

import { openRouterChatText } from "@/lib/llm/openrouter";

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
});

export type BrandComparisonLlmResult = z.infer<typeof brandComparisonResponseSchema>;

export async function runBrandComparisonLlm(params: {
  competitorName: string;
  competitorDomain: string;
  userBrandName: string;
  userBrandDomain?: string;
  userBrandContext?: string;
  adEvidence: string;
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
  } = params;

  if (!process.env.OPENROUTER_API_KEY?.trim()) {
    return { ok: false, error: "OPENROUTER_API_KEY not configured" };
  }

  const userBits = [
    `User brand: ${userBrandName}${userBrandDomain ? ` (${userBrandDomain})` : ""}`,
    userBrandContext?.trim() ? `User brand positioning / notes: ${userBrandContext.trim()}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const evidenceSection =
    adEvidence.trim().length > 0
      ? `Competitor ad creative evidence (sampled from their Ads Library — only use this and brand names; do not invent metrics or platforms not shown):\n${adEvidence.trim()}`
      : "No competitor ad copy was provided. Compare at a high level using only the two brand names and any user-brand context. State clearly that you lack paid creative samples — do not invent specific performance numbers, CPMs, or channel mix percentages.";

  const res = await openRouterChatText({
    maxCompletionTokens: 2_000,
    messages: [
      {
        role: "system",
        content: `You compare TWO brands for a marketer:
- COMPETITOR: the company whose dashboard they are viewing (paid ads / GTM focus).
- USER BRAND: the marketer's own company they track in this workspace.

Output ONLY valid JSON (no markdown fences, no commentary) with this exact structure and key casing:
{
  "competitorArchetype": { "headline": string, "subtitle": string },
  "userArchetype": { "headline": string, "subtitle": string },
  "theirAdvantage": { "title": string, "body": string },
  "yourAdvantage": { "title": string, "body": string },
  "recommendation": { "title": string, "body": string }
}

Rules:
- Headlines/subtitles are short positioning labels (e.g. demand gen style), not questions.
- "theirAdvantage" = where the COMPETITOR appears stronger or differentiated in paid media / messaging, grounded in evidence when present.
- "yourAdvantage" = where the USER BRAND plausibly wins (use user brand context when provided; never fabricate the user's unpublished metrics).
- Use the real brand names from the user input in titles/body when natural.
- No made-up percentages unless clearly framed as hypothetical ("you might…"). If evidence is thin, use cautious language.
- JSON only.`,
      },
      {
        role: "user",
        content: `COMPETITOR (viewed on dashboard): ${competitorName} (${competitorDomain})

${userBits}

${evidenceSection}`,
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
