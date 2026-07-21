import { NextResponse } from "next/server";

import { billingRequiredResponseBody, getBillingEntitlement } from "@/lib/billing/entitlements";
import {
  canRunAdPreviewAnalysis,
  loadAdPreviewAnalysisUsage,
} from "@/lib/billing/usage-quotas";
import {
  organicPostPreviewAnalysisSchema,
  type OrganicPostPreviewAnalysis,
} from "@/lib/organic-content/organic-post-ai-analysis-types";
import { enrichOrganicPostForApi, toOrganicPostClientPayload } from "@/lib/organic-content/post-display";
import { getRequestWorkspace } from "@/lib/team/session-workspace";
import { workspaceReadClient } from "@/lib/team/workspace-read-client";
import type { Database, Json } from "@/lib/supabase/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
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

    const workspace = await getRequestWorkspace();
  if (!workspace) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { dataUserId } = workspace;
  const db = workspaceReadClient(workspace);

  const billing = await getBillingEntitlement(db, dataUserId);
  if (!billing.hasAccess) {
    return NextResponse.json(
      billingRequiredResponseBody("Subscription required for organic post details."),
      { status: 402 },
    );
  }

  const { data: competitor } = await db
    .from("saved_competitors")
    .select("id, name, brand_domain, logo_url, brand_logo_url")
    .eq("id", competitorId)
    .eq("user_id", dataUserId)
    .maybeSingle();

  if (!competitor) {
    return NextResponse.json({ ok: false, error: "Competitor not found" }, { status: 404 });
  }

  const { data: row, error: postErr } = await db
    .from("organic_posts")
    .select("*")
    .eq("id", postId)
    .eq("competitor_id", competitorId)
    .eq("user_id", dataUserId)
    .maybeSingle();

  if (postErr || !row) {
    return NextResponse.json({ ok: false, error: "Post not found" }, { status: 404 });
  }

  const enriched = enrichOrganicPostForApi(row);
  const post = {
    ...toOrganicPostClientPayload(enriched),
    scraped_at: row.scraped_at,
  };

  const usedThisMonth = await loadAdPreviewAnalysisUsage(db, dataUserId);
  const quotaCheck = canRunAdPreviewAnalysis(billing, usedThisMonth);

  const { data: analysisCache } = await db
    .from("organic_post_preview_analysis_cache")
    .select("analysis, computed_at")
    .eq("organic_post_id", postId)
    .eq("user_id", dataUserId)
    .maybeSingle();

  let previewAnalysis: OrganicPostPreviewAnalysis | undefined;
  if (analysisCache?.analysis) {
    const parsed = organicPostPreviewAnalysisSchema.safeParse(analysisCache.analysis);
    if (parsed.success) previewAnalysis = parsed.data;
  }

  return NextResponse.json({
    ok: true,
    post,
    competitor: {
      id: competitor.id,
      name: competitor.name,
      domain: competitor.brand_domain,
      logo_url: competitor.logo_url ?? competitor.brand_logo_url,
    },
    context: {
      preview_analysis: previewAnalysis,
      preview_analysis_computed_at: analysisCache?.computed_at ?? null,
      preview_analysis_quota: quotaCheck.ok
        ? { used: usedThisMonth, limit: quotaCheck.limit, remaining: quotaCheck.remaining }
        : {
            used: usedThisMonth,
            limit: billing.limits.maxAdPreviewAnalysesPerMonth,
            remaining: 0,
          },
    },
  });
}
