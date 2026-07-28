import { NextResponse } from "next/server";

import { userAllowsScheduledAdsScrape } from "@/lib/billing/scrape-eligibility";
import { authorizeCron, cronUnauthorizedResponse } from "@/lib/cron/authorize-cron";
import { chainCronInvocation } from "@/lib/cron/chain-cron";
import { generatePatternReport } from "@/lib/discovery/generate-pattern-report";
import { loadPatternReportCandidates } from "@/lib/discovery/load-pattern-report-candidates";
import { resolvePatternWeekStartYmd } from "@/lib/discovery/compute-pattern-metrics";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 300;

const CRON_TIME_BUDGET_MS = 285 * 1000;

type RunSummary = {
  ok: boolean;
  week_start: string;
  processed: number;
  skipped: number;
  generated: number;
  failed: number;
  remaining: number;
  chained: boolean;
  errors: string[];
};

export async function POST(req: Request) {
  if (!authorizeCron(req)) {
    return cronUnauthorizedResponse();
  }

  const url = new URL(req.url);
  const force = url.searchParams.get("force") === "1" || url.searchParams.get("force") === "true";
  const filterBrandId = (url.searchParams.get("brandId") ?? "").trim();
  const filterUserId = (url.searchParams.get("userId") ?? "").trim();
  const offset = Math.max(0, Number.parseInt(url.searchParams.get("offset") ?? "0", 10) || 0);

  const admin = createSupabaseAdminClient();
  const startedAt = Date.now();
  const weekStart = resolvePatternWeekStartYmd();

  let candidates = await loadPatternReportCandidates(admin);
  if (filterUserId) candidates = candidates.filter((c) => c.user_id === filterUserId);
  if (filterBrandId) candidates = candidates.filter((c) => c.brand_id === filterBrandId);

  const summary: RunSummary = {
    ok: true,
    week_start: weekStart,
    processed: 0,
    skipped: 0,
    generated: 0,
    failed: 0,
    remaining: Math.max(0, candidates.length - offset),
    chained: false,
    errors: [],
  };

  for (let i = offset; i < candidates.length; i++) {
    if (Date.now() - startedAt >= CRON_TIME_BUDGET_MS) {
      const remaining = candidates.length - i;
      if (remaining > 0) {
        summary.chained = true;
        chainCronInvocation(req, "/api/cron/discovery-patterns", {
          searchParams: {
            offset: String(i),
            ...(force ? { force: "1" } : {}),
            ...(filterBrandId ? { brandId: filterBrandId } : {}),
            ...(filterUserId ? { userId: filterUserId } : {}),
          },
        });
      }
      summary.remaining = remaining;
      break;
    }

    const candidate = candidates[i]!;
    summary.processed += 1;

    const allowed = await userAllowsScheduledAdsScrape(admin, candidate.user_id);
    if (!allowed) {
      summary.skipped += 1;
      continue;
    }

    const result = await generatePatternReport({
      supabase: admin,
      userId: candidate.user_id,
      brandId: candidate.brand_id,
      brandName: candidate.brand_name,
      force,
    });

    if (!result.ok) {
      summary.failed += 1;
      summary.errors.push(`${candidate.user_id}/${candidate.brand_id}: ${result.error}`);
      continue;
    }

    if (result.skipped) summary.skipped += 1;
    else if (result.report.status === "failed") summary.failed += 1;
    else summary.generated += 1;
  }

  summary.remaining = Math.max(0, candidates.length - offset - summary.processed);
  return NextResponse.json(summary);
}

export async function GET(req: Request) {
  return POST(req);
}
