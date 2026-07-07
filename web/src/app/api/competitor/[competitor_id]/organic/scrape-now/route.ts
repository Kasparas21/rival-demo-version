import { NextResponse } from "next/server";

import { resolveCompetitorForUser } from "@/lib/ad-library/classify-competitor-platforms";
import { scrapePausedResponseBody } from "@/lib/billing/entitlements";
import { getUserScrapeEligibility } from "@/lib/billing/scrape-eligibility";
import { scrapeOrganicCompetitor } from "@/lib/organic-content/scrape-competitor";
import { parseOrganicSocials, hasAnyOrganicSocial } from "@/lib/organic-content/socials";
import { ORGANIC_PLATFORMS, type OrganicPlatform } from "@/lib/organic-content/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parsePlatforms(raw: unknown): OrganicPlatform[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const valid = new Set<string>(ORGANIC_PLATFORMS);
  const platforms = raw.filter((p): p is OrganicPlatform => typeof p === "string" && valid.has(p));
  return platforms.length > 0 ? platforms : undefined;
}

export async function POST(
  req: Request,
  context: { params: Promise<{ competitor_id: string }> },
) {
  const { competitor_id: competitorIdRaw } = await context.params;
  const competitorId = competitorIdRaw?.trim() ?? "";

  if (!competitorId || !UUID_RE.test(competitorId)) {
    return NextResponse.json({ ok: false, error: "Invalid competitor_id" }, { status: 400 });
  }

  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    // empty body is fine — scrape all configured platforms
  }

  const platforms = parsePlatforms((body as { platforms?: unknown } | null)?.platforms);
  const newPlatforms = parsePlatforms((body as { newPlatforms?: unknown } | null)?.newPlatforms);

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

  const { data: row, error: rowErr } = await supabase
    .from("saved_competitors")
    .select("id, user_id, socials, organic_baseline_date, name")
    .eq("id", competitor.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (rowErr) {
    return NextResponse.json({ ok: false, error: rowErr.message }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ ok: false, error: "Competitor not found" }, { status: 404 });
  }

  const socials = parseOrganicSocials(row.socials);
  if (!hasAnyOrganicSocial(socials)) {
    return NextResponse.json({ ok: false, error: "No social accounts configured" }, { status: 400 });
  }

  const scrapeEligibility = await getUserScrapeEligibility(supabase, user.id);
  if (!scrapeEligibility.allowed) {
    return NextResponse.json(
      scrapePausedResponseBody(scrapeEligibility.reason ?? "inactive_gate"),
      { status: 402 },
    );
  }

  const admin = createSupabaseAdminClient();
  const result = await scrapeOrganicCompetitor(
    admin,
    {
      id: row.id,
      user_id: row.user_id,
      socials,
      organic_baseline_date: row.organic_baseline_date,
      competitor_name: row.name,
    },
    { platforms, newPlatforms },
  );

  return NextResponse.json({
    ok: result.ok,
    postsUpserted: result.postsUpserted,
    platformErrors: result.platformErrors,
    insightsErrors: result.insightsErrors,
    platformScrapeMeta: result.platformScrapeMeta,
  });
}
