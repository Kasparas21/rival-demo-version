import type { SupabaseClient } from "@supabase/supabase-js";

import { syncWorkspaceBrandLibraryContextFromSetup } from "@/lib/account/sync-workspace-brand-library-context";
import { parseAdsProfileSetup } from "@/lib/onboarding/workspace-ads-setup";
import { polarProductIdForPlan } from "@/lib/billing/config";
import { recordTesterInviteRedemption, validateTesterInviteAccess } from "@/lib/billing/tester-invite";
import type { Database } from "@/lib/supabase/types";
import type { Json } from "@/lib/supabase/types";

export const TESTER_FULL_PRO_PAYLOAD_KEY = "tester_full_pro";

export type ClaimTesterAccessResult =
  | { ok: true; inviteCode: string; startWorkspaceScrape: boolean }
  | { ok: false; error: string; status: 403 | 500 };

export async function claimTesterAccessForUser(
  admin: SupabaseClient<Database>,
  userId: string,
  inviteCode: string | null,
): Promise<ClaimTesterAccessResult> {
  const status = await validateTesterInviteAccess(admin, {
    inviteCode,
    userId,
  });

  if (!status.valid || !status.inviteCode) {
    return { ok: false, error: status.reason ?? "invalid_invite", status: 403 };
  }

  const proProductId = polarProductIdForPlan("pro");
  const rawPayload = {
    admin_unlimited: true,
    dev_plan_override: "pro",
    tester_invite: status.inviteCode,
    tester_claim_source: "complimentary",
    [TESTER_FULL_PRO_PAYLOAD_KEY]: true,
  } satisfies Record<string, unknown>;

  const { error: upsertErr } = await admin.from("billing_subscriptions").upsert(
    {
      user_id: userId,
      polar_product_id: proProductId,
      polar_product_name: "Tester Pro (complimentary)",
      status: "active",
      raw_payload: rawPayload as Json,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (upsertErr) {
    return { ok: false, error: upsertErr.message, status: 500 };
  }

  await recordTesterInviteRedemption(admin, {
    inviteCode: status.inviteCode,
    userId,
    polarSubscriptionId: null,
  });

  const { data: brandRow } = await admin
    .from("brands")
    .select("name, domain, ads_profile_setup")
    .eq("user_id", userId)
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
        userId,
        domainHint,
        adsSetup,
        brandRow?.name,
      );
    } catch (syncErr) {
      console.error("[claim-tester-access] sync workspace brand library context", syncErr);
    }
  }

  return {
    ok: true,
    inviteCode: status.inviteCode,
    startWorkspaceScrape: Boolean(adsSetup),
  };
}
