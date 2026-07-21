import { NextResponse } from "next/server";

import { acceptPendingTeamInvites, resolveWorkspaceContext } from "@/lib/team/workspace-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

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
    isViewer: ctx.isViewer,
    dataUserId: ctx.dataUserId,
  });
}
