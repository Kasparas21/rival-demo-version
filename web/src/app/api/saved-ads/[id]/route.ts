import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { assertCanMutate } from "@/lib/team/permissions";
import { resolveWorkspaceContext } from "@/lib/team/workspace-context";
import { denyIfWorkspaceBrandSavedAdsBlocked } from "@/lib/saved-ads/workspace-brand-saved-access";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
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
    assertCanMutate(ctx);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Forbidden";
    return NextResponse.json({ ok: false, error: message }, { status: 403 });
  }
  const dataUserId = ctx.dataUserId;

  const { data: savedRow } = await supabase
    .from("saved_ads")
    .select("competitor_id")
    .eq("id", id)
    .eq("user_id", dataUserId)
    .maybeSingle();

  if (!savedRow) {
    return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  }

  const blocked = await denyIfWorkspaceBrandSavedAdsBlocked(supabase, dataUserId, savedRow.competitor_id);
  if (blocked) return blocked;

  const { error } = await supabase.from("saved_ads").delete().eq("id", id).eq("user_id", dataUserId);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
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
    assertCanMutate(ctx);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Forbidden";
    return NextResponse.json({ ok: false, error: message }, { status: 403 });
  }
  const dataUserId = ctx.dataUserId;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 });
  }

  const notesRaw = typeof body === "object" && body !== null ? (body as Record<string, unknown>).notes : undefined;
  const notes =
    notesRaw === null || notesRaw === undefined
      ? undefined
      : typeof notesRaw === "string"
        ? notesRaw.slice(0, 500)
        : undefined;

  if (notes === undefined) {
    return NextResponse.json({ ok: false, error: "missing notes" }, { status: 400 });
  }

  const { data: savedRow } = await supabase
    .from("saved_ads")
    .select("competitor_id")
    .eq("id", id)
    .eq("user_id", dataUserId)
    .maybeSingle();

  if (!savedRow) {
    return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  }

  const blocked = await denyIfWorkspaceBrandSavedAdsBlocked(supabase, dataUserId, savedRow.competitor_id);
  if (blocked) return blocked;

  const { data, error } = await supabase
    .from("saved_ads")
    .update({ notes })
    .eq("id", id)
    .eq("user_id", dataUserId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, savedAd: data });
}
