import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { authorizeCron, cronUnauthorizedResponse } from "@/lib/cron/authorize-cron";
import { userAllowsScheduledScrape } from "@/lib/billing/scrape-eligibility";
import { enrichAllPendingScrapedAdsForCompetitor } from "@/lib/strategy-overview/adEnrichment";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Daily safety net for ads that failed enrichment during post-scrape recompute. Bearer CRON_SECRET. */
async function runEnrichPending(req: Request) {
  if (!authorizeCron(req)) {
    return cronUnauthorizedResponse();
  }

  const admin = createSupabaseAdminClient();

  const PENDING_FILTER = "ai_enrichment_status.is.null,ai_enrichment_status.eq.pending,ai_enrichment_status.eq.failed";

  /** LLM spend: only accounts with scheduled jobs switched on (see `userAllowsScheduledScrape`). */
  const { data: ownerRows, error: ownerErr } = await admin
    .from("scraped_ads")
    .select("user_id")
    .eq("is_active", true)
    .or(PENDING_FILTER)
    .limit(5000);
  if (ownerErr) {
    return Response.json({ ok: false, error: ownerErr.message }, { status: 500 });
  }
  const owners = [...new Set((ownerRows ?? []).map((row) => row.user_id))];
  const allowedOwners = (
    await Promise.all(owners.map(async (userId) => ((await userAllowsScheduledScrape(admin, userId)) ? userId : null)))
  ).filter((userId): userId is string => userId !== null);
  if (allowedOwners.length === 0) {
    return Response.json({ ok: true, processed: 0, message: "no pending enrichment for accounts with scheduled jobs on" });
  }

  const { data: seedRows, error: seedErr } = await admin
    .from("scraped_ads")
    .select("user_id, competitor_id")
    .eq("is_active", true)
    .or(PENDING_FILTER)
    .in("user_id", allowedOwners)
    .limit(200);

  if (seedErr) {
    return Response.json({ ok: false, error: seedErr.message }, { status: 500 });
  }

  if (!seedRows?.length) {
    return Response.json({ ok: true, processed: 0, message: "no pending enrichment" });
  }

  const seen = new Set<string>();
  const pairs: { userId: string; competitorId: string }[] = [];
  for (const row of seedRows) {
    const key = `${row.user_id}:${row.competitor_id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    pairs.push({ userId: row.user_id, competitorId: row.competitor_id });
  }

  let competitorsProcessed = 0;
  let adsEnriched = 0;

  for (const { userId, competitorId } of pairs) {
    const stats = await enrichAllPendingScrapedAdsForCompetitor(admin, userId, competitorId);
    competitorsProcessed += 1;
    adsEnriched += stats.enriched;
    if (stats.needsEnrichment > stats.enriched + stats.skippedNoText) {
      console.warn(
        "[cron/enrich-pending] partial enrichment",
        competitorId,
        "enriched=",
        stats.enriched,
        "stillPending~",
        stats.needsEnrichment - stats.enriched,
      );
    }
  }

  const summary = {
    ok: true,
    competitorsProcessed,
    adsEnriched,
    competitorsWithPending: pairs.length,
  };
  console.info("[cron/enrich-pending]", summary);
  return Response.json(summary);
}

export async function GET(req: Request) {
  return runEnrichPending(req);
}

export async function POST(req: Request) {
  return runEnrichPending(req);
}
