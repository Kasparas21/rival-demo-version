import { cookies } from "next/headers";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  TESTER_INVITE_COOKIE,
  validateTesterInviteAccess,
  type TesterInviteValidation,
} from "@/lib/billing/tester-invite";

export async function getTesterInviteStatusForUser(
  userId?: string | null,
): Promise<TesterInviteValidation & { active: boolean }> {
  const cookieStore = await cookies();
  const inviteCode = cookieStore.get(TESTER_INVITE_COOKIE)?.value ?? null;
  const admin = createSupabaseAdminClient();
  const status = await validateTesterInviteAccess(admin, {
    inviteCode,
    userId: userId ?? null,
  });
  return { ...status, active: status.valid };
}
