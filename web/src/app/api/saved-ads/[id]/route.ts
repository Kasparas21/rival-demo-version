import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
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

  const { data: savedRow } = await supabase
    .from("saved_ads")
    .select("competitor_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!savedRow) {
    return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  }

  const blocked = await denyIfWorkspaceBrandSavedAdsBlocked(supabase, user.id, savedRow.competitor_id);
  if (blocked) return blocked;

  const { error } = await supabase.from("saved_ads").delete().eq("id", id).eq("user_id", user.id);

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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 });
  }

  const notesRaw = typeof body === "object" && body !== null ? (body as Record<string, unknown>).notes : undefined;
  const folderIdRaw =
    typeof body === "object" && body !== null ? (body as Record<string, unknown>).folderId : undefined;

  const notes =
    notesRaw === null || notesRaw === undefined
      ? undefined
      : typeof notesRaw === "string"
        ? notesRaw.slice(0, 500)
        : undefined;

  const folderId = typeof folderIdRaw === "string" ? folderIdRaw.trim() : undefined;

  if (notes === undefined && !folderId) {
    return NextResponse.json({ ok: false, error: "missing notes or folderId" }, { status: 400 });
  }

  const { data: savedRow } = await supabase
    .from("saved_ads")
    .select("competitor_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!savedRow) {
    return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  }

  const blocked = await denyIfWorkspaceBrandSavedAdsBlocked(supabase, user.id, savedRow.competitor_id);
  if (blocked) return blocked;

  const patch: { notes?: string; folder_id?: string } = {};
  if (notes !== undefined) patch.notes = notes;
  if (folderId) {
    const { data: folder } = await supabase
      .from("saved_folders")
      .select("id")
      .eq("id", folderId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!folder) {
      return NextResponse.json({ ok: false, error: "folder not found" }, { status: 404 });
    }
    patch.folder_id = folder.id;
  }

  const { data, error } = await supabase
    .from("saved_ads")
    .update(patch)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, savedAd: data });
}
