import { userAllowsScheduledAdsScrape } from "@/lib/billing/scrape-eligibility";
import { authorizeCron, cronUnauthorizedResponse } from "@/lib/cron/authorize-cron";
import { chainCronInvocation } from "@/lib/cron/chain-cron";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { recomputeStrategyOverviewForCompetitor } from "@/lib/strategy-overview/recompute-strategy-overview";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Stop starting new rebuilds after this; one rebuild (classifying a week of new ads + audience) fits in the rest. */
const START_BUDGET_MS = 200 * 1000;
const MAX_CANDIDATES = 500;
/** Follow-up runs per day; a competitor that keeps failing stays stale, so it must not chain forever. */
const MAX_ROUNDS = 12;

function cleanDomain(d: string): string {
  return d.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] || d;
}

type Candidate = { userId: string; competitorId: string; domain: string; lastScrapedAt: string };

/**
 * Strategy maps older than their competitor's latest scrape, oldest first. The weekly scrape used to start
 * these rebuilds from `after()` once its own 285s loop had finished, without waiting for them: 39 of 49 maps
 * were behind their scrape (median 40 days) and 30 rebuild locks had died mid-classification.
 */
export async function loadStaleMaps(admin: ReturnType<typeof createSupabaseAdminClient>): Promise<Candidate[]> {
  const { data: competitors } = await admin
    .from("saved_competitors")
    .select("id, user_id, brand_domain, slug, last_scraped_at")
    .not("last_scraped_at", "is", null)
    .order("last_scraped_at", { ascending: true })
    .limit(MAX_CANDIDATES);
  if (!competitors?.length) return [];

  const { data: maps } = await admin
    .from("competitor_strategy_overview")
    .select("competitor_id, computed_at")
    .in(
      "competitor_id",
      competitors.map((c) => c.id),
    );
  const computedAt = new Map((maps ?? []).map((m) => [m.competitor_id, Date.parse(m.computed_at ?? "")]));

  const stale = competitors.filter((c) => {
    const scraped = Date.parse(c.last_scraped_at ?? "");
    const built = computedAt.get(c.id);
    return Number.isFinite(scraped) && (built == null || !Number.isFinite(built) || built < scraped);
  });

  const allowed = new Map<string, boolean>();
  const out: Candidate[] = [];
  for (const c of stale) {
    if (!allowed.has(c.user_id)) allowed.set(c.user_id, await userAllowsScheduledAdsScrape(admin, c.user_id));
    if (!allowed.get(c.user_id)) continue;
    const domain = cleanDomain(c.brand_domain || c.slug || "").toLowerCase();
    if (!domain) continue;
    out.push({ userId: c.user_id, competitorId: c.id, domain, lastScrapedAt: c.last_scraped_at! });
  }
  return out;
}

async function run(req: Request) {
  if (!authorizeCron(req)) return cronUnauthorizedResponse();

  const startedAt = Date.now();
  const admin = createSupabaseAdminClient();
  const url = new URL(req.url);
  const onlyCompetitorId = url.searchParams.get("competitorId")?.trim() || null;
  const round = Math.max(0, Number.parseInt(url.searchParams.get("round") ?? "0", 10) || 0);

  let candidates = await loadStaleMaps(admin);
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
