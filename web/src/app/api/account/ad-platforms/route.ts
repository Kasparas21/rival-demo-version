import { NextResponse } from "next/server";

import { DEFAULT_ENABLED_AD_PLATFORMS } from "@/lib/ad-library/disabled-scrape-platforms";
import { getBillingEntitlement } from "@/lib/billing/entitlements";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Ad platforms switched on for the signed-in account (pickers show the rest as "Coming soon"). */
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: true, enabled: [...DEFAULT_ENABLED_AD_PLATFORMS] });
  }

  const billing = await getBillingEntitlement(supabase, user.id);
  return NextResponse.json({ ok: true, enabled: billing.enabledAdPlatforms });
}
