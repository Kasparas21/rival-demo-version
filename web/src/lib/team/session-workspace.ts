import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveWorkspaceContext, type WorkspaceContext } from "@/lib/team/workspace-context";
import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export type SessionWorkspace = {
  supabase: SupabaseClient<Database>;
  user: User;
  ctx: WorkspaceContext;
  dataUserId: string;
};

export async function getSessionWorkspace(): Promise<SessionWorkspace | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  const ctx = await resolveWorkspaceContext(supabase, user.id);
  return { supabase, user, ctx, dataUserId: ctx.dataUserId };
}

/** Billing and scrape quotas always belong to the workspace data owner. */
export function billingUserId(session: SessionWorkspace): string {
  return session.dataUserId;
}

/** Authenticated session with resolved workspace data owner — use for read routes. */
export async function requireSessionWorkspace(): Promise<SessionWorkspace | NextResponse> {
  const session = await getSessionWorkspace();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return session;
}

export function isSessionWorkspace(
  value: SessionWorkspace | NextResponse,
): value is SessionWorkspace {
  return !(value instanceof NextResponse);
}
