import { NextResponse } from "next/server";

import { isHostBlockedForCompetitor } from "@/lib/landing-pages/blocked-inheritance";
import { scrapePausedResponseBody } from "@/lib/billing/entitlements";
import { getUserScrapeEligibility } from "@/lib/billing/scrape-eligibility";
import { scrapeSingleLandingPage } from "@/lib/landing-page-tracker/scrape-single";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(
  req: Request,
  context: { params: Promise<{ competitor_id: string }> },
) {
  const { competitor_id: competitorIdRaw } = await context.params;
  const competitorId = competitorIdRaw?.trim() ?? "";

  if (!competitorId || !UUID_RE.test(competitorId)) {
    return NextResponse.json({ ok: false, error: "Invalid competitor_id" }, { status: 400 });
  }

  let pageId: string | undefined;
  try {
    const body = (await req.json()) as { pageId?: string };
    pageId = body.pageId?.trim() || undefined;
  } catch {
    // scrape all pages when body omitted
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { data: competitor } = await supabase
    .from("saved_competitors")
    .select("id")
    .eq("id", competitorId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!competitor) {
    return NextResponse.json({ ok: false, error: "Competitor not found" }, { status: 404 });
  }

  const scrapeEligibility = await getUserScrapeEligibility(supabase, user.id);
  if (!scrapeEligibility.allowed) {
    return NextResponse.json(
      scrapePausedResponseBody(scrapeEligibility.reason ?? "inactive_gate"),
      { status: 402 },
    );
  }

  let query = supabase
    .from("landing_pages")
    .select("*")
    .eq("competitor_id", competitorId)
    .eq("user_id", user.id)
    .eq("is_active", true);

  if (pageId) {
    if (!UUID_RE.test(pageId)) {
      return NextResponse.json({ ok: false, error: "Invalid pageId" }, { status: 400 });
    }
    query = query.eq("id", pageId);
  }

  const { data: pages, error: pagesError } = await query.limit(10);
  if (pagesError) {
    return NextResponse.json({ ok: false, error: pagesError.message }, { status: 500 });
  }
  if (!pages?.length) {
    return NextResponse.json({ ok: false, error: "No tracked pages found" }, { status: 404 });
  }

  const admin = createSupabaseAdminClient();
  const results: Array<{ pageId: string; url: string; ok: boolean; error?: string }> = [];

  for (const page of pages) {
    if (await isHostBlockedForCompetitor(supabase, competitorId, user.id, page.url)) {
      results.push({
        pageId: page.id,
        url: page.url,
        ok: false,
        error: "Site uses anti-bot protection",
      });
      continue;
    }
    const result = await scrapeSingleLandingPage(admin, page);
    results.push({
      pageId: page.id,
      url: page.url,
      ok: result.ok,
      error: result.error,
    });
  }

  const okCount = results.filter((r) => r.ok).length;
  const failures = results.filter((r) => !r.ok);
  const errorSummary =
    failures.length > 0
      ? failures
          .map((r) => r.error ?? "Could not capture this page.")
          .join(" · ")
      : undefined;

  return NextResponse.json({
    ok: okCount > 0,
    processed: results.length,
    succeeded: okCount,
    failed: failures.length,
    error: okCount > 0 ? undefined : errorSummary ?? "All captures failed",
    results,
  });
}
