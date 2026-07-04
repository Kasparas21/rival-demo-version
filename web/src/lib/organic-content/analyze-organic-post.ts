import { llmFast } from "@/lib/llm/anthropic";
import {
  organicPostPreviewAnalysisSchema,
  type OrganicPostPreviewAnalysis,
} from "@/lib/organic-content/organic-post-ai-analysis-types";

const PREVIEW_ANALYSIS_MODEL = "organic-post-preview-analysis-v1";

function stripJsonFences(text: string): string {
  let t = text.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
  }
  return t.trim();
}

export type OrganicPostAnalysisInput = {
  platform: string;
  content: string;
  product_type: string | null;
  likes: number;
  comments: number;
  shares: number;
  views: number;
  has_media: boolean;
  competitor_name: string;
};

export async function analyzeOrganicPost(
  input: OrganicPostAnalysisInput,
): Promise<{ ok: true; analysis: OrganicPostPreviewAnalysis } | { ok: false; error: string }> {
  const systemPrompt = `You are a senior social media strategist. Analyze competitor organic social posts for content intelligence.
Output strict JSON only matching this schema:
{
  "content_style": { "label": string (e.g. "Behind the Scenes", "Product Showcase", "UGC-style"), "description": string },
  "hook_analysis": string (why the opening stops the scroll),
  "engagement_drivers": string[] (2-4 reasons this post drives engagement),
  "audience_signals": string[] (2-4 inferred audience traits),
  "format_notes": string (how the format — reel, carousel, photo, text — contributes),
  "brand_voice": string (tone and voice in 1-2 sentences),
  "why_it_works": string[] (2-4 bullets),
  "risk_flags": string[] (0-3, e.g. off-brand, low clarity),
  "replication_playbook": string[] (3-5 actionable bullets to adapt for another brand),
  "organic_scores": {
    "entertainment": 0-100,
    "authenticity": 0-100,
    "relatability": 0-100,
    "aspiration": 0-100,
    "education": 0-100,
    "community": 0-100
  },
  "confidence": "high"|"medium"|"low"
}
Focus on organic content patterns, not paid ads. Be specific and practical.`;

  const userPrompt = `Analyze this organic social post:

Brand: ${input.competitor_name}
Platform: ${input.platform}
Post type: ${input.product_type ?? "unknown"}
Has media: ${input.has_media ? "yes" : "no"}
Engagement: ${input.likes} likes, ${input.comments} comments, ${input.shares} shares, ${input.views} views
Caption:
"""${input.content || "(no caption — infer from format/platform context)"}"""`;

  const res = await llmFast({
    task: "organic_post_analysis",
    systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
    maxTokens: 2200,
  });

  if (!res.ok) {
    return { ok: false, error: res.error };
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(stripJsonFences(res.text));
  } catch {
    return { ok: false, error: "Model returned non-JSON" };
  }

  const checked = organicPostPreviewAnalysisSchema.safeParse(parsedJson);
  if (!checked.success) {
    console.warn("[organic-post-preview-analysis] invalid shape", checked.error.flatten());
    return { ok: false, error: "Invalid analysis shape from model" };
  }

  return { ok: true, analysis: checked.data };
}

export { PREVIEW_ANALYSIS_MODEL };
