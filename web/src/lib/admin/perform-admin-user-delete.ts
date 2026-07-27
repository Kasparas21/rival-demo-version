import type { SupabaseClient } from "@supabase/supabase-js";

import { deleteUserAccount } from "@/lib/admin/delete-user-account";
import { logAdminEvent } from "@/lib/admin/route-auth";
import type { Database } from "@/lib/supabase/types";

export type PerformAdminUserDeleteParams = {
  adminClient: SupabaseClient<Database>;
  actorUserId: string | null;
  targetUserId: string;
};

export type PerformAdminUserDeleteResult =
  | { ok: true; email: string }
  | { ok: false; error: string; stage?: "polar" | "auth"; notFound?: boolean; selfDelete?: boolean };

export async function performAdminUserDelete(
  params: PerformAdminUserDeleteParams,
): Promise<PerformAdminUserDeleteResult> {
  const { adminClient, actorUserId, targetUserId } = params;

  if (actorUserId && actorUserId === targetUserId) {
    return {
      ok: false,
      error: "You cannot delete your own admin account from here.",
      selfDelete: true,
    };
  }

  const { data: profile } = await adminClient
    .from("profiles")
    .select("id, email")
    .eq("id", targetUserId)
    .maybeSingle();

  if (!profile) {
    return { ok: false, error: "User not found", notFound: true };
  }

  const profileEmail = profile.email?.trim().toLowerCase() ?? "";

  const { data: billingRow } = await adminClient
    .from("billing_subscriptions")
    .select("polar_customer_id, polar_subscription_id")
    .eq("user_id", targetUserId)
    .maybeSingle();

  await logAdminEvent(adminClient, {
    actorUserId,
    targetUserId,
    eventType: "admin_user_deleted",
    payload: { email: profileEmail || null },
  });

  const result = await deleteUserAccount({
    admin: adminClient,
    userId: targetUserId,
    polarCustomerId: billingRow?.polar_customer_id,
    polarSubscriptionId: billingRow?.polar_subscription_id,
  });

  if (!result.ok) {
    return { ok: false, error: result.error, stage: result.stage };
  }

  return { ok: true, email: profileEmail };
}
