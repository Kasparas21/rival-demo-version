import { NextResponse } from "next/server";

import { userAllowsFreshScrape } from "@/lib/billing/scrape-eligibility";
import { authorizeCron, cronUnauthorizedResponse } from "@/lib/cron/authorize-cron";
import { chainCronInvocation } from "@/lib/cron/chain-cron";
import { fetchOrganicScrapeCandidates, scrapeOrganicCompetitor } from "@/lib/organic-content/scrape-competitor";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Stop starting new competitors before the serverless hard kill. */
const ORGANIC_CRON_TIME_BUDGET_MS = 285 * 1000;
const ORGANIC_CRON_BATCH_SIZE = 20;

async function runOrganicScrape(req: Request) {
  if (!authorizeCron(req)) {
    return cronUnauthorizedResponse();
  }

  const admin = createSupabaseAdminClient();
  const cronStartedAt = Date.now();
  const candidates = await fetchOrganicScrapeCandidates(admin, ORGANIC_CRON_BATCH_SIZE);

  const results: Array<{
    competitorId: string;
    userId: string;
    ok: boolean;
    postsUpserted: number;
    platformErrors: Record<string, string>;
  }> = [];

  let timeBoxed = 0;

  for (const competitor of candidates) {
    if (Date.now() - cronStartedAt >= ORGANIC_CRON_TIME_BUDGET_MS) {
      timeBoxed += 1;
      break;
    }

    if (!(await userAllowsFreshScrape(admin, competitor.user_id))) {
      continue;
    }

    try {
      const result = await scrapeOrganicCompetitor(admin, competitor);
      results.push({
        competitorId: competitor.id,
        userId: competitor.user_id,
        ok: result.ok,
        postsUpserted: result.postsUpserted,
        platformErrors: result.platformErrors,
      });
    } catch (error) {
      results.push({
        competitorId: competitor.id,
        userId: competitor.user_id,
        ok: false,
        postsUpserted: 0,
        platformErrors: {
          _scrape: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }

  const userIds = [...new Set(results.map((r) => r.userId))];
  try {
    const { runCrossCompetitorCheck } = await import("@/lib/agent/run-agent");
    for (const userId of userIds) {
      await runCrossCompetitorCheck(admin, userId);
    }
  } catch (err) {
    console.error("[cron/organic-scrape] cross-competitor check failed", err);
  }

  const remainingCandidates = Math.max(0, candidates.length - results.length);
  const summary = {
    ok: true,
    processed: results.length,
    remainingCandidates,
    timeBoxed,
    batchSize: ORGANIC_CRON_BATCH_SIZE,
    results,
  };
  console.info("[cron/organic-scrape]", {
    processed: summary.processed,
    remainingCandidates,
    timeBoxed,
  });

  if (remainingCandidates > 0 || timeBoxed > 0) {
    chainCronInvocation(req, "/api/cron/organic-scrape");
  }

  return NextResponse.json(summary);
}

export async function GET(req: Request) {
  return runOrganicScrape(req);
}

export async function POST(req: Request) {
  return runOrganicScrape(req);
}
