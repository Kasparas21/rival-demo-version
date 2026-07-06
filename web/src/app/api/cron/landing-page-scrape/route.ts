import { NextResponse } from "next/server";

import { authorizeCron, cronUnauthorizedResponse } from "@/lib/cron/authorize-cron";
import { scrapeDueLandingPages } from "@/lib/landing-page-tracker/scrape-due";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 300;

async function runLandingPageScrape(req: Request) {
  if (!authorizeCron(req)) {
    return cronUnauthorizedResponse();
  }

  const admin = createSupabaseAdminClient();
  const results = await scrapeDueLandingPages(admin);

  return NextResponse.json({
    ok: true,
    processed: results.length,
    results,
  });
}

export async function GET(req: Request) {
  return runLandingPageScrape(req);
}

export async function POST(req: Request) {
  return runLandingPageScrape(req);
}
