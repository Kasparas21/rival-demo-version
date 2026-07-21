import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";
import type { SessionWorkspace } from "@/lib/team/session-workspace";

/** Service-role reads for guest preview; anon+RLS for authenticated owners/viewers. */
export function workspaceReadClient(workspace: SessionWorkspace): SupabaseClient<Database> {
  if (workspace.isGuest || workspace.ctx.isGuest) {
    return createSupabaseAdminClient();
  }
  return workspace.supabase;
}
