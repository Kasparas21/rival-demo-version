import { NextResponse } from "next/server";

import {
  adPreviewAnalysisSchema,
  type AdPreviewAnalysis,
} from "@/lib/ad-detail/ad-ai-analysis-types";
import { billingRequiredResponseBody, getBillingEntitlement } from "@/lib/billing/entitlements";
import {
  canRunAdPreviewAnalysis,
  loadAdPreviewAnalysisUsage,
} from "@/lib/billing/usage-quotas";
import { llmFast } from "@/lib/llm/anthropic";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/lib/supabase/types";
import { assertCanRunSharedAi } from "@/lib/team/permissions";
import { resolveWorkspaceContext } from "@/lib/team/workspace-context";

export const runtime = "nodejs";
export const maxDuration = 120;

const PREVIEW_ANALYSIS_MODEL = "ad-preview-analysis-v1";

function stripJsonFences(text: string): string {
  let t = text.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
  }
  return t.trim();
}

type Body = { adId?: string };

export async function POST(req: Request): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const ctx = await resolveWorkspaceContext(supabase, user.id);
  assertCanRunSharedAi(ctx);
  const dataUserId = ctx.dataUserId;

  const billing = await getBillingEntitlement(supabase, dataUserId);
  if (!billing.hasAccess) {
    return NextResponse.json(
      billingRequiredResponseBody("Subscription required for ad preview AI analysis."),
      { status: 402 },
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const adId = typeof body.adId === "string" ? body.adId.trim() : "";
  if (!adId) {
    return NextResponse.json({ ok: false, error: "adId required" }, { status: 400 });
  }

  const usedThisMonth = await loadAdPreviewAnalysisUsage(supabase, dataUserId);

  const { data: cached } = await supabase
    .from("ad_preview_analysis_cache")
    .select("analysis, ai_model_version, computed_at")
    .eq("ad_id", adId)
    .eq("user_id", dataUserId)
    .maybeSingle();

  if (cached?.analysis) {
    const parsed = adPreviewAnalysisSchema.safeParse(cached.analysis);
    if (parsed.success) {
      const quota = canRunAdPreviewAnalysis(billing, usedThisMonth);
      return NextResponse.json({
        ok: true,
        cached: true,
        model: cached.ai_model_version,
        computed_at: cached.computed_at,
        analysis: parsed.data,
        quota: quota.ok
          ? { used: usedThisMonth, limit: quota.limit, remaining: quota.remaining }
          : { used: usedThisMonth, limit: billing.limits.maxAdPreviewAnalysesPerMonth, remaining: 0 },
      });
    }
  }

  const quotaCheck = canRunAdPreviewAnalysis(billing, usedThisMonth);
  if (!quotaCheck.ok) {
    return NextResponse.json({ ok: false, error: quotaCheck.error }, { status: quotaCheck.status });
  }

  const { data: ad, error: adErr } = await supabase
    .from("scraped_ads")
    .select(
      "id, platform, format, ad_text, ad_creative_url, ai_extracted_angle, funnel_stage, ai_extracted_voice_tone, user_id",
    )
    .eq("id", adId)
    .eq("user_id", dataUserId)
    .maybeSingle();

  if (adErr || !ad) {
    return NextResponse.json({ ok: false, error: "Ad not found" }, { status: 404 });
  }

  const adText = (ad.ad_text ?? "").trim().slice(0, 8000);
  const existingAngle = ad.ai_extracted_angle?.trim() || null;
  const existingFunnel = ad.funnel_stage?.trim() || null;

  const systemPrompt = `You are a senior performance marketing strategist. Analyze competitor ads for creative intelligence.
Output strict JSON only matching this schema:
{
  "psychological_scores": { "empowerment": 0-100, "urgency": 0-100, "security": 0-100, "authority": 0-100, "esteem": 0-100, "engagement": 0-100 },
  "content_style": { "label": string (e.g. "Facts and Stats", "Storytelling", "Social Proof"), "description": string },
  "creative_targeting": { "summary": string (1 sentence audience), "audience_segments": string[] (2-4 items) },
  "persona": { "age_range": string|null, "gender": string|null, "psychographics": string|null },
  "funnel_stage": "TOF"|"MOF"|"BOF"|null,
  "marketing_angle": string|null,
  "offer_mechanics": string|null,
  "emotional_drivers": string[] (2-4),
  "persuasion_triggers": string[] (2-4),
  "scroll_stopper": string|null,
  "visual_storytelling": string|null,
  "competitive_moats": string[] (0-3),
  "risk_flags": string[] (0-3, compliance or weak-message risks),
  "adaptation_playbook": string[] (3-5 actionable bullets to adapt for another brand),
  "copy_structure": {
    "hook": string,
    "body_framework": string[] (2-4 bullets),
    "cta_pattern": string,
    "emotional_register": string,
    "adapt_for_your_brand": string (2-3 sentences)
  },
  "confidence": "high"|"medium"|"low"
}
Score psychological axes based on copy + implied creative. Be specific and practical.`;

  const userPrompt = `Analyze this ad:

Platform: ${ad.platform}
Format: ${ad.format}
Existing angle hint: ${existingAngle ?? "none"}
Existing funnel hint: ${existingFunnel ?? "none"}
Has creative URL: ${ad.ad_creative_url ? "yes" : "no"}
Ad text:
"""${adText || "(no text — infer from format/platform context)"}"""`;

  const res = await llmFast({
    task: "ad_detail_analysis",
    systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
    maxTokens: 2200,
  });

  if (!res.ok) {
    return NextResponse.json({ ok: false, error: res.error }, { status: 502 });
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(stripJsonFences(res.text));
  } catch {
    return NextResponse.json({ ok: false, error: "Model returned non-JSON" }, { status: 502 });
  }

  const checked = adPreviewAnalysisSchema.safeParse(parsedJson);
  if (!checked.success) {
    console.warn("[ad-preview-analysis] invalid shape", checked.error.flatten());
    return NextResponse.json({ ok: false, error: "Invalid analysis shape from model" }, { status: 502 });
  }

  const analysis = checked.data as AdPreviewAnalysis;

  const upsertRow: Database["public"]["Tables"]["ad_preview_analysis_cache"]["Insert"] = {
    ad_id: adId,
    user_id: dataUserId,
    analysis: analysis as unknown as Json,
    ai_model_version: PREVIEW_ANALYSIS_MODEL,
  };

  const admin = createSupabaseAdminClient();
  const { error: upErr } = await admin.from("ad_preview_analysis_cache").upsert(upsertRow, {
    onConflict: "ad_id",
  });
  if (upErr) {
    console.error("[ad-preview-analysis] cache upsert", upErr.message);
    return NextResponse.json(
      { ok: false, error: "Failed to save analysis. Please try again." },
      { status: 500 },
    );
  }

  const { error: usageErr } = await supabase.rpc("increment_ad_preview_analysis_usage");
  if (usageErr) {
    console.warn("[ad-preview-analysis] usage increment", usageErr.message);
  }

  const usedAfter = usedThisMonth + 1;
  const quotaAfter = canRunAdPreviewAnalysis(billing, usedAfter);

  // Mirror copy structure into legacy cache for comparison vault compatibility.
  const copyUpsert: Database["public"]["Tables"]["ad_copy_structure_cache"]["Insert"] = {
    ad_id: adId,
    user_id: dataUserId,
    structure: analysis.copy_structure as unknown as Json,
    ai_model_version: PREVIEW_ANALYSIS_MODEL,
  };
  void admin.from("ad_copy_structure_cache").upsert(copyUpsert, { onConflict: "ad_id" });

  return NextResponse.json({
    ok: true,
    cached: false,
    model: PREVIEW_ANALYSIS_MODEL,
    analysis,
    quota: quotaAfter.ok
      ? { used: usedAfter, limit: quotaAfter.limit, remaining: quotaAfter.remaining }
      : { used: usedAfter, limit: billing.limits.maxAdPreviewAnalysesPerMonth, remaining: 0 },
  });
}

export async function GET(req: Request): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const ctx = await resolveWorkspaceContext(supabase, user.id);
  const dataUserId = ctx.dataUserId;

  const billing = await getBillingEntitlement(supabase, dataUserId);
  const adId = new URL(req.url).searchParams.get("adId")?.trim() ?? "";
  if (!adId) {
    return NextResponse.json({ ok: false, error: "adId required" }, { status: 400 });
  }

  const usedThisMonth = await loadAdPreviewAnalysisUsage(supabase, dataUserId);
  const quota = canRunAdPreviewAnalysis(billing, usedThisMonth);

  const { data: cached } = await supabase
    .from("ad_preview_analysis_cache")
    .select("analysis, computed_at, ai_model_version")
    .eq("ad_id", adId)
    .eq("user_id", dataUserId)
    .maybeSingle();

  let analysis: AdPreviewAnalysis | null = null;
  if (cached?.analysis) {
    const parsed = adPreviewAnalysisSchema.safeParse(cached.analysis);
    if (parsed.success) analysis = parsed.data;
  }

  return NextResponse.json({
    ok: true,
    analysis,
    computed_at: cached?.computed_at ?? null,
    quota: quota.ok
      ? { used: usedThisMonth, limit: quota.limit, remaining: quota.remaining }
      : { used: usedThisMonth, limit: billing.limits.maxAdPreviewAnalysesPerMonth, remaining: 0 },
  });
}
