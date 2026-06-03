import { NextResponse } from "next/server";
import { getPostHogServerClient, getPostHogDistinctId } from "@/lib/analytics/posthog-server";
import { ensureUserProfile } from "@/lib/auth/profile";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function authContext() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { supabase, user: null as null };
  }
  await ensureUserProfile(supabase, user);
  return { supabase, user };
}

/** PATCH — toggles spy follow for a saved competitor (owner only). */
export async function PATCH(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { supabase, user } = await authContext();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: row, error: selErr } = await supabase
    .from("saved_competitors")
    .select("id, is_followed, is_workspace_brand, user_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (selErr) {
    return NextResponse.json({ error: selErr.message }, { status: 500 });
  }
  if (!row?.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (row.is_workspace_brand === true) {
    return NextResponse.json({ error: "Workspace brand cannot be flagged for weekly spy scraping." }, { status: 409 });
  }

  const nextFollowed = !row.is_followed;
  const { data: updated, error: updErr } = await supabase
    .from("saved_competitors")
    .update({
      is_followed: nextFollowed,
      followed_at: nextFollowed ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (updErr || !updated) {
    return NextResponse.json({ error: updErr?.message ?? "Update failed" }, { status: 500 });
  }

  const posthog = getPostHogServerClient();
  if (posthog) {
    const distinctId = (await getPostHogDistinctId()) ?? user.id;
    posthog.capture({
      distinctId,
      event: "competitor_follow_toggled",
      properties: {
        user_id: user.id,
        competitor_id: id,
        is_followed: nextFollowed,
      },
    });
  }

  return NextResponse.json({ competitor: updated });
}
