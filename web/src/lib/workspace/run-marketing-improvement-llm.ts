import { z } from "zod";

import { anthropicSonnet } from "@/lib/llm/anthropic";

function stripJsonFences(text: string): string {
  let t = text.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
  }
  return t.trim();
}

export const marketingImprovementResponseSchema = z.object({
  executiveSummary: z.string(),
  improve: z.array(
    z.object({
      title: z.string(),
      detail: z.string(),
      /** Optional note on which competitor patterns or platforms this relates to */
      groundedIn: z.string().optional(),
    }),
  ),
  keepDoing: z.array(
    z.object({
      title: z.string(),
      detail: z.string(),
    }),
  ),
  /** Tactics or positioning gaps that look weaker in the evidence — avoid copying blindly */
  doNotChase: z.array(
    z.object({
      title: z.string(),
      detail: z.string(),
    }),
  ),
});

export type MarketingImprovementLlmResult = z.infer<typeof marketingImprovementResponseSchema>;

export async function runMarketingImprovementLlm(params: {
  userBrandName: string;
  userBrandDomain?: string;
  userBrandContext?: string;
  /** Giant text blob: per-competitor ad digests + optional your-brand digest */
  evidenceText: string;
}): Promise<
  { ok: true; result: MarketingImprovementLlmResult; model: string } | { ok: false; error: string; model?: string }
> {
  const { userBrandName, userBrandDomain, userBrandContext, evidenceText } = params;

  if (!process.env.ANTHROPIC_API_KEY?.trim()) {
    return { ok: false, error: "ANTHROPIC_API_KEY not configured" };
  }

  const userBits = [
    `Workspace brand (the marketer's company): ${userBrandName}${userBrandDomain ? ` (${userBrandDomain})` : ""}`,
    userBrandContext?.trim() ? `Positioning / notes from their account: ${userBrandContext.trim()}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const evidenceSection =
    evidenceText.trim().length > 0
      ? `PUBLIC ADS LIBRARY DIGESTS (scraped creatives for brands they follow + their own workspace when available).\nOnly use this text — do not invent campaigns, budgets, or platforms not shown.\nIf evidence is thin, say so and stay cautious.\n\n${evidenceText.trim()}`
      : "(No ad samples were available.)";

  const res = await anthropicSonnet({
    maxTokens: 4_096,
    systemPrompt: `You are a strategic marketing advisor. The user runs "${userBrandName}" and follows several competitors in one workspace.

Analyze patterns ACROSS ALL competitor digests (not one hero rival). Compare them to the user's own ad digest when present.

Return ONLY valid JSON (no markdown fences, no commentary) with this exact shape and key casing:
{
  "executiveSummary": string,
  "improve": [ { "title": string, "detail": string, "groundedIn"?: string } ],
  "keepDoing": [ { "title": string, "detail": string } ],
  "doNotChase": [ { "title": string, "detail": string } ]
}

Rules:
- "improve" = concrete opportunities for the workspace brand (messaging, channels, offers, creative angles) informed by what competitors are doing that they are not, or where they look behind.
- "keepDoing" = strengths or differentiated choices implied by THEIR ads vs the pack — things worth protecting; do not suggest changing these without strong evidence.
- "doNotChase" = crowded angles, weak patterns in competitor ads, or moves that would not fit the user's brand — explain briefly.
- Short titles; details in plain language, 2–5 sentences max per item.
- 3–6 items in "improve", 2–5 in "keepDoing", 1–4 in "doNotChase" when evidence supports it; fewer if evidence is thin.
- Never fabricate metrics. JSON only.`,
    messages: [
      {
        role: "user",
        content: `${userBits}

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

  const checked = marketingImprovementResponseSchema.safeParse(parsed);
  if (!checked.success) {
    return { ok: false, error: "Model JSON failed validation", model: res.model };
  }

  return { ok: true, result: checked.data, model: res.model };
}
