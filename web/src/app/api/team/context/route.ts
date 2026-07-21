import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRequestWorkspace } from "@/lib/team/session-workspace";
import {
  acceptPendingTeamInvites,
  ownerDisplayLabel,
  resolveWorkspaceContext,
} from "@/lib/team/workspace-context";

export const dynamic = "force-dynamic";

function serializeContext(ctx: Awaited<ReturnType<typeof resolveWorkspaceContext>>) {
  return {
    sessionUserId: ctx.sessionUserId,
    dataUserId: ctx.dataUserId,
    role: ctx.role,
    isViewer: ctx.isViewer,
    isGuest: ctx.isGuest,
    guestExpiresAt: ctx.guestExpiresAt ?? null,
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
  };
}

export async function GET(): Promise<NextResponse> {
  const workspace = await getRequestWorkspace();
  if (!workspace) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    ...serializeContext(workspace.ctx),
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
    ...serializeContext(ctx),
  });
}
