import { NextResponse } from "next/server";

import { runManualAgentForCompetitor } from "@/lib/agent/manual-run";
import { resolveCompetitorForUser } from "@/lib/ad-library/classify-competitor-platforms";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 120;
export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(
  _req: Request,
  context: { params: Promise<{ competitor_id: string }> },
) {
  const { competitor_id: competitorIdRaw } = await context.params;
  const competitorId = competitorIdRaw?.trim() ?? "";

  if (!competitorId || !UUID_RE.test(competitorId)) {
    return NextResponse.json({ ok: false, error: "Invalid competitor_id" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const competitor = await resolveCompetitorForUser(supabase, user.id, { competitorId });
  if (!competitor) {
    return NextResponse.json({ ok: false, error: "Competitor not found" }, { status: 404 });
  }

  const admin = createSupabaseAdminClient();
  const result = await runManualAgentForCompetitor(admin, {
    userId: user.id,
    competitorId: competitor.id,
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: result.error === "no_channels" ? 400 : 403 });
  }

  return NextResponse.json(result);
}
