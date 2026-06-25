import { NextResponse } from "next/server";

import { billingRequiredResponseBody, getBillingEntitlement } from "@/lib/billing/entitlements";
import {
  canCreateEmailTracker,
  loadActiveEmailTrackerCount,
} from "@/lib/billing/usage-quotas";
import {
  buildTrackingAddress,
  buildTrackingCode,
} from "@/lib/email-intelligence/tracking-code";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(req: Request): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { competitor_id?: string };
  try {
    body = (await req.json()) as { competitor_id?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const competitorId = typeof body.competitor_id === "string" ? body.competitor_id.trim() : "";
  if (!competitorId || !UUID_RE.test(competitorId)) {
    return NextResponse.json({ error: "competitor_id required" }, { status: 400 });
  }

  const billing = await getBillingEntitlement(supabase, user.id);
  if (!billing.hasAccess) {
    return NextResponse.json(
      billingRequiredResponseBody("Subscription required for email marketing."),
      { status: 402 },
    );
  }

  const { data: existing } = await supabase
    .from("competitor_email_trackers")
    .select("id, tracking_address, tracking_code, is_active, created_at")
    .eq("user_id", user.id)
    .eq("competitor_id", competitorId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({
      id: existing.id,
      tracking_address: existing.tracking_address,
      tracking_code: existing.tracking_code,
    });
  }

  if (!billing.limits.allowEmailMarketing) {
    return NextResponse.json(
      { error: "Email marketing is available on Starter and Pro plans." },
      { status: 403 },
    );
  }

  const activeTrackers = await loadActiveEmailTrackerCount(supabase, user.id);
  const trackerCheck = canCreateEmailTracker(billing, activeTrackers);
  if (!trackerCheck.ok) {
    return NextResponse.json({ error: trackerCheck.error }, { status: trackerCheck.status });
  }

  const { data: competitor, error: compErr } = await supabase
    .from("saved_competitors")
    .select("id, slug")
    .eq("id", competitorId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (compErr) {
    return NextResponse.json({ error: compErr.message }, { status: 500 });
  }
  if (!competitor) {
    return NextResponse.json({ error: "Competitor not found" }, { status: 404 });
  }

  const tracking_code = buildTrackingCode(competitor.slug);
  const tracking_address = buildTrackingAddress(tracking_code);

  const { data: inserted, error: insertErr } = await supabase
    .from("competitor_email_trackers")
    .insert({
      user_id: user.id,
      competitor_id: competitorId,
      tracking_code,
      tracking_address,
      is_active: true,
    })
    .select("id, tracking_address, tracking_code")
    .single();

  if (insertErr) {
    if (insertErr.code === "23505") {
      const { data: raced } = await supabase
        .from("competitor_email_trackers")
        .select("id, tracking_address, tracking_code")
        .eq("user_id", user.id)
        .eq("competitor_id", competitorId)
        .maybeSingle();
      if (raced) {
        return NextResponse.json({
          id: raced.id,
          tracking_address: raced.tracking_address,
          tracking_code: raced.tracking_code,
        });
      }
    }
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({
    id: inserted.id,
    tracking_address: inserted.tracking_address,
    tracking_code: inserted.tracking_code,
  });
}
