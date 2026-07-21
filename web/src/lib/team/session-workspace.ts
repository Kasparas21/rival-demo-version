import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  readGuestSessionFromCookies,
  validateGuestInviteAccess,
} from "@/lib/team/guest-session";
import {
  resolveGuestWorkspaceContext,
  resolveWorkspaceContext,
  type WorkspaceContext,
} from "@/lib/team/workspace-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

export type SessionWorkspace = {
  supabase: SupabaseClient<Database>;
  user: User | null;
  ctx: WorkspaceContext;
  dataUserId: string;
  isGuest: boolean;
};

export async function getRequestWorkspace(): Promise<SessionWorkspace | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (!error && user) {
    const ctx = await resolveWorkspaceContext(supabase, user.id);
    return { supabase, user, ctx, dataUserId: ctx.dataUserId, isGuest: false };
  }

  const cookieStore = await cookies();
  const guestPayload = readGuestSessionFromCookies((name) => cookieStore.get(name)?.value);
  if (!guestPayload) return null;

  const validation = await validateGuestInviteAccess(guestPayload.inviteToken);
  if (!validation.ok) return null;
  if (validation.row.owner_user_id !== guestPayload.ownerUserId) return null;

  const ctx = await resolveGuestWorkspaceContext(guestPayload.inviteToken, validation.row);
  if (!ctx) return null;

  return { supabase, user: null, ctx, dataUserId: ctx.dataUserId, isGuest: true };
}

/** @deprecated Use getRequestWorkspace */
export async function getSessionWorkspace(): Promise<SessionWorkspace | null> {
  return getRequestWorkspace();
}

/** Billing and scrape quotas always belong to the workspace data owner. */
export function billingUserId(session: SessionWorkspace): string {
  return session.dataUserId;
}

/** Authenticated or guest session with resolved workspace data owner — use for read routes. */
export async function requireSessionWorkspace(): Promise<SessionWorkspace | NextResponse> {
  const session = await getRequestWorkspace();
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
