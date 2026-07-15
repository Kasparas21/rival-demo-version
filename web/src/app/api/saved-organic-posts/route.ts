import { NextResponse } from "next/server";
import { z } from "zod";

import { organicPostDisplayFields } from "@/lib/organic-content/post-display";
import type { OrganicPlatform } from "@/lib/organic-content/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import type { Database, Json } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const postBodySchema = z.object({
  organicPostId: z.string().uuid(),
  notes: z.string().max(500).nullable().optional(),
});

export async function GET(request: Request): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const competitorId = (searchParams.get("competitorId") ?? "").trim();
  if (!competitorId) {
    return NextResponse.json({ ok: false, error: "missing competitorId" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("saved_organic_posts")
    .select("*")
    .eq("user_id", user.id)
    .eq("competitor_id", competitorId)
    .order("saved_at", { ascending: false });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, savedOrganicPosts: data ?? [] });
}

export async function POST(request: Request): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: z.infer<typeof postBodySchema>;
  try {
    body = postBodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 });
  }

  const { data: srcPost, error: srcErr } = await supabase
    .from("organic_posts")
    .select("*")
    .eq("id", body.organicPostId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (srcErr || !srcPost) {
    return NextResponse.json({ ok: false, error: "post not found" }, { status: 404 });
  }

  const { data: existing } = await supabase
    .from("saved_organic_posts")
    .select("*")
    .eq("user_id", user.id)
    .eq("competitor_id", srcPost.competitor_id)
    .eq("source_organic_post_id", srcPost.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ ok: true, savedOrganicPost: existing, wasExisting: true });
  }

  const display = organicPostDisplayFields(srcPost.raw_data, srcPost.platform as OrganicPlatform);

  const insert: Database["public"]["Tables"]["saved_organic_posts"]["Insert"] = {
    user_id: user.id,
    competitor_id: srcPost.competitor_id,
    source_organic_post_id: srcPost.id,
    platform: srcPost.platform,
    post_id: srcPost.post_id,
    content: srcPost.content,
    media_urls: srcPost.archived_preview_url
      ? [srcPost.archived_preview_url, ...(srcPost.media_urls ?? [])]
      : (srcPost.media_urls ?? []),
    likes: srcPost.likes ?? 0,
    comments: srcPost.comments ?? 0,
    shares: srcPost.shares ?? 0,
    views: srcPost.views ?? 0,
    posted_at: srcPost.posted_at,
    post_url: display.post_url,
    product_type: display.product_type,
    author_username: display.author_username,
    author_display_name: display.author_display_name,
    author_avatar_url: display.author_avatar_url,
    raw_payload: (srcPost.raw_data ?? {}) as Json,
    notes: body.notes != null ? body.notes.slice(0, 500) : null,
    saved_by_user_id: user.id,
  };

  const { data: inserted, error: insertErr } = await supabase
    .from("saved_organic_posts")
    .insert(insert)
    .select()
    .single();

  if (insertErr) {
    return NextResponse.json({ ok: false, error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, savedOrganicPost: inserted });
}
