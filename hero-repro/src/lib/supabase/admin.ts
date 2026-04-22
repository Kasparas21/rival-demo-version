import { createClient } from "@supabase/supabase-js";
import { getPublicSupabaseEnv, getServerSupabaseEnv } from "./env";
import type { Database } from "./types";

export function createSupabaseAdminClient() {
  const { supabaseUrl } = getPublicSupabaseEnv();
  const { supabaseSecretKey } = getServerSupabaseEnv();
  return createClient<Database>(supabaseUrl, supabaseSecretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
