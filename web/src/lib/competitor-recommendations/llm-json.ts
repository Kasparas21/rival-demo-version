import { llmSmart } from "@/lib/llm/anthropic";

export type CostTracker = { usd: number };

/** The first JSON object or array in a model reply (tolerates code fences and stray prose). */
export function extractJson(text: string): unknown {
  const t = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try {
    return JSON.parse(t);
  } catch {
    const start = t.search(/[[{]/);
    const end = Math.max(t.lastIndexOf("}"), t.lastIndexOf("]"));
    if (start < 0 || end <= start) throw new Error("No JSON in model reply");
    return JSON.parse(t.slice(start, end + 1));
  }
}

/** One model call that must return JSON; retried once if the reply doesn't parse. */
export async function llmJson(params: {
  system: string;
  user: string;
  maxTokens: number;
  cost: CostTracker;
}): Promise<unknown> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await llmSmart({
      task: "competitor_recommendations",
      systemPrompt: params.system,
      messages: [{ role: "user", content: params.user }],
      maxTokens: params.maxTokens,
    });
    if (!res.ok) {
      if (attempt === 1) throw new Error(res.error);
      continue;
    }
    params.cost.usd += res.usage.costUsd;
    try {
      return extractJson(res.text);
    } catch (e) {
      if (attempt === 1) throw e;
    }
  }
  throw new Error("unreachable");
}
