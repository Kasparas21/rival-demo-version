import { NextResponse } from "next/server";

import { savedEmailToCompetitorRow } from "@/lib/saved-emails/snapshot";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { assertCanMutate } from "@/lib/team/permissions";
import { resolveWorkspaceContext } from "@/lib/team/workspace-context";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
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
  const dataUserId = ctx.dataUserId;

  const { data, error } = await supabase
    .from("saved_emails")
    .select("*")
    .eq("id", id)
    .eq("user_id", dataUserId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    savedEmail: data,
    email: savedEmailToCompetitorRow(data),
  });
}

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

  const { error } = await supabase.from("saved_emails").delete().eq("id", id).eq("user_id", dataUserId);

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

  const { data, error } = await supabase
    .from("saved_emails")
    .update({ notes })
    .eq("id", id)
    .eq("user_id", dataUserId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, savedEmail: data });
}
