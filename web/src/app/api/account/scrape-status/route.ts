import { NextResponse } from "next/server";

import { getUserScrapeEligibility } from "@/lib/billing/scrape-eligibility";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const eligibility = await getUserScrapeEligibility(supabase, user.id);
  const scrapePaused = !eligibility.allowed && eligibility.reason === "inactive_gate";

  return NextResponse.json({
    ok: true,
    scrapePaused,
    lastActiveDateYmd: eligibility.lastActiveDateYmd,
  });
}
