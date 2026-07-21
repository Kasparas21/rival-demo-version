import { NextResponse } from "next/server";

import { computePlatformVelocitiesFromScrapedRows } from "@/lib/competitor/ad-library-velocity";
import { getRequestWorkspace } from "@/lib/team/session-workspace";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Response = {
  ok: boolean;
  error?: string;
  velocities?: ReturnType<typeof computePlatformVelocitiesFromScrapedRows>;
};

export async function GET(request: Request): Promise<NextResponse<Response>> {
  const workspace = await getRequestWorkspace();
  if (!workspace) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const { supabase, user, ctx, dataUserId } = workspace;
  const { searchParams } = new URL(request.url);
  const competitorId = searchParams.get("competitorId");
  if (!competitorId) {
    return NextResponse.json({ ok: false, error: "missing competitorId" }, { status: 400 });
  }

  const { data: competitor, error: compErr } = await supabase
    .from("saved_competitors")
    .select("id, last_scraped_at")
    .eq("id", competitorId)
    .eq("user_id", dataUserId)
    .single();

  if (compErr || !competitor) {
    return NextResponse.json({ ok: false, error: "competitor not found" }, { status: 404 });
  }

  const { data: ads, error: adsErr } = await supabase
    .from("scraped_ads")
    .select("platform, first_seen_at, last_seen_at")
    .eq("user_id", dataUserId)
    .eq("competitor_id", competitorId);

  if (adsErr) {
    return NextResponse.json({ ok: false, error: adsErr.message }, { status: 500 });
  }

  const lastScrapedMs = competitor.last_scraped_at
    ? new Date(competitor.last_scraped_at).getTime()
    : Date.now();

  const velocities = computePlatformVelocitiesFromScrapedRows(ads ?? [], lastScrapedMs);

  return NextResponse.json({ ok: true, velocities });
}
