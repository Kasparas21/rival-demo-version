import type { SupabaseClient } from "@supabase/supabase-js";

import { deletePolarCustomerForUser } from "@/lib/billing/delete-polar-customer";
import type { Database } from "@/lib/supabase/types";

export type DeleteUserAccountParams = {
  admin: SupabaseClient<Database>;
  userId: string;
  polarCustomerId?: string | null;
  polarSubscriptionId?: string | null;
};

export type DeleteUserAccountResult =
  | { ok: true }
  | { ok: false; stage: "polar" | "auth"; error: string };

export async function deleteUserAccount(params: DeleteUserAccountParams): Promise<DeleteUserAccountResult> {
  const polarResult = await deletePolarCustomerForUser({
    userId: params.userId,
    polarCustomerId: params.polarCustomerId,
    polarSubscriptionId: params.polarSubscriptionId,
  });

  if (!polarResult.ok) {
    return { ok: false, stage: "polar", error: polarResult.error };
  }

  const { error } = await params.admin.auth.admin.deleteUser(params.userId);
  if (error) {
    return { ok: false, stage: "auth", error: error.message };
  }

  return { ok: true };
}
