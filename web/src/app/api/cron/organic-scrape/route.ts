import { NextResponse } from "next/server";

import { authorizeCron, cronUnauthorizedResponse } from "@/lib/cron/authorize-cron";
import { fetchOrganicScrapeCandidates, scrapeOrganicCompetitor } from "@/lib/organic-content/scrape-competitor";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 300;

async function runOrganicScrape(req: Request) {
  if (!authorizeCron(req)) {
    return cronUnauthorizedResponse();
  }

  const admin = createSupabaseAdminClient();
  const candidates = await fetchOrganicScrapeCandidates(admin, 10);

  const results: Array<{
    competitorId: string;
    ok: boolean;
    postsUpserted: number;
    platformErrors: Record<string, string>;
  }> = [];

  for (const competitor of candidates) {
    try {
      const result = await scrapeOrganicCompetitor(admin, competitor);
      results.push({
        competitorId: competitor.id,
        ok: result.ok,
        postsUpserted: result.postsUpserted,
        platformErrors: result.platformErrors,
      });
    } catch (error) {
      results.push({
        competitorId: competitor.id,
        ok: false,
        postsUpserted: 0,
        platformErrors: {
          _scrape: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }

  return NextResponse.json({
    ok: true,
    processed: results.length,
    results,
  });
}

export async function GET(req: Request) {
  return runOrganicScrape(req);
}

export async function POST(req: Request) {
  return runOrganicScrape(req);
}
