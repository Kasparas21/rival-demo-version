import { NextResponse } from "next/server";

import { billingRequiredResponseBody, getBillingEntitlement } from "@/lib/billing/entitlements";
import { resolveAdsCacheDomainForUser } from "@/lib/ad-library/competitor-cache-domain";
import {
  brandComparisonResponseSchema,
  runBrandComparisonLlm,
  type BrandComparisonLlmResult,
} from "@/lib/brand-comparison/run-brand-comparison-llm";
import { sanitizeJsonForPostgres } from "@/lib/json/sanitize-json-for-db";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/types";

export const runtime = "nodejs";
export const maxDuration = 120;

type Body = {
  brandId?: string;
  yourBrandId?: string;
  competitorId?: string;
  competitor?: { name?: string; domain?: string };
  userBrand?: { name?: string; domain?: string; brandContext?: string };
  adEvidence?: string;
  structuredDigest?: string;
};

function normalizeScrapeStampForCache(iso: string | null | undefined): string {
  if (!iso?.trim()) return "1970-01-01T00:00:00.000Z";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "1970-01-01T00:00:00.000Z";
  return new Date(t).toISOString();
}

type CachedPayloadShape = {
  ok?: boolean;
  model?: string;
  comparison?: BrandComparisonLlmResult;
};

async function resolveComparisonIds(params: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  userId: string;
  competitorDomain: string;
  bodyYourBrandId?: string;
  bodyCompetitorId?: string;
  bodyBrandId?: string;
}): Promise<{ yourBrandId: string; competitorId: string } | null> {
  const { supabase, userId, competitorDomain, bodyYourBrandId, bodyCompetitorId, bodyBrandId } = params;
  let yourBrandId = bodyYourBrandId?.trim() ?? "";
  let competitorId = bodyCompetitorId?.trim() ?? "";

  if (!yourBrandId) {
    const requestedBrandId = bodyBrandId?.trim();
    if (requestedBrandId && requestedBrandId !== "default" && requestedBrandId !== "_workspace") {
      const { data: brand } = await supabase
        .from("brands")
        .select("workspace_competitor_id")
        .eq("user_id", userId)
        .eq("id", requestedBrandId)
        .maybeSingle();
      yourBrandId = brand?.workspace_competitor_id ?? "";
    }
  }

  if (!yourBrandId) {
    const { data } = await supabase
      .from("saved_competitors")
      .select("id")
      .eq("user_id", userId)
      .eq("is_workspace_brand", true)
      .maybeSingle();
    yourBrandId = data?.id ?? "";
  }

  if (!competitorId) {
    const { competitorId: cid } = await resolveAdsCacheDomainForUser(supabase, userId, competitorDomain);
    competitorId = cid ?? "";
  }

  if (!yourBrandId || !competitorId) return null;
  return { yourBrandId, competitorId };
}

export async function POST(req: Request): Promise<NextResponse> {
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
      billingRequiredResponseBody("Start your subscription to run brand comparisons."),
      { status: 402 }
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const competitorName = body.competitor?.name?.trim() || "";
  const competitorDomain = body.competitor?.domain?.trim() || "";
  const userBrandName = body.userBrand?.name?.trim() || "";
  if (!competitorName || !competitorDomain || !userBrandName) {
    return NextResponse.json(
      { ok: false, error: "competitor.name, competitor.domain, and userBrand.name are required" },
      { status: 400 }
    );
  }

  const pair = await resolveComparisonIds({
    supabase,
    userId: user.id,
    competitorDomain,
    bodyYourBrandId: body.yourBrandId,
    bodyCompetitorId: body.competitorId,
    bodyBrandId: body.brandId,
  });
  if (!pair) {
    return NextResponse.json(
      { ok: false, error: "Could not resolve workspace brand or competitor saved row for cache." },
      { status: 400 }
    );
  }

  const [{ data: yourRow }, { data: rivalRow }] = await Promise.all([
    supabase
      .from("saved_competitors")
      .select("last_scraped_at")
      .eq("id", pair.yourBrandId)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("saved_competitors")
      .select("last_scraped_at")
      .eq("id", pair.competitorId)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (!yourRow || !rivalRow) {
    return NextResponse.json({ ok: false, error: "Saved competitor rows not found." }, { status: 404 });
  }

  const yourBrandScrapedAt = normalizeScrapeStampForCache(yourRow.last_scraped_at);
  const competitorScrapedAt = normalizeScrapeStampForCache(rivalRow.last_scraped_at);

  const { data: cached, error: cacheReadErr } = await supabase
    .from("brand_comparison_results")
    .select("result_payload, computed_at")
    .eq("user_id", user.id)
    .eq("your_brand_id", pair.yourBrandId)
    .eq("competitor_id", pair.competitorId)
    .eq("your_brand_scraped_at", yourBrandScrapedAt)
    .eq("competitor_scraped_at", competitorScrapedAt)
    .maybeSingle();

  if (cacheReadErr) {
    console.warn("[brand-comparison] cache read", cacheReadErr.message);
  }

  if (cached?.result_payload && typeof cached.result_payload === "object" && !Array.isArray(cached.result_payload)) {
    const p = cached.result_payload as CachedPayloadShape;
    const v2 = p.ok === true && p.comparison ? brandComparisonResponseSchema.safeParse(p.comparison) : null;
    if (v2?.success) {
      if (process.env.NODE_ENV === "development") {
        console.log("[brand-comparison] Supabase cache HIT", {
          yourBrandId: pair.yourBrandId,
          competitorId: pair.competitorId,
          yourBrandScrapedAt,
          competitorScrapedAt,
        });
      }
      return NextResponse.json({
        ok: true,
        model: p.model,
        comparison: v2.data,
        fromCache: true,
        computed_at: cached.computed_at,
      });
    }
  } else if (process.env.NODE_ENV === "development") {
    console.log("[brand-comparison] Supabase cache MISS", {
      yourBrandId: pair.yourBrandId,
      competitorId: pair.competitorId,
      yourBrandScrapedAt,
      competitorScrapedAt,
    });
  }

  const adEvidence = typeof body.adEvidence === "string" ? body.adEvidence : "";
  const structuredDigest = typeof body.structuredDigest === "string" ? body.structuredDigest : "";

  const out = await runBrandComparisonLlm({
    competitorName,
    competitorDomain,
    userBrandName,
    userBrandDomain: body.userBrand?.domain?.trim() || undefined,
    userBrandContext: body.userBrand?.brandContext?.trim() || undefined,
    adEvidence,
    structuredDigest: structuredDigest.trim() || undefined,
  });

  if (!out.ok) {
    const status = out.error.includes("OPENROUTER_API_KEY") ? 503 : 502;
    return NextResponse.json({ ok: false, error: out.error, model: out.model }, { status });
  }

  const responseBody = { ok: true as const, model: out.model, comparison: out.result };

  const admin = createSupabaseAdminClient();
  const { error: upsertErr } = await admin.from("brand_comparison_results").upsert(
    {
      user_id: user.id,
      your_brand_id: pair.yourBrandId,
      competitor_id: pair.competitorId,
      your_brand_scraped_at: yourBrandScrapedAt,
      competitor_scraped_at: competitorScrapedAt,
      result_payload: sanitizeJsonForPostgres(responseBody) as Json,
      ai_model_version: out.cacheModelVersion,
      ai_cost_usd: out.costUsd,
    },
    {
      onConflict: "user_id,your_brand_id,competitor_id,your_brand_scraped_at,competitor_scraped_at",
    }
  );

  if (upsertErr) {
    console.error("[brand-comparison] cache upsert", upsertErr);
  }

  return NextResponse.json(responseBody);
}
