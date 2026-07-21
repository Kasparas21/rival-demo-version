import { NextResponse } from "next/server";

import { resolveCompetitorForUser } from "@/lib/ad-library/classify-competitor-platforms";
import { parseOrganicSocials, hasAnyOrganicSocial, findNewlyAddedPlatforms } from "@/lib/organic-content/socials";
import { organicSocialsSchema } from "@/lib/organic-content/types";
import { assertCanMutate } from "@/lib/team/permissions";
import { getRequestWorkspace } from "@/lib/team/session-workspace";

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

  const workspace = await getRequestWorkspace();
  if (!workspace?.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const { supabase, ctx, dataUserId } = workspace;
  try {
    assertCanMutate(ctx);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Forbidden";
    return NextResponse.json({ ok: false, error: message }, { status: 403 });
  }

  const competitor = await resolveCompetitorForUser(supabase, dataUserId, { competitorId });
  if (!competitor) {
    return NextResponse.json({ ok: false, error: "Competitor not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const rawSocials = (body as { socials?: unknown }).socials;
  const parsed = organicSocialsSchema.safeParse(rawSocials ?? {});
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid socials shape" }, { status: 400 });
  }

  const socials = parseOrganicSocials(parsed.data);

  const { data: existing } = await supabase
    .from("saved_competitors")
    .select("socials, organic_next_scrape_at")
    .eq("id", competitor.id)
    .eq("user_id", dataUserId)
    .maybeSingle();

  const prevSocials = parseOrganicSocials(existing?.socials);
  const hasSocials = hasAnyOrganicSocial(socials);
  const newPlatforms = findNewlyAddedPlatforms(prevSocials, socials);
  const triggerScrape = newPlatforms.length > 0;

  const updatePayload: {
    socials: typeof socials;
    organic_next_scrape_at?: string;
  } = { socials };

  if (triggerScrape || (hasSocials && !existing?.organic_next_scrape_at)) {
    updatePayload.organic_next_scrape_at = new Date().toISOString();
  }

  const { data: updated, error } = await supabase
    .from("saved_competitors")
    .update(updatePayload)
    .eq("id", competitor.id)
    .eq("user_id", dataUserId)
    .select("socials, organic_next_scrape_at, organic_last_scraped_at, organic_baseline_date")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    socials: updated?.socials ?? socials,
    organic_next_scrape_at: updated?.organic_next_scrape_at ?? null,
    organic_last_scraped_at: updated?.organic_last_scraped_at ?? null,
    triggerScrape,
    newPlatforms,
  });
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ competitor_id: string }> },
) {
  const { competitor_id: competitorIdRaw } = await context.params;
  const competitorId = competitorIdRaw?.trim() ?? "";

  if (!competitorId || !UUID_RE.test(competitorId)) {
    return NextResponse.json({ ok: false, error: "Invalid competitor_id" }, { status: 400 });
  }

  const workspace = await getRequestWorkspace();
  if (!workspace) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const { supabase, dataUserId } = workspace;

  const { data, error } = await supabase
    .from("saved_competitors")
    .select("socials, organic_next_scrape_at, organic_last_scraped_at, organic_baseline_date")
    .eq("id", competitorId)
    .eq("user_id", dataUserId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ ok: false, error: "Competitor not found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    socials: parseOrganicSocials(data.socials),
    organic_next_scrape_at: data.organic_next_scrape_at,
    organic_last_scraped_at: data.organic_last_scraped_at,
    organic_baseline_date: data.organic_baseline_date,
  });
}
