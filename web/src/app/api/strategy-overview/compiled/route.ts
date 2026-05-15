import { after } from "next/server";
import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureSavedCompetitorForStrategyOverview } from "@/lib/strategy-overview/ensure-saved-competitor";
import {
  buildNoAdsFoundPayload,
  getCachedStrategyOverview,
  getLatestScrapeBatchId,
  getStaleStrategyOverviewPayload,
  loadSavedCompetitorForUser,
  recomputeStrategyOverviewForCompetitor,
} from "@/lib/strategy-overview/recompute-strategy-overview";
import { deriveStrategyOverviewPayload } from "@/lib/strategy-overview/strategyDerivation";
import type { ScrapedAdInput } from "@/lib/strategy-overview/strategyDerivation";
import type { CompetitorStrategyOverviewPayload } from "@/lib/strategy-overview/payload-types";
import { normalizeCompetitorStrategyOverviewPayload } from "@/lib/strategy-overview/normalize-strategy-payload";
import { tryHydrateScrapedAdsFromAdsCache } from "@/lib/strategy-overview/hydrate-scraped-from-ads-cache";
import type { Database } from "@/lib/supabase/types";

export const runtime = "nodejs";
/** Request ceiling; effective wall time is min(this, Vercel plan). Heavy work runs in `after()`. */
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
    ai_extracted_launch_date: r.ai_extracted_launch_date ?? null,
    ai_extracted_voice_tone: r.ai_extracted_voice_tone ?? null,
    is_active: r.is_active,
    raw_payload: r.raw_payload,
  };
}

function scheduleBackgroundRecompute(params: {
  competitorDomain: string;
  userId: string;
  competitorId: string;
  stealLock: boolean;
  refreshAdEnrichment: boolean;
}): void {
  const { competitorDomain, userId, competitorId, stealLock, refreshAdEnrichment } = params;
  after(async () => {
    try {
      const sb = await createSupabaseServerClient();
      const {
        data: { user: u2 },
      } = await sb.auth.getUser();
      if (!u2 || u2.id !== userId) return;
      const r = await recomputeStrategyOverviewForCompetitor({
        supabase: sb,
        userId,
        competitorId,
        domainHint: competitorDomain,
        stealLock,
        refreshAdEnrichment,
        staleLockMs: stealLock ? USER_STALE_LOCK_MS : undefined,
      });
      if (!r.ok) console.warn("[compiled] background recompute:", r.error);
    } catch (e) {
      console.error("[compiled] background recompute failed", e);
    }
  });
}

async function derivePayloadFromAdRows(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  adsRows: Database["public"]["Tables"]["scraped_ads"]["Row"][],
  meta: NonNullable<Awaited<ReturnType<typeof loadSavedCompetitorForUser>>>,
  userId: string
): Promise<CompetitorStrategyOverviewPayload> {
  const inputs = adsRows.map(rowToInput);
  const batchId = await getLatestScrapeBatchId(supabase, meta.competitorId);
  const footprintRows = adsRows.map((r) => ({
    id: r.id,
    platform: r.platform,
    first_seen_at: r.first_seen_at,
    last_seen_at: r.last_seen_at,
    is_active: r.is_active,
    raw_payload: r.raw_payload,
  }));
  return deriveStrategyOverviewPayload(
    inputs,
    {
      name: meta.name,
      domain: meta.brandDomain ?? meta.cacheDomain,
      logoUrl: meta.logoUrl,
    },
    batchId,
    {
      spendV2: {
        footprintRows,
        competitorId: meta.competitorId,
        userId,
        brandDomain: meta.brandDomain,
        lastScrapedAt: meta.lastScrapedAt,
      },
    }
  );
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

  const hydrateResult = await tryHydrateScrapedAdsFromAdsCache(supabase, {
    userId: user.id,
    competitorId: meta.competitorId,
    domainHint: domain,
  });
  if (!hydrateResult.ok) {
    console.error("[compiled] hydrate_from_ads_cache", hydrateResult);
  }

  if (!force) {
    const cached = await getCachedStrategyOverview(supabase, user.id, meta.competitorId, domain);
    if (cached) {
      return NextResponse.json(
        { ok: true, cached: true, payload: normalizeCompetitorStrategyOverviewPayload(cached) },
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
      scheduleBackgroundRecompute({
        competitorDomain: domain,
        userId: user.id,
        competitorId: meta.competitorId,
        stealLock: true,
        refreshAdEnrichment: true,
      });
      return NextResponse.json(
        { ok: true, cached: true, recomputing: true, payload: normalizeCompetitorStrategyOverviewPayload(stale) },
        {
          headers: {
            "Cache-Control": "private, no-cache",
          },
        }
      );
    }
  }

  const { data: adsRows, error: adsErr } = await supabase
    .from("scraped_ads")
    .select("*")
    .eq("competitor_id", meta.competitorId)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1000);

  if (adsErr) {
    return NextResponse.json({ ok: false, error: adsErr.message }, { status: 500 });
  }

  const rows = adsRows ?? [];
  if (rows.length === 0) {
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
        const stalePayload = await getStaleStrategyOverviewPayload(supabase, user.id, meta.competitorId);
        const empty = buildNoAdsFoundPayload({
          name: meta.name,
          domain: meta.brandDomain ?? meta.cacheDomain,
          logoUrl: meta.logoUrl,
        });
        const outPayload = normalizeCompetitorStrategyOverviewPayload(stalePayload ?? empty);
        return NextResponse.json({
          ok: true,
          cached: false,
          staleWhileRecomputing: true,
          payload: outPayload,
        });
      }
      return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
    }

    return NextResponse.json(
      { ok: true, cached: false, payload: normalizeCompetitorStrategyOverviewPayload(result.payload) },
      {
        headers: {
          "Cache-Control": "private, max-age=300, stale-while-revalidate=3600",
        },
      }
    );
  }

  console.log(
    `[compiled/fast-path] competitorId=${meta.competitorId} ads=${rows.length} → derive now, full recompute in background (force=${force})`
  );

  let quickPayload: CompetitorStrategyOverviewPayload;
  try {
    quickPayload = await derivePayloadFromAdRows(supabase, rows, meta, user.id);
  } catch (e) {
    console.error("[compiled] derivePayloadFromAdRows failed", e);
    return NextResponse.json({ ok: false, error: "Failed to build strategy overview" }, { status: 500 });
  }

  const enrichedDb =
    rows.filter((r) => r.ai_enrichment_status === "enriched").length;
  const enrichmentRate = rows.length > 0 ? enrichedDb / rows.length : 0;
  quickPayload = normalizeCompetitorStrategyOverviewPayload({
    ...quickPayload,
    lowEnrichmentConfidence: rows.length > 0 && enrichmentRate < 0.5,
    insufficientEnrichedAds: enrichedDb < 5,
  });

  scheduleBackgroundRecompute({
    competitorDomain: domain,
    userId: user.id,
    competitorId: meta.competitorId,
    stealLock: force,
    refreshAdEnrichment: force,
  });

  return NextResponse.json(
    {
      ok: true,
      cached: false,
      recomputing: true,
      staleWhileRecomputing: true,
      payload: quickPayload,
    },
    {
      headers: {
        "Cache-Control": "private, no-cache",
      },
    }
  );
}
