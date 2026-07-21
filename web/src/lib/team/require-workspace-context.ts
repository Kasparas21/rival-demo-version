import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";
import { resolveWorkspaceContext, type WorkspaceContext } from "@/lib/team/workspace-context";

export type AuthenticatedWorkspace = {
  supabase: SupabaseClient<Database>;
  ctx: WorkspaceContext;
};

export async function requireAuthenticatedWorkspace(
  supabase: SupabaseClient<Database>,
): Promise<AuthenticatedWorkspace | { error: string; status: number }> {
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return { error: "unauthorized", status: 401 };
  }

  const ctx = await resolveWorkspaceContext(supabase, user.id);
  return { supabase, ctx };
}
