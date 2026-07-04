import { llmFast } from "@/lib/llm/anthropic";

export type HaikuBatchScores = {
  production_quality: number;
  production_reason: string;
  copy_sophistication: number;
  copy_reason: string;
  distinct_product_count: number;
  products_summary: string;
};

function clamp01to100(n: unknown): number | null {
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function clampCount(n: unknown): number | null {
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  return Math.max(0, Math.round(n));
}

function stripJsonFence(raw: string): string {
  let t = raw.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?\s*/i, "");
    t = t.replace(/\s*```\s*$/i, "");
  }
  return t.trim();
}

/**
 * Single batched Haiku call per competitor per scoring run (Signals 1, 6, 7).
 */
export async function scoreWithHaikuBatch(params: {
  sampleAds: { format: string; copy: string; hasVideo: boolean }[];
  adCopiesForProducts: string[];
}): Promise<{ ok: true; data: HaikuBatchScores } | { ok: false; error: string }> {
  const samples = params.sampleAds.slice(0, 8);
  const copies = params.adCopiesForProducts.slice(0, 20).map((c) => c.slice(0, 150));

  const lines = samples.map(
    (s, i) =>
      `${i + 1}. format=${s.format}; has_video=${s.hasVideo}; copy="${s.copy.replace(/"/g, "'")}"`
  );

  const user = [
    "Here are sample ads from one advertiser. Score them for operational sophistication.",
    "",
    "Ads (samples):",
    ...lines,
    "",
    "All ad copies for product breadth (may repeat):",
    copies.map((c, i) => `${i + 1}. ${c.replace(/\s+/g, " ")}`).join("\n"),
    "",
    "Return ONLY valid JSON with this shape (no markdown):",
    "{",
    '  "production_quality": <0-100 integer>,',
    '  "production_reason": "<one sentence>",',
    '  "copy_sophistication": <0-100 integer>,',
    '  "copy_reason": "<one sentence>",',
    '  "distinct_product_count": <non-negative integer>,',
    '  "products_summary": "<one sentence>"',
    "}",
  ].join("\n");

  const res = await llmFast({
    task: "activity_score",
    systemPrompt:
      "You are scoring an advertiser's operational sophistication from ad-library metadata only (no live web). Return ONLY valid JSON, no prose outside the JSON object.",
    messages: [{ role: "user", content: user }],
    maxTokens: 900,
  });

  if (!res.ok) {
    console.error("[activity-score:haiku] request failed:", res.error);
    return { ok: false, error: res.error };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripJsonFence(res.text));
  } catch (e) {
    console.error("[activity-score:haiku] JSON parse failed. Raw:", res.text.slice(0, 500));
    return {
      ok: false,
      error: e instanceof Error ? e.message : "invalid_json",
    };
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, error: "invalid_shape" };
  }
  const o = parsed as Record<string, unknown>;
  const pq = clamp01to100(o.production_quality);
  const cs = clamp01to100(o.copy_sophistication);
  const dc = clampCount(o.distinct_product_count);
  if (pq == null || cs == null || dc == null) {
    console.error("[activity-score:haiku] missing numeric fields:", o);
    return { ok: false, error: "missing_fields" };
  }

  return {
    ok: true,
    data: {
      production_quality: pq,
      production_reason: typeof o.production_reason === "string" ? o.production_reason : "",
      copy_sophistication: cs,
      copy_reason: typeof o.copy_reason === "string" ? o.copy_reason : "",
      distinct_product_count: dc,
      products_summary: typeof o.products_summary === "string" ? o.products_summary : "",
    },
  };
}
