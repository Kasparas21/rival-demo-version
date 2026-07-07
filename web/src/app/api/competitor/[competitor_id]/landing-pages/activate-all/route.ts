import { NextResponse } from "next/server";

import {
  buildBlockedHostsIndex,
  HOST_BLOCKED_MESSAGE,
  hostKeyFromUrl,
  loadSnapshotMapForCompetitor,
} from "@/lib/landing-pages/blocked-inheritance";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(
  _req: Request,
  context: { params: Promise<{ competitor_id: string }> },
) {
  const { competitor_id: competitorIdRaw } = await context.params;
  const competitorId = competitorIdRaw?.trim() ?? "";

  if (!competitorId || !UUID_RE.test(competitorId)) {
    return NextResponse.json({ ok: false, error: "Invalid competitor_id" }, { status: 400 });
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

  const { data: candidates } = await supabase
    .from("landing_pages")
    .select("id, url")
    .eq("competitor_id", competitorId)
    .eq("user_id", user.id)
    .eq("auto_detected_from", "ads")
    .eq("is_active", false);

  if (!candidates?.length) {
    return NextResponse.json({ ok: true, activated: 0 });
  }

  const snapshotByGroupKey = await loadSnapshotMapForCompetitor(supabase, competitorId, user.id);
  const blockedHosts = buildBlockedHostsIndex(snapshotByGroupKey);

  const eligibleIds = candidates
    .filter((page) => {
      const hostKey = hostKeyFromUrl(page.url);
      return !hostKey || !blockedHosts.has(hostKey);
    })
    .map((page) => page.id);

  if (!eligibleIds.length) {
    return NextResponse.json(
      { ok: false, error: HOST_BLOCKED_MESSAGE, activated: 0 },
      { status: 403 },
    );
  }

  const now = new Date().toISOString();
  const { data: activated, error: updateError } = await supabase
    .from("landing_pages")
    .update({
      is_active: true,
      next_screenshot_at: now,
    })
    .in("id", eligibleIds)
    .eq("competitor_id", competitorId)
    .eq("user_id", user.id)
    .select("id");

  if (updateError) {
    return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 });
  }

  const activatedCount = activated?.length ?? 0;

  return NextResponse.json({
    ok: true,
    activated: activatedCount,
    skippedBlocked: candidates.length - eligibleIds.length,
  });
}
