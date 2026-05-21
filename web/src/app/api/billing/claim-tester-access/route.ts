import { NextResponse, type NextRequest } from "next/server";

import { syncWorkspaceBrandLibraryContextFromSetup } from "@/lib/account/sync-workspace-brand-library-context";
import { parseAdsProfileSetup } from "@/lib/onboarding/workspace-ads-setup";
import { polarProductIdForPlan } from "@/lib/billing/config";
import {
  recordTesterInviteRedemption,
  setTesterInviteCookie,
  validateTesterInviteAccess,
} from "@/lib/billing/tester-invite";
import { resolveTesterInviteCodeForUser } from "@/lib/billing/tester-invite-server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Complimentary Pro for valid tester invites when Polar checkout still asks for a card. */
export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const inviteCode = await resolveTesterInviteCodeForUser(user.id, request);
  const admin = createSupabaseAdminClient();
  const status = await validateTesterInviteAccess(admin, {
    inviteCode,
    userId: user.id,
  });

  if (!status.valid || !status.inviteCode) {
    return NextResponse.json(
      { ok: false, error: status.reason ?? "invalid_invite" },
      { status: 403 },
    );
  }

  const proProductId = polarProductIdForPlan("pro");
  const rawPayload = {
    admin_unlimited: true,
    dev_plan_override: "pro",
    tester_invite: status.inviteCode,
    tester_claim_source: "complimentary",
  } satisfies Record<string, unknown>;

  const { error: upsertErr } = await admin.from("billing_subscriptions").upsert(
    {
      user_id: user.id,
      polar_product_id: proProductId,
      polar_product_name: "Tester Pro (complimentary)",
      status: "active",
      raw_payload: rawPayload as Json,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (upsertErr) {
    return NextResponse.json({ ok: false, error: upsertErr.message }, { status: 500 });
  }

  await recordTesterInviteRedemption(admin, {
    inviteCode: status.inviteCode,
    userId: user.id,
    polarSubscriptionId: null,
  });

  const { data: brandRow } = await admin
    .from("brands")
    .select("name, domain, ads_profile_setup")
    .eq("user_id", user.id)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const adsSetup = parseAdsProfileSetup(brandRow?.ads_profile_setup ?? null);
  const domainHint =
    (typeof brandRow?.domain === "string" && brandRow.domain.trim()) ||
    adsSetup?.scrape.websiteUrl.trim() ||
    "";
  if (adsSetup && domainHint) {
    try {
      await syncWorkspaceBrandLibraryContextFromSetup(
        admin,
        user.id,
        domainHint,
        adsSetup,
        brandRow?.name,
      );
    } catch (syncErr) {
      console.error("[claim-tester-access] sync workspace brand library context", syncErr);
    }
  }

  const out = NextResponse.json({ ok: true, planTier: "pro", startWorkspaceScrape: Boolean(adsSetup) });
  if (inviteCode) {
    setTesterInviteCookie(out, inviteCode);
  }
  return out;
}
