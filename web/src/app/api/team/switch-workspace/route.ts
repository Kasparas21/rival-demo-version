import { NextResponse } from "next/server";

import { resolveWorkspaceContext } from "@/lib/team/workspace-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: { ownerUserId?: string | null };
  try {
    body = (await req.json()) as { ownerUserId?: string | null };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const ctx = await resolveWorkspaceContext(supabase, user.id);
  const ownerUserId = body.ownerUserId?.trim() || null;

  if (!ownerUserId || ownerUserId === user.id) {
    const { error } = await supabase
      .from("profiles")
      .update({ active_workspace_owner_id: null, updated_at: new Date().toISOString() })
      .eq("id", user.id);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const nextCtx = await resolveWorkspaceContext(supabase, user.id);
    return NextResponse.json({
      ok: true,
      dataUserId: nextCtx.dataUserId,
      isViewer: nextCtx.isViewer,
      role: nextCtx.role,
    });
  }

  const allowed = ctx.sharedWorkspaces.some((w) => w.ownerUserId === ownerUserId);
  if (!allowed) {
    return NextResponse.json({ ok: false, error: "You do not have access to that workspace." }, { status: 403 });
  }

  const { error } = await supabase
    .from("profiles")
    .update({ active_workspace_owner_id: ownerUserId, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const nextCtx = await resolveWorkspaceContext(supabase, user.id);
  return NextResponse.json({
    ok: true,
    dataUserId: nextCtx.dataUserId,
    isViewer: nextCtx.isViewer,
    role: nextCtx.role,
    owner: nextCtx.owner ?? null,
  });
}
