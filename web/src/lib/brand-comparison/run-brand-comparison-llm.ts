import { z } from "zod";

import { llmSmart } from "@/lib/llm/anthropic";

/** Bumps cache rows in `brand_comparison_results` when prompt/schema changes. */
export const BRAND_COMPARISON_CACHE_MODEL_VERSION = "deepseek-v4-flash-v1";

function stripJsonFences(text: string): string {
  let t = text.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
  }
  return t.trim();
}

const moveCategorySchema = z.enum(["COPY_ANGLE", "SHIFT_BUDGET", "REFRESH_CREATIVE", "DEFEND", "EXPAND"]);

const primaryActionSchema = z.object({
  label: z.string(),
  type: z.enum(["create_brief", "view_ads", "view_analysis"]),
  angleRef: z.string().optional(),
  adIdsRef: z.array(z.string()).optional(),
});

export const brandComparisonResponseSchema = z.object({
  headlineTitles: z.object({
    userArchetype: z.string(),
    competitorArchetype: z.string(),
  }),
  moves: z
    .array(
      z.object({
        category: moveCategorySchema,
        title: z.string(),
        evidence: z.string(),
        primaryAction: primaryActionSchema,
      })
    )
    .min(1)
    .max(4),
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
  | { ok: true; result: BrandComparisonLlmResult; model: string; costUsd: number; cacheModelVersion: string }
  | { ok: false; error: string; model?: string; costUsd?: number }
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

  if (!process.env.OPENROUTER_API_KEY?.trim()) {
    return { ok: false, error: "OPENROUTER_API_KEY not configured" };
  }

  const userBits = [
    `User brand: ${userBrandName}${userBrandDomain ? ` (${userBrandDomain})` : ""}`,
    userBrandContext?.trim() ? `User brand positioning / notes: ${userBrandContext.trim()}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const digestSection =
    structuredDigest && structuredDigest.trim().length > 0
      ? `STRUCTURED_STRATEGY_AND_NUMERIC_FACTS_JSON (ground truth from Rival). Use comparisonNumericFacts and per-brand stats for quantities. Do not invent platforms or figures beyond this object:\n${structuredDigest.trim()}`
      : "";

  const evidenceSection =
    adEvidence && adEvidence.trim().length > 0
      ? `Optional raw ad creative samples (secondary):\n${adEvidence.trim()}`
      : "No raw ad creative blocks provided; rely on STRUCTURED_STRATEGY_AND_NUMERIC_FACTS_JSON.";

  const res = await llmSmart({
    task: "brand_comparison",
    maxTokens: 3_000,
    systemPrompt: `You are Rival's tactical comparison analyst. You output ONLY actionable moves for a paid social / search operator comparing their brand vs a competitor.

STRICT RULES:
1. Every evidence sentence MUST cite at least one specific number that appears in STRUCTURED_STRATEGY_AND_NUMERIC_FACTS_JSON (ad counts, days, percentages, modeled spend EUR, platform counts, angle counts, etc.).
2. NEVER invent amounts, percentages, or day counts not present in that JSON.
3. When citing modeled spend, say "modeled" or "estimated".
4. If a numeric field is null or missing for a brand, do not fabricate — work from what exists.
5. Output ONLY valid JSON (no markdown fences, no commentary).

JSON shape:
{
  "headlineTitles": {
    "userArchetype": string,
    "competitorArchetype": string
  },
  "moves": [
    {
      "category": "COPY_ANGLE" | "SHIFT_BUDGET" | "REFRESH_CREATIVE" | "DEFEND" | "EXPAND",
      "title": string,
      "evidence": string,
      "primaryAction": {
        "label": string,
        "type": "create_brief" | "view_ads" | "view_analysis",
        "angleRef": string (optional),
        "adIdsRef": string[] (optional)
      }
    }
  ]
}

TASK:
- headlineTitles: exactly two strings, 4–6 words each, title case — positioning labels only (no subtitles).
- moves: between 1 and 4 objects.
  • Prefer exactly 3 high-impact moves when the data supports them; each must be doable in one week, imperative voice ("Launch…", "Move…", "Test…"), not vague ("Consider…").
  • If fewer than 3 moves are defensible from the data, output only those, then optionally add a final move with category EXPAND or DEFEND explaining briefly why no further priority moves are justified (still grounded in data gaps).
- Categories:
  • COPY_ANGLE — replicate a competitor angle/hook they use more.
  • SHIFT_BUDGET — reallocate modeled spend emphasis across platforms.
  • REFRESH_CREATIVE — fatigue / velocity / creative age issues.
  • DEFEND — protect an edge or baseline.
  • EXPAND — new platform/format/Creative breadth.
- primaryAction: set type to create_brief for creative work, view_ads for inspecting competitor creatives, view_analysis for spend/platform mix. Include angleRef when the move names a specific angle string from the JSON.

FORBIDDEN:
- Long essays, audience narratives, voice-map commentary, "stable presence" filler, archetype bullet lists, subtitles under archetypes.
- Generic advice without numeric evidence from the JSON.

Use competitor and user brand names from the user message. JSON only.`,
    messages: [
      {
        role: "user",
        content: `COMPETITOR (dashboard context): ${competitorName} (${competitorDomain})

${userBits}

${digestSection ? `${digestSection}\n\n` : ""}${evidenceSection}`,
      },
    ],
  });

  if (!res.ok) {
    return { ok: false, error: res.error };
  }

  const model = res.model;
  const costUsd = res.usage.costUsd;

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripJsonFences(res.text));
  } catch {
    return { ok: false, error: "Model returned non-JSON", model, costUsd };
  }

  const checked = brandComparisonResponseSchema.safeParse(parsed);
  if (!checked.success) {
    return { ok: false, error: "Model JSON failed validation", model, costUsd };
  }

  return {
    ok: true,
    result: checked.data,
    model,
    costUsd,
    cacheModelVersion: BRAND_COMPARISON_CACHE_MODEL_VERSION,
  };
}
