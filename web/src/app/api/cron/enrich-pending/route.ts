import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { enrichAllPendingScrapedAdsForCompetitor } from "@/lib/strategy-overview/adEnrichment";

export const runtime = "nodejs";
export const maxDuration = 300;

/** POST — daily safety net for ads that failed enrichment during post-scrape recompute. Bearer CRON_SECRET. */
export async function POST(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const admin = createSupabaseAdminClient();

  const { data: seedRows, error: seedErr } = await admin
    .from("scraped_ads")
    .select("user_id, competitor_id")
    .eq("is_active", true)
    .or("ai_enrichment_status.is.null,ai_enrichment_status.eq.pending,ai_enrichment_status.eq.failed")
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

  return Response.json({
    ok: true,
    competitorsProcessed,
    adsEnriched,
    competitorsWithPending: pairs.length,
  });
}
