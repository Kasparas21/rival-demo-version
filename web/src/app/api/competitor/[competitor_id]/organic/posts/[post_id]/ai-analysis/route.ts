import { NextResponse } from "next/server";

import { billingRequiredResponseBody, getBillingEntitlement } from "@/lib/billing/entitlements";
import {
  canRunAdPreviewAnalysis,
  loadAdPreviewAnalysisUsage,
} from "@/lib/billing/usage-quotas";
import {
  analyzeOrganicPost,
  PREVIEW_ANALYSIS_MODEL,
} from "@/lib/organic-content/analyze-organic-post";
import {
  organicPostPreviewAnalysisSchema,
  type OrganicPostPreviewAnalysis,
} from "@/lib/organic-content/organic-post-ai-analysis-types";
import { enrichOrganicPostForApi } from "@/lib/organic-content/post-display";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/lib/supabase/types";

export const runtime = "nodejs";
export const maxDuration = 120;
export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(
  _req: Request,
  context: { params: Promise<{ competitor_id: string; post_id: string }> },
) {
  const { competitor_id: competitorIdRaw, post_id: postIdRaw } = await context.params;
  const competitorId = competitorIdRaw?.trim() ?? "";
  const postId = postIdRaw?.trim() ?? "";

  if (!competitorId || !UUID_RE.test(competitorId)) {
    return NextResponse.json({ ok: false, error: "Invalid competitor_id" }, { status: 400 });
  }
  if (!postId || !UUID_RE.test(postId)) {
    return NextResponse.json({ ok: false, error: "Invalid post_id" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const billing = await getBillingEntitlement(supabase, user.id);
  if (!billing.hasAccess) {
    return NextResponse.json(
      billingRequiredResponseBody("Subscription required for organic post AI analysis."),
      { status: 402 },
    );
  }

  const usedThisMonth = await loadAdPreviewAnalysisUsage(supabase, user.id);

  const { data: cached } = await supabase
    .from("organic_post_preview_analysis_cache")
    .select("analysis, ai_model_version, computed_at")
    .eq("organic_post_id", postId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (cached?.analysis) {
    const parsed = organicPostPreviewAnalysisSchema.safeParse(cached.analysis);
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

  const { data: competitor } = await supabase
    .from("saved_competitors")
    .select("id, name")
    .eq("id", competitorId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!competitor) {
    return NextResponse.json({ ok: false, error: "Competitor not found" }, { status: 404 });
  }

  const { data: post, error: postErr } = await supabase
    .from("organic_posts")
    .select("id, platform, content, likes, comments, shares, views, media_urls, raw_data")
    .eq("id", postId)
    .eq("competitor_id", competitorId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (postErr || !post) {
    return NextResponse.json({ ok: false, error: "Post not found" }, { status: 404 });
  }

  const enriched = enrichOrganicPostForApi(post);

  const analysisResult = await analyzeOrganicPost({
    platform: post.platform,
    content: (post.content ?? "").trim().slice(0, 8000),
    product_type: enriched.product_type ?? null,
    likes: post.likes,
    comments: post.comments,
    shares: post.shares,
    views: post.views ?? 0,
    has_media: (post.media_urls?.length ?? 0) > 0,
    competitor_name: competitor.name,
  });

  if (!analysisResult.ok) {
    return NextResponse.json({ ok: false, error: analysisResult.error }, { status: 502 });
  }

  const analysis = analysisResult.analysis as OrganicPostPreviewAnalysis;

  const upsertRow: Database["public"]["Tables"]["organic_post_preview_analysis_cache"]["Insert"] = {
    organic_post_id: postId,
    user_id: user.id,
    analysis: analysis as unknown as Json,
    ai_model_version: PREVIEW_ANALYSIS_MODEL,
  };

  const { error: upErr } = await supabase
    .from("organic_post_preview_analysis_cache")
    .upsert(upsertRow, { onConflict: "organic_post_id,user_id" });

  if (upErr) {
    console.error("[organic-post-preview-analysis] cache upsert", upErr.message);
    return NextResponse.json(
      { ok: false, error: "Failed to save analysis. Please try again." },
      { status: 500 },
    );
  }

  const { error: usageErr } = await supabase.rpc("increment_ad_preview_analysis_usage");
  if (usageErr) {
    console.warn("[organic-post-preview-analysis] usage increment", usageErr.message);
  }

  const usedAfter = usedThisMonth + 1;
  const quotaAfter = canRunAdPreviewAnalysis(billing, usedAfter);

  return NextResponse.json({
    ok: true,
    cached: false,
    model: PREVIEW_ANALYSIS_MODEL,
    analysis,
    computed_at: new Date().toISOString(),
    quota: quotaAfter.ok
      ? { used: usedAfter, limit: quotaAfter.limit, remaining: quotaAfter.remaining }
      : { used: usedAfter, limit: billing.limits.maxAdPreviewAnalysesPerMonth, remaining: 0 },
  });
}
