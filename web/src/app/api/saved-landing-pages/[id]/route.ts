import { NextResponse } from "next/server";

import { assertCanMutate } from "@/lib/team/permissions";
import { getRequestWorkspace } from "@/lib/team/session-workspace";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await context.params;
  const workspace = await getRequestWorkspace();
  if (!workspace) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { supabase, user, ctx, dataUserId } = workspace;
  try {
    assertCanMutate(ctx);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Forbidden";
    return NextResponse.json({ ok: false, error: message }, { status: 403 });
  }

  const { error } = await supabase
    .from("saved_landing_pages")
    .delete()
    .eq("id", id)
    .eq("user_id", dataUserId);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
