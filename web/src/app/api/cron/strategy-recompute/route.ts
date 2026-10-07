import { authorizeCron, cronUnauthorizedResponse } from "@/lib/cron/authorize-cron";
import { chainCronInvocation } from "@/lib/cron/chain-cron";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { recomputeStrategyOverviewForCompetitor } from "@/lib/strategy-overview/recompute-strategy-overview";
import { loadStaleStrategyMaps } from "@/lib/strategy-overview/stale-strategy-maps";

/**
 * Rebuilds every strategy map that is older than its latest scrape. Not on a schedule: with few people
 * looking at maps it would pay to classify and infer audiences nobody reads. Maps rebuild when opened
 * (compiled route, comparison page); call this by hand with the cron secret to catch everything up, or add
 * it to vercel.json crons once there are active users.
 */
export const runtime = "nodejs";
export const maxDuration = 300;

/** Stop starting new rebuilds after this; one rebuild (classifying a week of new ads + audience) fits in the rest. */
const START_BUDGET_MS = 200 * 1000;
/** Follow-up runs per day; a competitor that keeps failing stays stale, so it must not chain forever. */
const MAX_ROUNDS = 12;

async function run(req: Request) {
  if (!authorizeCron(req)) return cronUnauthorizedResponse();

  const startedAt = Date.now();
  const admin = createSupabaseAdminClient();
  const url = new URL(req.url);
  const onlyCompetitorId = url.searchParams.get("competitorId")?.trim() || null;
  const round = Math.max(0, Number.parseInt(url.searchParams.get("round") ?? "0", 10) || 0);

  let candidates = await loadStaleStrategyMaps(admin);
  if (onlyCompetitorId) candidates = candidates.filter((c) => c.competitorId === onlyCompetitorId);

  let rebuilt = 0;
  let failed = 0;
  let busy = 0;
  let attempted = 0;
  const errors: string[] = [];

  for (const c of candidates) {
    if (Date.now() - startedAt >= START_BUDGET_MS) break;
    attempted += 1;
    const r = await recomputeStrategyOverviewForCompetitor({
      supabase: admin,
      userId: c.userId,
      competitorId: c.competitorId,
      domainHint: c.domain,
    });
    if (r.ok) rebuilt += 1;
    else if (r.error.includes("in progress")) busy += 1;
    else {
      failed += 1;
      errors.push(`${c.domain}: ${r.error}`);
    }
  }

  // Busy ones are rebuilding elsewhere; failed ones would fail again in a loop.
  const remaining = candidates.length - attempted;
  const summary = { ok: true, round, candidates: candidates.length, rebuilt, failed, busy, remaining, errors: errors.slice(0, 10) };
  console.info("[cron/strategy-recompute]", summary);

  if (!onlyCompetitorId && remaining > 0 && rebuilt > 0 && round + 1 < MAX_ROUNDS) {
    await chainCronInvocation(req, "/api/cron/strategy-recompute", { searchParams: { round: String(round + 1) } });
  }

  return Response.json(summary);
}

export async function GET(req: Request) {
  return run(req);
}

export async function POST(req: Request) {
  return run(req);
}
