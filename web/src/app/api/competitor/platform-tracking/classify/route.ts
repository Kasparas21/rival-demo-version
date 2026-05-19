import { NextResponse } from "next/server";
import {
  classifyCompetitorPlatforms,
  resolveCompetitorForUser,
} from "@/lib/ad-library/classify-competitor-platforms";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: Request): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: { competitorId?: string; domain?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const competitor = await resolveCompetitorForUser(supabase, user.id, {
    competitorId: body.competitorId,
    domain: body.domain,
  });

  if (!competitor) {
    return NextResponse.json({ ok: false, error: "Competitor not found" }, { status: 404 });
  }

  try {
    const result = await classifyCompetitorPlatforms(supabase, {
      userId: user.id,
      competitorId: competitor.id,
    });
    return NextResponse.json({ ok: true, competitorId: competitor.id, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[platform-tracking/classify]", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
