import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(
  _req: Request,
  context: { params: Promise<{ competitor_id: string }> },
): Promise<NextResponse> {
  const { competitor_id: competitorIdRaw } = await context.params;
  const competitorId = competitorIdRaw?.trim() ?? "";

  if (!competitorId || !UUID_RE.test(competitorId)) {
    return NextResponse.json({ error: "Invalid competitor_id" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("competitor_email_trackers")
    .update({ is_active: true })
    .eq("user_id", user.id)
    .eq("competitor_id", competitorId)
    .select("id, tracking_address, tracking_code, is_active")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Tracker not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, tracker: data });
}
