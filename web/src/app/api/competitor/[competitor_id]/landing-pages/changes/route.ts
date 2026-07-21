import { NextResponse } from "next/server";

import { getRequestWorkspace } from "@/lib/team/session-workspace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseLimit(raw: string | null): number {
  const n = raw ? Number.parseInt(raw, 10) : 20;
  if (!Number.isFinite(n) || n < 1) return 20;
  return Math.min(n, 50);
}

export async function GET(
  req: Request,
  context: { params: Promise<{ competitor_id: string }> },
) {
  const { competitor_id: competitorIdRaw } = await context.params;
  const competitorId = competitorIdRaw?.trim() ?? "";
  const limit = parseLimit(new URL(req.url).searchParams.get("limit"));

  if (!competitorId || !UUID_RE.test(competitorId)) {
    return NextResponse.json({ ok: false, error: "Invalid competitor_id" }, { status: 400 });
  }

    const workspace = await getRequestWorkspace();
  if (!workspace) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { supabase, user, ctx, dataUserId } = workspace;

  const { data: competitor } = await supabase
    .from("saved_competitors")
    .select("id")
    .eq("id", competitorId)
    .eq("user_id", dataUserId)
    .maybeSingle();

  if (!competitor) {
    return NextResponse.json({ ok: false, error: "Competitor not found" }, { status: 404 });
  }

  const { data: snapshots, error } = await supabase
    .from("landing_page_snapshots")
    .select("*, landing_pages(id, label, url, page_type)")
    .eq("competitor_id", competitorId)
    .eq("user_id", dataUserId)
    .eq("has_meaningful_change", true)
    .order("taken_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const enriched = [];
  for (const snap of snapshots ?? []) {
    const { data: prev } = await supabase
      .from("landing_page_snapshots")
      .select("screenshot_url, hero_screenshot_url, page_text, taken_at")
      .eq("landing_page_id", snap.landing_page_id)
      .eq("user_id", dataUserId)
      .lt("taken_at", snap.taken_at)
      .order("taken_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    enriched.push({
      ...snap,
      prev_screenshot_url: prev?.screenshot_url ?? null,
      prev_hero_screenshot_url: prev?.hero_screenshot_url ?? null,
      prev_page_text: prev?.page_text ?? null,
      prev_taken_at: prev?.taken_at ?? null,
    });
  }

  return NextResponse.json({ ok: true, changes: enriched });
}
