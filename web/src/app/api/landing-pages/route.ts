import { NextResponse } from "next/server";

import { groupLandingPagesFromAds, type LandingPageAdRow } from "@/lib/landing-pages/group-landing-pages";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parseLimit(raw: string | null, fallback: number, max: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(Math.floor(n), max);
}

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
  const competitorId = searchParams.get("competitorId");
  const limit = parseLimit(searchParams.get("limit"), 100, 500);

  if (!competitorId) {
    return NextResponse.json({ ok: false, error: "missing competitorId" }, { status: 400 });
  }

  const { data: competitor, error: compErr } = await supabase
    .from("saved_competitors")
    .select("id, brand_name, name, last_scraped_at")
    .eq("id", competitorId)
    .eq("user_id", user.id)
    .single();

  if (compErr || !competitor) {
    return NextResponse.json({ ok: false, error: "competitor not found" }, { status: 404 });
  }

  const { data: ads, error: adsErr } = await supabase
    .from("scraped_ads")
    .select(
      "id, platform, ad_creative_url, ad_text, ai_extracted_angle, first_seen_at, last_seen_at, is_active, raw_payload",
    )
    .eq("user_id", user.id)
    .eq("competitor_id", competitorId)
    .eq("is_active", true)
    .order("last_seen_at", { ascending: false })
    .limit(2000);

  if (adsErr) {
    return NextResponse.json({ ok: false, error: adsErr.message }, { status: 500 });
  }

  const grouped = groupLandingPagesFromAds(
    (ads ?? []) as LandingPageAdRow[],
    competitor.last_scraped_at,
  );
  const landingPages = grouped.groups.slice(0, limit);

  const displayName = competitor.brand_name?.trim() || competitor.name?.trim() || "Competitor";

  return NextResponse.json({
    ok: true,
    competitor: {
      id: competitor.id,
      name: displayName,
      lastScrapedAt: competitor.last_scraped_at,
    },
    landingPages,
    summary: {
      totalUniqueUrls: grouped.groups.length,
      totalAdsWithLp: grouped.groups.reduce((sum, g) => sum + g.totalAds, 0),
      adsWithoutLp: grouped.adsWithoutLp,
      platformCounts: grouped.platformCounts,
    },
  });
}
