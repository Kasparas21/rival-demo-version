import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { normalizeInviteCode } from "@/lib/billing/tester-invite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type InviteCohortRow = {
  redemption_id: string;
  invite_code: string;
  cohort_label: string | null;
  redeemed_at: string;
  user_id: string;
  email: string | null;
  company_name: string | null;
  company_url: string | null;
  company_role: string | null;
  onboarding_completed: boolean | null;
  billing_status: string | null;
  polar_product_name: string | null;
  trial_end: string | null;
  plan_access: string | null;
  brand_domain: string | null;
  has_ads_profile_setup: boolean | null;
  competitor_count: number | null;
  competitor_domains: string[] | null;
  platform_tracking_rows: number | null;
  first_scrape_completed_at: string | null;
  funnel_stage: string | null;
};

/** List invite cohort signups (service role). Bearer ADMIN_SECRET required. */
export async function GET(req: Request) {
  const adminSecret = process.env.ADMIN_SECRET?.trim();
  if (!adminSecret || req.headers.get("authorization") !== `Bearer ${adminSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const codeRaw = url.searchParams.get("code")?.trim();
  const inviteCode = codeRaw ? normalizeInviteCode(codeRaw) : null;

  const supabase = createSupabaseAdminClient();
  let query = supabase.from("invite_cohort_signups").select("*").order("redeemed_at", { ascending: false });

  if (inviteCode) {
    query = query.eq("invite_code", inviteCode);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    count: data?.length ?? 0,
    rows: (data ?? []) as InviteCohortRow[],
  });
}
