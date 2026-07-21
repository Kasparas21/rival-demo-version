import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";
import { getRequestWorkspace } from "@/lib/team/session-workspace";
import type { WorkspaceContext } from "@/lib/team/workspace-context";

export type AuthenticatedWorkspace = {
  supabase: SupabaseClient<Database>;
  ctx: WorkspaceContext;
};

export async function requireAuthenticatedWorkspace(
  supabase: SupabaseClient<Database>,
): Promise<AuthenticatedWorkspace | { error: string; status: number }> {
  const workspace = await getRequestWorkspace();
  if (!workspace) {
    return { error: "unauthorized", status: 401 };
  }
  if (workspace.isGuest || workspace.ctx.isGuest) {
    return { error: "Sign in required.", status: 401 };
  }

  return { supabase: workspace.supabase, ctx: workspace.ctx };
}
