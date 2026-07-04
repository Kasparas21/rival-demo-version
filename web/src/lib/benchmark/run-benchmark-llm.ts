import { z } from "zod";

import { llmSmart } from "@/lib/llm/anthropic";
import type { BenchmarkAiSummary, BenchmarkPlatformId } from "@/lib/benchmark/benchmark-types";
import { BENCHMARK_PLATFORM_LABELS } from "@/lib/benchmark/benchmark-types";

function stripJsonFences(text: string): string {
  let t = text.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
  }
  return t.trim();
}

const benchmarkAiSchema = z.object({
  winning: z.array(z.string()).max(3),
  behind: z.array(z.string()).max(3),
  biggestOpportunity: z.string(),
});

export async function runBenchmarkLlm(params: {
  userBrandName: string;
  metricsSummary: string;
  platformGaps: BenchmarkPlatformId[];
  angleGaps: string[];
}): Promise<
  { ok: true; result: BenchmarkAiSummary; model: string } | { ok: false; error: string; model?: string }
> {
  if (!process.env.OPENROUTER_API_KEY?.trim()) {
    return { ok: false, error: "OPENROUTER_API_KEY not configured" };
  }

  const gapPlatforms = params.platformGaps
    .map((p) => BENCHMARK_PLATFORM_LABELS[p])
    .filter(Boolean)
    .join(", ");
  const gapAngles = params.angleGaps.slice(0, 6).join(", ") || "none noted";

  const res = await llmSmart({
    task: "benchmark",
    maxTokens: 1_024,
    systemPrompt: `You summarize a competitive benchmark for the marketer's own brand "${params.userBrandName}" vs their tracked rivals.

Use ONLY the metrics provided. Rank/framing matters more than raw volume — a smaller brand can be winning on freshness or focus.

Return ONLY valid JSON:
{
  "winning": string[2-3],
  "behind": string[2-3],
  "biggestOpportunity": string
}

Rules:
- Short, plain-English bullets (one sentence each).
- "winning" = relative strengths vs the set (rank, focus, freshness, platform fit).
- "behind" = meaningful gaps (platforms, pace, angles) without shaming small brands.
- "biggestOpportunity" = one actionable priority.
- No fabricated numbers beyond what's in the metrics.`,
    messages: [
      {
        role: "user",
        content: `Metrics:\n${params.metricsSummary}\n\nPlatform gaps (you lack): ${gapPlatforms || "none"}\nAngle gaps: ${gapAngles}`,
      },
    ],
  });

  if (!res.ok) return { ok: false, error: res.error };

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripJsonFences(res.text));
  } catch {
    return { ok: false, error: "Model returned non-JSON", model: res.model };
  }

  const checked = benchmarkAiSchema.safeParse(parsed);
  if (!checked.success) {
    return { ok: false, error: "Model JSON failed validation", model: res.model };
  }

  return { ok: true, result: checked.data, model: res.model };
}
