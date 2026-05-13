import { NextResponse } from "next/server";

import { computeCreativeTestsForCompetitor } from "@/lib/creative-tests/compute-creative-tests";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const competitorId = (searchParams.get("competitorId") ?? "").trim();
  const force = searchParams.get("force") === "1";

  if (!competitorId) {
    return NextResponse.json({ ok: false, error: "missing competitorId" }, { status: 400 });
  }

  const { data: competitor, error: compErr } = await supabase
    .from("saved_competitors")
    .select("id, brand_name, brand_domain, name")
    .eq("id", competitorId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (compErr || !competitor) {
    return NextResponse.json({ ok: false, error: "competitor not found" }, { status: 404 });
  }

  if (force) {
    const recomputeResult = await computeCreativeTestsForCompetitor({
      supabase,
      userId: user.id,
      competitorId,
    });
    if (!recomputeResult.ok) {
      return NextResponse.json({ ok: false, error: recomputeResult.error }, { status: 500 });
    }
  }

  const { data: tests, error: testsErr } = await supabase
    .from("creative_tests")
    .select("*")
    .eq("competitor_id", competitorId)
    .order("launch_date", { ascending: false });

  if (testsErr) {
    return NextResponse.json({ ok: false, error: testsErr.message }, { status: 500 });
  }

  const allAdIds = [...new Set((tests ?? []).flatMap((t) => t.ad_ids ?? []))];
  const adsById = new Map<
    string,
    {
      id: string;
      platform: string;
      ad_creative_url: string | null;
      ad_text: string;
      ai_extracted_angle: string | null;
      first_seen_at: string;
      last_seen_at: string;
      format: string;
    }
  >();

  if (allAdIds.length > 0) {
    const { data: ads } = await supabase
      .from("scraped_ads")
      .select("id, platform, ad_creative_url, ad_text, ai_extracted_angle, first_seen_at, last_seen_at, format")
      .eq("user_id", user.id)
      .in("id", allAdIds);

    for (const ad of ads ?? []) {
      adsById.set(ad.id, ad);
    }
  }

  const hydratedTests = (tests ?? []).map((test) => ({
    ...test,
    ads: (test.ad_ids ?? []).map((adId) => adsById.get(adId)).filter(Boolean),
  }));

  const summary = {
    total: hydratedTests.length,
    winnerIdentified: hydratedTests.filter((t) => t.test_status === "winner_identified").length,
    running: hydratedTests.filter((t) => t.test_status === "running").length,
    allKilledFast: hydratedTests.filter((t) => t.test_status === "all_killed_fast").length,
    noClearWinner: hydratedTests.filter((t) => t.test_status === "no_clear_winner").length,
  };

  const displayName = competitor.brand_name?.trim() || competitor.name?.trim() || "Competitor";

  return NextResponse.json({
    ok: true,
    competitor: {
      id: competitor.id,
      name: displayName,
      domain: competitor.brand_domain,
    },
    tests: hydratedTests,
    summary,
  });
}
