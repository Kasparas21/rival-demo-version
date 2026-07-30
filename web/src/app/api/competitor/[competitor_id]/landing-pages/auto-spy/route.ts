import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function PATCH(
  req: Request,
  context: { params: Promise<{ competitor_id: string }> },
) {
  const { competitor_id: competitorIdRaw } = await context.params;
  const competitorId = competitorIdRaw?.trim() ?? "";

  if (!competitorId || !UUID_RE.test(competitorId)) {
    return NextResponse.json({ ok: false, error: "Invalid competitor_id" }, { status: 400 });
  }

  let enabled: boolean;
  try {
    const body = (await req.json()) as { enabled?: boolean };
    enabled = Boolean(body.enabled);
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("saved_competitors")
    .update({
      auto_spy_new_landing_pages: enabled,
      updated_at: new Date().toISOString(),
    })
    .eq("id", competitorId)
    .eq("user_id", user.id)
    .select("id, auto_spy_new_landing_pages")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ ok: false, error: "Competitor not found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    competitorId: data.id,
    autoSpyNewLandingPages: data.auto_spy_new_landing_pages,
  });
}
