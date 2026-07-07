import { NextResponse } from "next/server";

import { HOST_BLOCKED_MESSAGE, isHostBlockedForCompetitor } from "@/lib/landing-pages/blocked-inheritance";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(
  _req: Request,
  context: { params: Promise<{ competitor_id: string; pageId: string }> },
) {
  const { competitor_id: competitorIdRaw, pageId: pageIdRaw } = await context.params;
  const competitorId = competitorIdRaw?.trim() ?? "";
  const pageId = pageIdRaw?.trim() ?? "";

  if (!competitorId || !UUID_RE.test(competitorId) || !pageId || !UUID_RE.test(pageId)) {
    return NextResponse.json({ ok: false, error: "Invalid id" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { data: page, error: fetchError } = await supabase
    .from("landing_pages")
    .select("*")
    .eq("id", pageId)
    .eq("competitor_id", competitorId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ ok: false, error: fetchError.message }, { status: 500 });
  }
  if (!page) {
    return NextResponse.json({ ok: false, error: "Page not found" }, { status: 404 });
  }

  if (page.page_type === "homepage") {
    return NextResponse.json({ ok: true, page });
  }

  if (page.is_active) {
    return NextResponse.json({ ok: true, page });
  }

  if (await isHostBlockedForCompetitor(supabase, competitorId, user.id, page.url)) {
    return NextResponse.json({ ok: false, error: HOST_BLOCKED_MESSAGE }, { status: 403 });
  }

  const now = new Date().toISOString();
  const { data: updated, error: updateError } = await supabase
    .from("landing_pages")
    .update({
      is_active: true,
      next_screenshot_at: now,
    })
    .eq("id", pageId)
    .eq("competitor_id", competitorId)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (updateError || !updated) {
    return NextResponse.json({ ok: false, error: updateError?.message ?? "Activation failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, page: updated });
}
