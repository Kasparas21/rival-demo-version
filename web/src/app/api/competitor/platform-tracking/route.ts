import { NextResponse } from "next/server";
import { resolveCompetitorForUser } from "@/lib/ad-library/classify-competitor-platforms";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(req: Request): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const competitorId = url.searchParams.get("competitorId") ?? undefined;
  const domain = url.searchParams.get("domain") ?? undefined;

  const competitor = await resolveCompetitorForUser(supabase, user.id, {
    competitorId,
    domain,
  });

  if (!competitor) {
    return NextResponse.json({ ok: false, error: "Competitor not found" }, { status: 404 });
  }

  const { data: competitorRow } = await supabase
    .from("saved_competitors")
    .select("platform_high_coverage_applied")
    .eq("id", competitor.id)
    .maybeSingle();

  const { data: rows, error } = await supabase
    .from("competitor_platform_tracking")
    .select(
      "platform, classification, active_ad_count, high_coverage_demoted, classified_at, next_scrape_at"
    )
    .eq("competitor_id", competitor.id)
    .order("platform");

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    competitorId: competitor.id,
    highCoverageApplied: competitorRow?.platform_high_coverage_applied ?? false,
    platforms: (rows ?? []).map((r) => ({
      platform: r.platform,
      classification: r.classification,
      activeAdCount: r.active_ad_count,
      highCoverageDemoted: r.high_coverage_demoted,
      classifiedAt: r.classified_at,
      nextScrapeAt: r.next_scrape_at,
    })),
  });
}
