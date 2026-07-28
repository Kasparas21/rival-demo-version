import type { SupabaseClient } from "@supabase/supabase-js";

import { deletePolarCustomerForUser } from "@/lib/billing/delete-polar-customer";
import type { Database } from "@/lib/supabase/types";

export type DeleteUserAccountResult = { ok: true } | { ok: false; error: string };

/** Permanently delete a user from Polar and Supabase Auth (cascades workspace data). */
export async function deleteUserAccount(
  admin: SupabaseClient<Database>,
  userId: string,
): Promise<DeleteUserAccountResult> {
  const { data: billingRow } = await admin
    .from("billing_subscriptions")
    .select("polar_customer_id, polar_subscription_id")
    .eq("user_id", userId)
    .maybeSingle();

  const polarResult = await deletePolarCustomerForUser({
    userId,
    polarCustomerId: billingRow?.polar_customer_id,
    polarSubscriptionId: billingRow?.polar_subscription_id,
  });

  if (!polarResult.ok) {
    return {
      ok: false,
      error: `Could not remove billing profile: ${polarResult.error}`,
    };
  }

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}
