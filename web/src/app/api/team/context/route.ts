import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  acceptPendingTeamInvites,
  ownerDisplayLabel,
  resolveWorkspaceContext,
} from "@/lib/team/workspace-context";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const ctx = await resolveWorkspaceContext(supabase, user.id);

  return NextResponse.json({
    ok: true,
    sessionUserId: ctx.sessionUserId,
    dataUserId: ctx.dataUserId,
    role: ctx.role,
    isViewer: ctx.isViewer,
    owner: ctx.owner
      ? {
          ...ctx.owner,
          displayLabel: ownerDisplayLabel(ctx.owner),
        }
      : null,
    sharedWorkspaces: ctx.sharedWorkspaces.map((w) => ({
      ...w,
      displayLabel: ownerDisplayLabel(w),
    })),
  });
}

export async function POST(): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const inviteResult = await acceptPendingTeamInvites(supabase, user.id, user.email);
  const ctx = await resolveWorkspaceContext(supabase, user.id);

  return NextResponse.json({
    ok: true,
    accepted: inviteResult.accepted,
    chooseWorkspace: inviteResult.accepted > 0,
    sessionUserId: ctx.sessionUserId,
    dataUserId: ctx.dataUserId,
    role: ctx.role,
    isViewer: ctx.isViewer,
    owner: ctx.owner
      ? {
          ...ctx.owner,
          displayLabel: ownerDisplayLabel(ctx.owner),
        }
      : null,
    sharedWorkspaces: ctx.sharedWorkspaces.map((w) => ({
      ...w,
      displayLabel: ownerDisplayLabel(w),
    })),
  });
}
