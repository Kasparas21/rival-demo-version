import { NextResponse } from "next/server";

import { ensureDefaultLandingPagesForCompetitor } from "@/lib/landing-page-tracker/create-defaults";
import { syncLandingPagesFromCompetitorAds } from "@/lib/landing-page-tracker/sync-landing-pages-from-ads";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function authorizeCompetitor(competitorId: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 }) };

  const { data: competitor } = await supabase
    .from("saved_competitors")
    .select("id")
    .eq("id", competitorId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!competitor) {
    return { error: NextResponse.json({ ok: false, error: "Competitor not found" }, { status: 404 }) };
  }

  return { supabase, user };
}

type LatestSnapshot = {
  id: string;
  screenshot_url: string;
  hero_screenshot_url: string | null;
  page_text: Json;
  pixel_diff_pct: number | null;
  has_meaningful_change: boolean;
  change_analysis: Json;
  taken_at: string;
  status: string;
};

export async function GET(
  _req: Request,
  context: { params: Promise<{ competitor_id: string }> },
) {
  const { competitor_id: competitorIdRaw } = await context.params;
  const competitorId = competitorIdRaw?.trim() ?? "";
  if (!competitorId || !UUID_RE.test(competitorId)) {
    return NextResponse.json({ ok: false, error: "Invalid competitor_id" }, { status: 400 });
  }

  const auth = await authorizeCompetitor(competitorId);
  if ("error" in auth && auth.error) return auth.error;
  const { supabase, user } = auth as { supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>; user: { id: string } };

  const admin = createSupabaseAdminClient();
  await ensureDefaultLandingPagesForCompetitor(admin, competitorId, user.id);

  const { data: competitorRow } = await admin
    .from("saved_competitors")
    .select("brand_domain, slug")
    .eq("id", competitorId)
    .eq("user_id", user.id)
    .maybeSingle();
  const website = competitorRow?.brand_domain?.trim() || competitorRow?.slug?.trim();
  if (website) {
    await syncLandingPagesFromCompetitorAds(admin, competitorId, user.id, website);
  }

  const { data: pages, error: pagesError } = await supabase
    .from("landing_pages")
    .select("*")
    .eq("competitor_id", competitorId)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("added_at", { ascending: true });

  if (pagesError) {
    return NextResponse.json({ ok: false, error: pagesError.message }, { status: 500 });
  }

  const pageIds = (pages ?? []).map((p) => p.id);
  const latestByPage = new Map<string, LatestSnapshot>();

  if (pageIds.length > 0) {
    const { data: snapshots } = await supabase
      .from("landing_page_snapshots")
      .select(
        "id, landing_page_id, screenshot_url, hero_screenshot_url, page_text, pixel_diff_pct, has_meaningful_change, change_analysis, taken_at, status",
      )
      .in("landing_page_id", pageIds)
      .order("taken_at", { ascending: false });

    for (const snap of snapshots ?? []) {
      if (!latestByPage.has(snap.landing_page_id)) {
        latestByPage.set(snap.landing_page_id, snap);
      }
    }
  }

  const trackedPages = (pages ?? []).map((page) => ({
    ...page,
    latestSnapshot: latestByPage.get(page.id) ?? null,
  }));

  return NextResponse.json({ ok: true, pages: trackedPages });
}

export async function POST(
  _req: Request,
  context: { params: Promise<{ competitor_id: string }> },
) {
  const { competitor_id: competitorIdRaw } = await context.params;
  const competitorId = competitorIdRaw?.trim() ?? "";
  if (!competitorId || !UUID_RE.test(competitorId)) {
    return NextResponse.json({ ok: false, error: "Invalid competitor_id" }, { status: 400 });
  }

  const auth = await authorizeCompetitor(competitorId);
  if ("error" in auth && auth.error) return auth.error;

  return NextResponse.json(
    { ok: false, error: "Manual URL entry is disabled. Pages are added automatically from ads and the homepage." },
    { status: 403 },
  );
}
