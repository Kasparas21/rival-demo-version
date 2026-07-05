import { after } from "next/server";
import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureSavedCompetitorForStrategyOverview } from "@/lib/strategy-overview/ensure-saved-competitor";
import { deriveAndPersistFastPathStrategyOverview } from "@/lib/strategy-overview/derive-and-persist-fast-path";
import {
  isStrategyRecomputeRunning,
  scrapeIsNewerThanOverview,
} from "@/lib/strategy-overview/strategy-overview-display";
import {
  buildNoAdsFoundPayload,
  getCachedStrategyOverview,
  getStaleStrategyOverviewPayload,
  loadSavedCompetitorForUser,
  recomputeStrategyOverviewForCompetitor,
} from "@/lib/strategy-overview/recompute-strategy-overview";
import {
  buildStrategyRuntimeLayers,
} from "@/lib/strategy-overview/build-runtime-layers";
import { normalizeCompetitorStrategyOverviewPayload } from "@/lib/strategy-overview/normalize-strategy-payload";
import type { CompetitorStrategyOverviewPayload } from "@/lib/strategy-overview/payload-types";
import { tryHydrateScrapedAdsFromAdsCache } from "@/lib/strategy-overview/hydrate-scraped-from-ads-cache";
import { SCRAPED_ADS_DERIVATION_SELECT, type ScrapedAdDerivationRow } from "@/lib/strategy-overview/scraped-ads-derivation-columns";

export const runtime = "nodejs";
/** Request ceiling; effective wall time is min(this, Vercel plan). Heavy work runs in `after()`. */
export const maxDuration = 300;

const USER_STALE_LOCK_MS = 90_000;

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

  // Email + organic channel layer merged into whichever payload branch responds.
  const attachRuntimeLayers = async (
    p: CompetitorStrategyOverviewPayload,
  ): Promise<CompetitorStrategyOverviewPayload> => {
    try {
      const { channelSignals, journeyGoal } = await buildStrategyRuntimeLayers(
        supabase,
        user.id,
        meta.competitorId,
        p.map,
        meta.brandDomain ?? meta.cacheDomain ?? null,
      );
      return { ...p, channelSignals, journeyGoal };
    } catch (e) {
      console.warn("[compiled] runtime layers attach failed", e);
      return { ...p, channelSignals: null, journeyGoal: null };
    }
  };

  if (!force) {
    const cached = await getCachedStrategyOverview(supabase, user.id, meta.competitorId, domain);
    if (cached) {
      return NextResponse.json(
        {
          ok: true,
          cached: true,
          payload: await attachRuntimeLayers(normalizeCompetitorStrategyOverviewPayload(cached)),
        },
        {
          headers: {
            "Cache-Control": "private, max-age=300, stale-while-revalidate=3600",
          },
        }
      );
    }
  }

  const staleEarly = !force
    ? await getStaleStrategyOverviewPayload(supabase, user.id, meta.competitorId)
    : null;
  if (staleEarly) {
    const running = await isStrategyRecomputeRunning(supabase, meta.competitorId);
    return NextResponse.json(
      {
        ok: true,
        cached: true,
        recomputing: running,
        staleWhileRecomputing: running,
        payload: await attachRuntimeLayers(
          normalizeCompetitorStrategyOverviewPayload(staleEarly)
        ),
      },
      {
        headers: {
          "Cache-Control": "private, max-age=60, stale-while-revalidate=600",
        },
      }
    );
  }

  const hydrateResult = await tryHydrateScrapedAdsFromAdsCache(supabase, {
    userId: user.id,
    competitorId: meta.competitorId,
    domainHint: domain,
  });
  if (!hydrateResult.ok) {
    console.error("[compiled] hydrate_from_ads_cache", hydrateResult);
  }

  if (force) {
    const stale = await getStaleStrategyOverviewPayload(supabase, user.id, meta.competitorId);
    if (stale) {
      const running = await isStrategyRecomputeRunning(supabase, meta.competitorId);
      if (!running) {
        scheduleBackgroundRecompute({
          competitorDomain: domain,
          userId: user.id,
          competitorId: meta.competitorId,
          stealLock: true,
          refreshAdEnrichment: true,
        });
      }
      return NextResponse.json(
        {
          ok: true,
          cached: true,
          recomputing: true,
          payload: await attachRuntimeLayers(normalizeCompetitorStrategyOverviewPayload(stale)),
        },
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
    .select(SCRAPED_ADS_DERIVATION_SELECT)
    .eq("competitor_id", meta.competitorId)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1000);

  if (adsErr) {
    return NextResponse.json({ ok: false, error: adsErr.message }, { status: 500 });
  }

  const rows = adsRows ?? [];
  if (rows.length === 0) {
    const [stale, running] = await Promise.all([
      getStaleStrategyOverviewPayload(supabase, user.id, meta.competitorId),
      isStrategyRecomputeRunning(supabase, meta.competitorId),
    ]);
    const empty = buildNoAdsFoundPayload({
      name: meta.name,
      domain: meta.brandDomain ?? meta.cacheDomain,
      logoUrl: meta.logoUrl,
    });
    const outPayload = normalizeCompetitorStrategyOverviewPayload(stale ?? empty);

    if (!running) {
      scheduleBackgroundRecompute({
        competitorDomain: domain,
        userId: user.id,
        competitorId: meta.competitorId,
        stealLock: force,
        refreshAdEnrichment: force,
      });
    }

    return NextResponse.json(
      {
        ok: true,
        cached: Boolean(stale),
        recomputing: running || !stale,
        staleWhileRecomputing: running || !stale,
        payload: await attachRuntimeLayers(outPayload),
      },
      {
        headers: {
          "Cache-Control": "private, no-cache",
        },
      }
    );
  }

  console.log(
    `[compiled/fast-path] competitorId=${meta.competitorId} ads=${rows.length} → derive now, full recompute in background (force=${force})`
  );

  let quickPayload = await deriveAndPersistFastPathStrategyOverview({
    supabase,
    userId: user.id,
    competitorId: meta.competitorId,
    domainHint: domain,
    meta,
    adsRows: rows as ScrapedAdDerivationRow[],
  });

  const [scrapeIsNewer, running] = await Promise.all([
    scrapeIsNewerThanOverview(supabase, meta.competitorId),
    isStrategyRecomputeRunning(supabase, meta.competitorId),
  ]);

  if (!quickPayload) {
    const stale = await getStaleStrategyOverviewPayload(supabase, user.id, meta.competitorId);
    if (stale) {
      quickPayload = normalizeCompetitorStrategyOverviewPayload(stale);
    } else {
      const empty = buildNoAdsFoundPayload({
        name: meta.name,
        domain: meta.brandDomain ?? meta.cacheDomain,
        logoUrl: meta.logoUrl,
      });
      quickPayload = normalizeCompetitorStrategyOverviewPayload(empty);
    }
    if (!running) {
      scheduleBackgroundRecompute({
        competitorDomain: domain,
        userId: user.id,
        competitorId: meta.competitorId,
        stealLock: force,
        refreshAdEnrichment: force,
      });
    }
    return NextResponse.json(
      {
        ok: true,
        cached: Boolean(stale),
        recomputing: true,
        staleWhileRecomputing: true,
        payload: await attachRuntimeLayers(quickPayload),
      },
      {
        headers: {
          "Cache-Control": "private, no-cache",
        },
      }
    );
  }

  if (scrapeIsNewer && !running) {
    scheduleBackgroundRecompute({
      competitorDomain: domain,
      userId: user.id,
      competitorId: meta.competitorId,
      stealLock: false,
      refreshAdEnrichment: force,
    });
  }

  return NextResponse.json(
    {
      ok: true,
      cached: false,
      recomputing: running || scrapeIsNewer,
      staleWhileRecomputing: running || scrapeIsNewer,
      payload: await attachRuntimeLayers(quickPayload),
    },
    {
      headers: {
        "Cache-Control": "private, no-cache",
      },
    }
  );
}
