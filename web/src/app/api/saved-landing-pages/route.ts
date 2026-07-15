import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";

import type { Database } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const postBodySchema = z.object({
  landingPageId: z.string().uuid(),
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
    .from("saved_landing_pages")
    .select("*")
    .eq("user_id", user.id)
    .eq("competitor_id", competitorId)
    .order("saved_at", { ascending: false });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, savedLandingPages: data ?? [] });
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

  const { data: srcPage, error: srcErr } = await supabase
    .from("landing_pages")
    .select("*")
    .eq("id", body.landingPageId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (srcErr || !srcPage) {
    return NextResponse.json({ ok: false, error: "page not found" }, { status: 404 });
  }

  const { data: existing } = await supabase
    .from("saved_landing_pages")
    .select("*")
    .eq("user_id", user.id)
    .eq("competitor_id", srcPage.competitor_id)
    .eq("source_landing_page_id", srcPage.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ ok: true, savedLandingPage: existing, wasExisting: true });
  }

  const { data: latestSnapshot } = await supabase
    .from("landing_page_snapshots")
    .select("screenshot_url, hero_screenshot_url")
    .eq("landing_page_id", srcPage.id)
    .eq("user_id", user.id)
    .order("taken_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const insert: Database["public"]["Tables"]["saved_landing_pages"]["Insert"] = {
    user_id: user.id,
    competitor_id: srcPage.competitor_id,
    source_landing_page_id: srcPage.id,
    url: srcPage.url,
    label: srcPage.label ?? "",
    page_type: srcPage.page_type,
    screenshot_url: latestSnapshot?.screenshot_url ?? null,
    hero_screenshot_url: latestSnapshot?.hero_screenshot_url ?? null,
    notes: body.notes != null ? body.notes.slice(0, 500) : null,
    saved_by_user_id: user.id,
  };

  const { data: inserted, error: insertErr } = await supabase
    .from("saved_landing_pages")
    .insert(insert)
    .select()
    .single();

  if (insertErr) {
    return NextResponse.json({ ok: false, error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, savedLandingPage: inserted });
}
