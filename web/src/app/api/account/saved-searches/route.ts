import { NextResponse } from "next/server";
import { ensureUserProfile } from "@/lib/auth/profile";
import type { SavedSearchPayload } from "@/lib/account/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function getAuthenticatedUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { supabase, user: null };
  }

  await ensureUserProfile(supabase, user);
  return { supabase, user };
}

export async function GET() {
  const { supabase, user } = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ searches: [] });
  }

  const { data, error } = await supabase
    .from("saved_searches")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(25);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ searches: data ?? [] });
}

export async function POST(request: Request) {
  const { supabase, user } = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const body = (await request.json()) as SavedSearchPayload;
  const query = body.query?.trim();

  if (!query) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 });
  }

  const { error } = await supabase.from("saved_searches").insert({
    user_id: user.id,
    query,
    terms: body.terms ?? [],
    channels: body.channels ?? [],
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
