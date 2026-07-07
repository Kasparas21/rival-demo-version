import { after, NextResponse } from "next/server";

import {
  HOST_BLOCKED_MESSAGE,
  loadSnapshotMapAndHostBlocked,
  resolveSnapshotWithBlockedInheritance,
} from "@/lib/landing-pages/blocked-inheritance";
import { scrapePausedResponseBody } from "@/lib/billing/entitlements";
import { getUserScrapeEligibility } from "@/lib/billing/scrape-eligibility";
import { landingPageGroupKey } from "@/lib/landing-pages/normalize-url";
import { scheduleCalibrationFromSnapshotUrl } from "@/lib/landing-page-tracker/animation-calibration";
import {
  labelFromLandingPageUrl,
  syncLandingPagesFromCompetitorAds,
} from "@/lib/landing-page-tracker/sync-landing-pages-from-ads";
import { scrapeSingleLandingPage } from "@/lib/landing-page-tracker/scrape-single";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

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

  let body: { url?: string; startTracking?: boolean };
  try {
    body = (await req.json()) as { url?: string; startTracking?: boolean };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const startTracking = Boolean(body.startTracking);

  const groupKey = landingPageGroupKey(body.url?.trim() ?? "");
  if (!groupKey) {
    return NextResponse.json({ ok: false, error: "Invalid URL" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { data: competitor } = await supabase
    .from("saved_competitors")
    .select("id, brand_domain, slug")
    .eq("id", competitorId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!competitor) {
    return NextResponse.json({ ok: false, error: "Competitor not found" }, { status: 404 });
  }

  const admin = createSupabaseAdminClient();
  const website = competitor.brand_domain?.trim() || competitor.slug?.trim();
  if (website) {
    try {
      await syncLandingPagesFromCompetitorAds(admin, competitorId, user.id, website);
    } catch (syncErr) {
      console.error("[capture-preview] sync from ads failed", syncErr);
    }
  }

  const { data: pages } = await supabase
    .from("landing_pages")
    .select("*")
    .eq("competitor_id", competitorId)
    .eq("user_id", user.id);

  let page = (pages ?? []).find((p) => landingPageGroupKey(p.url) === groupKey) ?? null;

  if (!page) {
    const { data: inserted, error: insertError } = await admin
      .from("landing_pages")
      .insert({
        competitor_id: competitorId,
        user_id: user.id,
        url: groupKey,
        label: labelFromLandingPageUrl(groupKey),
        page_type: "custom",
        auto_detected_from: "ads",
        is_active: false,
        next_screenshot_at: null,
      })
      .select("*")
      .single();

    if (insertError || !inserted) {
      return NextResponse.json(
        { ok: false, error: insertError?.message ?? "Failed to create page row" },
        { status: 500 },
      );
    }
    page = inserted;
  }

  const { data: existingSnapshot } = await supabase
    .from("landing_page_snapshots")
    .select("screenshot_url, hero_screenshot_url, status, taken_at")
    .eq("landing_page_id", page.id)
    .order("taken_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { snapshotByGroupKey, hostBlocked } = await loadSnapshotMapAndHostBlocked(
    supabase,
    competitorId,
    user.id,
    groupKey,
  );

  if (hostBlocked && (!existingSnapshot || existingSnapshot.status !== "ok")) {
    const inheritedBlocked = resolveSnapshotWithBlockedInheritance(groupKey, snapshotByGroupKey);
    return NextResponse.json({
      ok: true,
      cached: true,
      inheritedBlocked: true,
      snapshot: inheritedBlocked ?? {
        hero_screenshot_url: null,
        screenshot_url: "",
        status: "blocked" as const,
        taken_at: new Date().toISOString(),
        inheritedBlocked: true,
      },
    });
  }

  if (existingSnapshot && !startTracking) {
    return NextResponse.json({
      ok: true,
      cached: true,
      snapshot: {
        screenshot_url: existingSnapshot.screenshot_url,
        hero_screenshot_url: existingSnapshot.hero_screenshot_url,
        status: existingSnapshot.status === "blocked" ? "blocked" : "ok",
        taken_at: existingSnapshot.taken_at,
      },
    });
  }

  if (startTracking && !page.is_active) {
    if (hostBlocked) {
      return NextResponse.json({ ok: false, error: HOST_BLOCKED_MESSAGE }, { status: 403 });
    }
    const now = new Date().toISOString();
    const { data: activated, error: activateError } = await admin
      .from("landing_pages")
      .update({
        is_active: true,
        next_screenshot_at: now,
      })
      .eq("id", page.id)
      .select("*")
      .single();

    if (activateError || !activated) {
      return NextResponse.json(
        { ok: false, error: activateError?.message ?? "Failed to start tracing" },
        { status: 500 },
      );
    }
    page = activated;
  }

  if (existingSnapshot && startTracking) {
    after(async () => {
      if (existingSnapshot.status === "blocked") return;
      await scheduleCalibrationFromSnapshotUrl(
        admin,
        page.id,
        existingSnapshot.screenshot_url,
      );
    });

    return NextResponse.json({
      ok: true,
      cached: true,
      trackingStarted: true,
      snapshot: {
        screenshot_url: existingSnapshot.screenshot_url,
        hero_screenshot_url: existingSnapshot.hero_screenshot_url,
        status: existingSnapshot.status === "blocked" ? "blocked" : "ok",
        taken_at: existingSnapshot.taken_at,
      },
    });
  }

  const previewOnly = !startTracking && !page.is_active;

  const scrapeEligibility = await getUserScrapeEligibility(supabase, user.id);
  if (!scrapeEligibility.allowed) {
    return NextResponse.json(
      scrapePausedResponseBody(scrapeEligibility.reason ?? "inactive_gate"),
      { status: 402 },
    );
  }

  const result = await scrapeSingleLandingPage(admin, page, { previewOnly });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error ?? "Capture failed" }, { status: 500 });
  }

  const { data: snapshot } = await supabase
    .from("landing_page_snapshots")
    .select("screenshot_url, hero_screenshot_url, status, taken_at")
    .eq("landing_page_id", page.id)
    .order("taken_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!snapshot) {
    return NextResponse.json({ ok: false, error: "Snapshot missing after capture" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    cached: false,
    trackingStarted: startTracking,
    snapshot: {
      screenshot_url: snapshot.screenshot_url,
      hero_screenshot_url: snapshot.hero_screenshot_url,
      status: snapshot.status === "blocked" ? "blocked" : "ok",
      taken_at: snapshot.taken_at,
    },
  });
}
