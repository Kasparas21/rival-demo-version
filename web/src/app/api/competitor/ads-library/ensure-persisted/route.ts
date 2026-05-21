import { NextResponse } from "next/server";
import { ensureCompetitorAdsPersisted } from "@/lib/ad-library/ensure-competitor-ads-persisted";
import { resolveCompetitorForUser } from "@/lib/ad-library/classify-competitor-platforms";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: { domain?: string; competitorId?: string };
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

  const domainHint = competitor.brand_domain?.trim() || competitor.slug;
  const result = await ensureCompetitorAdsPersisted(supabase, {
    userId: user.id,
    domainHint,
    competitorId: competitor.id,
  });

  return NextResponse.json({
    ok: result.ok,
    competitorId: result.competitorId,
    adsCachePlatforms: result.adsCachePlatforms,
    scrapedAdsPersisted: result.scrapedAdsPersisted,
    errors: result.errors,
  });
}
