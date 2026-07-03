import { NextResponse } from "next/server";

import { regenerateOrganicInsightsForScope } from "@/lib/organic-content/generate-insights";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(
  req: Request,
  context: { params: Promise<{ competitor_id: string }> },
) {
  const { competitor_id: competitorIdRaw } = await context.params;
  const competitorId = competitorIdRaw?.trim() ?? "";

  if (!competitorId || !UUID_RE.test(competitorId)) {
    return NextResponse.json({ ok: false, error: "Invalid competitor_id" }, { status: 400 });
  }

  let body: { platform?: string } = {};
  try {
    body = (await req.json()) as { platform?: string };
  } catch {
    // empty body = regenerate all platforms with posts
  }

  const platform = body.platform?.trim() || undefined;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { data: competitor } = await supabase
    .from("saved_competitors")
    .select("id")
    .eq("id", competitorId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!competitor) {
    return NextResponse.json({ ok: false, error: "Competitor not found" }, { status: 404 });
  }

  const admin = createSupabaseAdminClient();
  const result = await regenerateOrganicInsightsForScope(admin, {
    competitorId,
    userId: user.id,
    platform,
  });

  return NextResponse.json({
    ok: result.ok,
    platforms: result.platforms,
    errors: result.errors,
    error: result.errors[0] ?? null,
  });
}
