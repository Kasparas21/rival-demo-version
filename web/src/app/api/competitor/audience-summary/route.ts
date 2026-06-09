import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CompetitorStrategyOverviewPayload } from "@/lib/strategy-overview/payload-types";
import {
  getCachedStrategyOverview,
  getStaleStrategyOverviewPayload,
  loadSavedCompetitorForUser,
} from "@/lib/strategy-overview/recompute-strategy-overview";
import {
  isStrategyRecomputeRunning,
} from "@/lib/strategy-overview/strategy-overview-display";

export const runtime = "nodejs";

async function loadWorkspaceBrandRow(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  brandId?: string | null,
) {
  const requested = brandId?.trim();
  if (requested && requested !== "default" && requested !== "_workspace") {
    const { data: brand } = await supabase
      .from("brands")
      .select("workspace_competitor_id")
      .eq("user_id", userId)
      .eq("id", requested)
      .maybeSingle();
    if (brand?.workspace_competitor_id) {
      const { data } = await supabase
        .from("saved_competitors")
        .select("id, name, brand_name, brand_domain, brand_logo_url, logo_url, slug, last_scraped_at")
        .eq("user_id", userId)
        .eq("id", brand.workspace_competitor_id)
        .maybeSingle();
      if (data) return data;
    }
  }

  const { data } = await supabase
    .from("saved_competitors")
    .select("id, name, brand_name, brand_domain, brand_logo_url, logo_url, slug, last_scraped_at")
    .eq("user_id", userId)
    .eq("is_workspace_brand", true)
    .maybeSingle();
  return data ?? null;
}

async function loadAudienceHistory(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  competitorId: string,
  limit = 4
) {
  const { data, error } = await supabase
    .from("competitor_strategy_overview_snapshots")
    .select("computed_at, payload")
    .eq("user_id", userId)
    .eq("competitor_id", competitorId)
    .order("computed_at", { ascending: false })
    .limit(limit);

  if (error || !data?.length) return [];

  const chronological = [...data].reverse();
  return chronological.map((row) => {
    const p = row.payload as CompetitorStrategyOverviewPayload | null;
    const ai = p?.audience_inference;
    const primary =
      ai?.segments?.find((s) => s.name === ai?.primarySegmentName) ?? ai?.segments?.[0];
    return {
      snapshotDate: row.computed_at,
      primarySegmentName: primary?.name ?? ai?.primarySegmentName ?? "—",
      primaryConfidence: typeof primary?.confidence === "number" ? primary.confidence : 0,
    };
  });
}

async function resolveCachedPayload(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  competitorId: string,
  domainHint: string
): Promise<CompetitorStrategyOverviewPayload | null> {
  const fresh = await getCachedStrategyOverview(supabase, userId, competitorId, domainHint);
  if (fresh) return fresh;
  return getStaleStrategyOverviewPayload(supabase, userId, competitorId);
}

/** Lightweight audience read — cache only, no derivation. */
export async function GET(req: Request): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const competitorDomain = (url.searchParams.get("competitorDomain") ?? url.searchParams.get("domain") ?? "").trim();
  const brandId = url.searchParams.get("brandId");
  if (!competitorDomain) {
    return NextResponse.json({ ok: false, error: "competitorDomain required" }, { status: 400 });
  }

  const wsRow = await loadWorkspaceBrandRow(supabase, user.id, brandId);
  if (!wsRow) {
    return NextResponse.json(
      { ok: false, error: "Workspace brand not configured. Complete onboarding or link a workspace competitor." },
      { status: 404 }
    );
  }

  const rivalMeta = await loadSavedCompetitorForUser(supabase, user.id, competitorDomain);
  if (!rivalMeta) {
    return NextResponse.json({ ok: false, error: "Competitor not found" }, { status: 404 });
  }

  const wsDomainHint = (wsRow.brand_domain?.trim() || wsRow.slug || "").toLowerCase();

  const [wsPayload, compPayload, audienceHistory, recomputing] = await Promise.all([
    resolveCachedPayload(supabase, user.id, wsRow.id, wsDomainHint),
    resolveCachedPayload(
      supabase,
      user.id,
      rivalMeta.competitorId,
      rivalMeta.brandDomain ?? rivalMeta.cacheDomain
    ),
    loadAudienceHistory(supabase, user.id, rivalMeta.competitorId),
    isStrategyRecomputeRunning(supabase, rivalMeta.competitorId),
  ]);

  return NextResponse.json(
    {
      ok: true,
      workspace: {
        name: wsRow.brand_name?.trim() || wsRow.name,
        domain: wsDomainHint || null,
        logoUrl: wsRow.brand_logo_url ?? wsRow.logo_url,
        payload: wsPayload,
      },
      competitor: {
        name: rivalMeta.name,
        domain: (rivalMeta.brandDomain ?? rivalMeta.cacheDomain).toLowerCase(),
        logoUrl: rivalMeta.logoUrl,
        lastScrapedAt: rivalMeta.lastScrapedAt,
        payload: compPayload,
        audienceHistory,
        recomputing,
      },
    },
    {
      headers: {
        "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
      },
    }
  );
}
