import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getRequestWorkspace } from "@/lib/team/session-workspace";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ reportId: string }> };

/** Owner-only: delete a monthly report output and invalidate its public URL. */
export async function DELETE(_req: Request, context: RouteContext): Promise<NextResponse> {
  const { reportId } = await context.params;
  const id = reportId?.trim();
  if (!id) {
    return NextResponse.json({ ok: false, error: "invalid_id" }, { status: 400 });
  }

  const workspace = await getRequestWorkspace();
  if (!workspace) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { supabase, user, ctx, dataUserId } = workspace;
  const { data: owned } = await supabase
    .from("autopilot_outputs")
    .select("id")
    .eq("id", id)
    .eq("user_id", dataUserId)
    .eq("output_type", "monthly_report")
    .maybeSingle();

  if (!owned) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("autopilot_outputs").delete().eq("id", id).eq("user_id", dataUserId);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
