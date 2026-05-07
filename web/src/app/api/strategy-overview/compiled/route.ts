import { after } from "next/server";
import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureSavedCompetitorForStrategyOverview } from "@/lib/strategy-overview/ensure-saved-competitor";
import {
  getCachedStrategyOverview,
  getStaleStrategyOverviewPayload,
  loadSavedCompetitorForUser,
  recomputeStrategyOverviewForCompetitor,
} from "@/lib/strategy-overview/recompute-strategy-overview";
import { deriveStrategyOverviewPayload } from "@/lib/strategy-overview/strategyDerivation";
import type { ScrapedAdInput } from "@/lib/strategy-overview/strategyDerivation";
import type { Database } from "@/lib/supabase/types";

export const runtime = "nodejs";
export const maxDuration = 300;

const USER_STALE_LOCK_MS = 90_000;

function rowToInput(r: Database["public"]["Tables"]["scraped_ads"]["Row"]): ScrapedAdInput {
  return {
    id: r.id,
    platform: r.platform,
    ad_text: r.ad_text,
    format: r.format,
    first_seen_at: r.first_seen_at,
    last_seen_at: r.last_seen_at,
    ai_extracted_angle: r.ai_extracted_angle,
    funnel_stage: r.funnel_stage,
    ai_enrichment_status: r.ai_enrichment_status ?? null,
  };
}

export async function GET(req: Request): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const domain = (url.searchParams.get("competitorDomain") ?? url.searchParams.get("domain") ?? "").trim();
  const force = url.searchParams.get("force") === "1" || url.searchParams.get("force") === "true";

  if (!domain) {
    return NextResponse.json({ ok: false, error: "competitorDomain required" }, { status: 400 });
  }

  await ensureSavedCompetitorForStrategyOverview(supabase, user.id, domain);

  const meta = await loadSavedCompetitorForUser(supabase, user.id, domain);
  if (!meta) {
    return NextResponse.json({ ok: false, error: "Competitor not found" }, { status: 404 });
  }

  if (!force) {
    const cached = await getCachedStrategyOverview(supabase, user.id, meta.competitorId, domain);
    if (cached) {
      return NextResponse.json(
        { ok: true, cached: true, payload: cached },
        {
          headers: {
            "Cache-Control": "private, max-age=300, stale-while-revalidate=3600",
          },
        }
      );
    }
  }

  if (force) {
    const stale = await getStaleStrategyOverviewPayload(supabase, user.id, meta.competitorId);
    if (stale) {
      const competitorDomain = domain;
      const uid = user.id;
      const cid = meta.competitorId;
      after(async () => {
        try {
          const sb = await createSupabaseServerClient();
          const {
            data: { user: u2 },
          } = await sb.auth.getUser();
          if (!u2 || u2.id !== uid) return;
          const r = await recomputeStrategyOverviewForCompetitor({
            supabase: sb,
            userId: uid,
            competitorId: cid,
            domainHint: competitorDomain,
            stealLock: true,
            refreshAdEnrichment: true,
          });
          if (!r.ok) console.warn("[compiled] background recompute:", r.error);
        } catch (e) {
          console.error("[compiled] background recompute failed", e);
        }
      });
      return NextResponse.json(
        { ok: true, cached: true, recomputing: true, payload: stale },
        {
          headers: {
            "Cache-Control": "private, no-cache",
          },
        }
      );
    }
  }

  const result = await recomputeStrategyOverviewForCompetitor({
    supabase,
    userId: user.id,
    competitorId: meta.competitorId,
    domainHint: domain,
    stealLock: force,
    refreshAdEnrichment: force,
    staleLockMs: force ? USER_STALE_LOCK_MS : undefined,
  });

  if (!result.ok) {
    if (result.error.includes("already in progress")) {
      const { data: adsRows } = await supabase
        .from("scraped_ads")
        .select("*")
        .eq("competitor_id", meta.competitorId)
        .eq("user_id", user.id)
        .eq("is_active", true)
        .limit(1000);

      const stalePayload = await getStaleStrategyOverviewPayload(supabase, user.id, meta.competitorId);
      const inputs = (adsRows ?? []).map(rowToInput);
      const fallback =
        stalePayload ??
        deriveStrategyOverviewPayload(
          inputs,
          {
            name: meta.name,
            domain: meta.brandDomain ?? meta.cacheDomain,
            logoUrl: meta.logoUrl,
          },
          null
        );

      return NextResponse.json({
        ok: true,
        cached: false,
        staleWhileRecomputing: true,
        payload: fallback,
      });
    }

    return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  }

  return NextResponse.json(
    { ok: true, cached: false, payload: result.payload },
    {
      headers: {
        "Cache-Control": "private, max-age=300, stale-while-revalidate=3600",
      },
    }
  );
}
