import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

/** True when autopilot watch owns alert delivery for this user. */
export async function isAutopilotDeliveryActive(
  admin: SupabaseClient<Database>,
  userId: string,
): Promise<boolean> {
  const { data } = await admin
    .from("autopilot_settings")
    .select("enabled, watch_enabled")
    .eq("user_id", userId)
    .maybeSingle();

  return data?.enabled === true && data?.watch_enabled !== false;
}
