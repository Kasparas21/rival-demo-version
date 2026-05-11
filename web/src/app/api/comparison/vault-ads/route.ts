import { NextResponse } from "next/server";

import { billingRequiredResponseBody, getBillingEntitlement } from "@/lib/billing/entitlements";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

function lifespanDays(firstSeen: string, lastSeen: string): number {
  const a = Date.parse(firstSeen);
  const b = Date.parse(lastSeen);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

export async function GET(req: Request): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const billing = await getBillingEntitlement(supabase, user.id);
  if (!billing.hasAccess) {
    return NextResponse.json(billingRequiredResponseBody("Subscription required for Copy Vault."), { status: 402 });
  }

  const url = new URL(req.url);
  const competitorId = (url.searchParams.get("competitorId") ?? "").trim();
  if (!competitorId) {
    return NextResponse.json({ ok: false, error: "competitorId required" }, { status: 400 });
  }

  const { data: row, error: ownErr } = await supabase
    .from("saved_competitors")
    .select("id")
    .eq("id", competitorId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (ownErr || !row) {
    return NextResponse.json({ ok: false, error: "Competitor not found" }, { status: 404 });
  }

  const { data: ads, error } = await supabase
    .from("scraped_ads")
    .select("id, platform, format, ad_text, first_seen_at, last_seen_at, ai_extracted_angle, ad_creative_url")
    .eq("user_id", user.id)
    .eq("competitor_id", competitorId)
    .eq("ai_enrichment_status", "enriched")
    .not("ai_extracted_angle", "is", null)
    .order("first_seen_at", { ascending: true })
    .limit(80);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const withLife = (ads ?? [])
    .map((a) => ({
      ...a,
      lifespanDays: lifespanDays(a.first_seen_at, a.last_seen_at),
    }))
    .filter((a) => a.lifespanDays >= 30)
    .sort((x, y) => y.lifespanDays - x.lifespanDays)
    .slice(0, 10);

  return NextResponse.json({ ok: true, ads: withLife });
}
