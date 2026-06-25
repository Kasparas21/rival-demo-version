import { NextResponse } from "next/server";

import {
  buildTrackingAddress,
  buildTrackingCode,
} from "@/lib/email-intelligence/tracking-code";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(
  _req: Request,
  context: { params: Promise<{ competitor_id: string }> },
): Promise<NextResponse> {
  const { competitor_id: competitorIdRaw } = await context.params;
  const competitorId = competitorIdRaw?.trim() ?? "";

  if (!competitorId || !UUID_RE.test(competitorId)) {
    return NextResponse.json({ error: "Invalid competitor_id" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: tracker, error: trackerErr } = await supabase
    .from("competitor_email_trackers")
    .select("id, competitor_id")
    .eq("user_id", user.id)
    .eq("competitor_id", competitorId)
    .maybeSingle();

  if (trackerErr) {
    return NextResponse.json({ error: trackerErr.message }, { status: 500 });
  }
  if (!tracker) {
    return NextResponse.json({ error: "Tracker not found" }, { status: 404 });
  }

  const { data: competitor, error: compErr } = await supabase
    .from("saved_competitors")
    .select("slug")
    .eq("id", competitorId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (compErr || !competitor?.slug) {
    return NextResponse.json({ error: "Competitor not found" }, { status: 404 });
  }

  const tracking_code = buildTrackingCode(competitor.slug);
  const tracking_address = buildTrackingAddress(tracking_code);

  const { data: updated, error: updateErr } = await supabase
    .from("competitor_email_trackers")
    .update({
      tracking_code,
      tracking_address,
      is_active: true,
    })
    .eq("id", tracker.id)
    .select("id, tracking_address, tracking_code, is_active")
    .single();

  if (updateErr) {
    if (updateErr.code === "23505") {
      const tracking_code_retry = buildTrackingCode(`${competitor.slug}-${Date.now().toString(36).slice(-4)}`);
      const tracking_address_retry = buildTrackingAddress(tracking_code_retry);
      const { data: retried, error: retryErr } = await supabase
        .from("competitor_email_trackers")
        .update({
          tracking_code: tracking_code_retry,
          tracking_address: tracking_address_retry,
          is_active: true,
        })
        .eq("id", tracker.id)
        .select("id, tracking_address, tracking_code, is_active")
        .single();
      if (retryErr || !retried) {
        return NextResponse.json({ error: retryErr?.message ?? "Failed to regenerate" }, { status: 500 });
      }
      return NextResponse.json({ ok: true, tracker: retried });
    }
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, tracker: updated });
}
