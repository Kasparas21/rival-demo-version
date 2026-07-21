import { NextResponse } from "next/server";

import { assertCanManageTeam, permissionDeniedResponse } from "@/lib/team/permissions";
import { resolveWorkspaceContext } from "@/lib/team/workspace-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, { params }: RouteParams): Promise<NextResponse> {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const ctx = await resolveWorkspaceContext(supabase, user.id);
  try {
    assertCanManageTeam(ctx);
  } catch (err) {
    return permissionDeniedResponse(err);
  }

  const { data: row, error: fetchErr } = await supabase
    .from("team_memberships")
    .select("id, member_user_id, invited_email")
    .eq("id", id)
    .eq("owner_user_id", user.id)
    .maybeSingle();

  if (fetchErr) {
    return NextResponse.json({ ok: false, error: fetchErr.message }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ ok: false, error: "Member not found" }, { status: 404 });
  }

  if (row.member_user_id) {
    await supabase
      .from("profiles")
      .update({ active_workspace_owner_id: null, updated_at: new Date().toISOString() })
      .eq("id", row.member_user_id)
      .eq("active_workspace_owner_id", user.id);
  }

  const { error: deleteErr } = await supabase
    .from("team_memberships")
    .delete()
    .eq("id", id)
    .eq("owner_user_id", user.id);

  if (deleteErr) {
    return NextResponse.json({ ok: false, error: deleteErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, removedEmail: row.invited_email });
}
