import { NextResponse } from "next/server";

import { getRequestWorkspace } from "@/lib/team/session-workspace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<NextResponse> {
    const workspace = await getRequestWorkspace();
  if (!workspace) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { supabase, user, ctx, dataUserId } = workspace;

  const url = new URL(req.url);
  const competitorId = (url.searchParams.get("competitorId") ?? "").trim();

  let query = supabase
    .from("competitor_alerts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", dataUserId)
    .eq("is_read", false);

  if (competitorId) {
    query = query.eq("competitor_id", competitorId);
  }

  const { count, error } = await query;

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, count: count ?? 0 });
}
