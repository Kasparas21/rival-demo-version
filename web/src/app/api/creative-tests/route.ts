import { after } from "next/server";
import { NextResponse } from "next/server";

import {
  computeCreativeTestsForCompetitor,
  launchDateKeyForAd,
} from "@/lib/creative-tests/compute-creative-tests";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ScrapedAdRow = {
  id: string;
  platform: string;
  ad_creative_url: string | null;
  ad_text: string;
  ai_extracted_angle: string | null;
  first_seen_at: string;
  last_seen_at: string;
  format: string;
  ai_extracted_launch_date: string | null;
};

function hydrateCreativeTestAds(test: {
  launch_date: string;
  platform: string;
  ad_ids: string[] | null;
  ad_count: number;
}, adsById: Map<string, ScrapedAdRow>, allAds: ScrapedAdRow[]): ScrapedAdRow[] {
  const ids = test.ad_ids ?? [];
  const byStoredId = ids
    .map((adId) => adsById.get(adId))
    .filter((ad): ad is ScrapedAdRow => ad != null);

  if (byStoredId.length >= 2) return byStoredId;

  const byLaunchGroup = allAds.filter(
    (ad) => launchDateKeyForAd(ad) === test.launch_date && ad.platform === test.platform
  );

  if (byLaunchGroup.length >= 2) return byLaunchGroup;

  if (byStoredId.length > 0) return byStoredId;
  return byLaunchGroup;
}

function testsNeedRecompute(
  tests: { launch_date: string; platform: string; ad_ids: string[] | null; ad_count: number }[],
  adsById: Map<string, ScrapedAdRow>,
  allAds: ScrapedAdRow[]
): boolean {
  return tests.some((test) => {
    const hydrated = hydrateCreativeTestAds(test, adsById, allAds);
    const expected = Math.max(test.ad_count, (test.ad_ids ?? []).length);
    return expected >= 2 && hydrated.length < 2;
  });
}

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
  const userId = user.id;

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
    .eq("user_id", userId)
    .maybeSingle();

  if (compErr || !competitor) {
    return NextResponse.json({ ok: false, error: "competitor not found" }, { status: 404 });
  }

  async function loadTestsAndAds() {
    const [{ data: tests, error: testsErr }, { data: allAds, error: adsErr }] = await Promise.all([
      supabase
        .from("creative_tests")
        .select("*")
        .eq("competitor_id", competitorId)
        .order("launch_date", { ascending: false }),
      supabase
        .from("scraped_ads")
        .select(
          "id, platform, ad_creative_url, ad_text, ai_extracted_angle, first_seen_at, last_seen_at, format, ai_extracted_launch_date"
        )
        .eq("user_id", userId)
        .eq("competitor_id", competitorId)
        .eq("is_active", true)
        .limit(1500),
    ]);

    if (testsErr) return { error: testsErr.message as string };
    if (adsErr) return { error: adsErr.message as string };

    const adsById = new Map<string, ScrapedAdRow>();
    for (const ad of allAds ?? []) {
      adsById.set(ad.id, ad as ScrapedAdRow);
    }

    return { tests: tests ?? [], allAds: (allAds ?? []) as ScrapedAdRow[], adsById };
  }

  if (force) {
    const recomputeResult = await computeCreativeTestsForCompetitor({
      supabase,
      userId,
      competitorId,
    });
    if (!recomputeResult.ok) {
      return NextResponse.json({ ok: false, error: recomputeResult.error }, { status: 500 });
    }
  }

  let loaded = await loadTestsAndAds();
  if ("error" in loaded) {
    return NextResponse.json({ ok: false, error: loaded.error }, { status: 500 });
  }

  let { tests, allAds, adsById } = loaded;

  if (!force && tests.length > 0 && testsNeedRecompute(tests, adsById, allAds)) {
    after(async () => {
      try {
        await computeCreativeTestsForCompetitor({ supabase, userId, competitorId });
      } catch (e) {
        console.warn("[creative-tests] background recompute failed", e);
      }
    });
  }

  const hydratedTests = tests.map((test) => {
    const ads = hydrateCreativeTestAds(test, adsById, allAds);
    return {
      ...test,
      ads,
      ad_count: ads.length > 0 ? ads.length : test.ad_count,
    };
  });

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
