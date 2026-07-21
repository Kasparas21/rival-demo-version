import { NextResponse } from "next/server";

import {
  buildBlockedHostsIndex,
  loadSnapshotMapForCompetitor,
  resolveSnapshotWithBlockedInheritance,
} from "@/lib/landing-pages/blocked-inheritance";
import { landingPageGroupKey } from "@/lib/landing-pages/normalize-url";
import { ensureDefaultLandingPagesForCompetitor } from "@/lib/landing-page-tracker/create-defaults";
import { syncLandingPagesFromCompetitorAds } from "@/lib/landing-page-tracker/sync-landing-pages-from-ads";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";
import { assertCanMutate, permissionDeniedResponse } from "@/lib/team/permissions";
import { resolveWorkspaceContext } from "@/lib/team/workspace-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function authorizeCompetitor(competitorId: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 }) };

  const ctx = await resolveWorkspaceContext(supabase, user.id);
  const dataUserId = ctx.dataUserId;

  const { data: competitor } = await supabase
    .from("saved_competitors")
    .select("id")
    .eq("id", competitorId)
    .eq("user_id", dataUserId)
    .maybeSingle();

  if (!competitor) {
    return { error: NextResponse.json({ ok: false, error: "Competitor not found" }, { status: 404 }) };
  }

  return { supabase, user, ctx, dataUserId };
}

type LatestSnapshot = {
  id: string;
  screenshot_url: string;
  hero_screenshot_url: string | null;
  page_text: Json;
  pixel_diff_pct: number | null;
  has_meaningful_change: boolean;
  change_analysis: Json;
  taken_at: string;
  status: string;
};

export async function GET(
  _req: Request,
  context: { params: Promise<{ competitor_id: string }> },
) {
  const { competitor_id: competitorIdRaw } = await context.params;
  const competitorId = competitorIdRaw?.trim() ?? "";
  if (!competitorId || !UUID_RE.test(competitorId)) {
    return NextResponse.json({ ok: false, error: "Invalid competitor_id" }, { status: 400 });
  }

  const auth = await authorizeCompetitor(competitorId);
  if ("error" in auth && auth.error) return auth.error;
  const { supabase, ctx, dataUserId } = auth as {
    supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
    ctx: Awaited<ReturnType<typeof resolveWorkspaceContext>>;
    dataUserId: string;
  };

  const admin = createSupabaseAdminClient();
  if (!ctx.isViewer) {
    await ensureDefaultLandingPagesForCompetitor(admin, competitorId, dataUserId);

    const { data: competitorRow } = await admin
      .from("saved_competitors")
      .select("brand_domain, slug")
      .eq("id", competitorId)
      .eq("user_id", dataUserId)
      .maybeSingle();
    const website = competitorRow?.brand_domain?.trim() || competitorRow?.slug?.trim();
    if (website) {
      try {
        await syncLandingPagesFromCompetitorAds(admin, competitorId, dataUserId, website);
      } catch (e) {
        console.warn("[landing-pages] sync from ads failed", e);
      }
    }
  }

  const { data: pages, error: pagesError } = await supabase
    .from("landing_pages")
    .select("*")
    .eq("competitor_id", competitorId)
    .eq("user_id", dataUserId)
    .order("added_at", { ascending: true });

  if (pagesError) {
    return NextResponse.json({ ok: false, error: pagesError.message }, { status: 500 });
  }

  const pageIds = (pages ?? []).map((p) => p.id);
  const latestByPage = new Map<string, LatestSnapshot>();

  if (pageIds.length > 0) {
    const { data: snapshots } = await supabase
      .from("landing_page_snapshots")
      .select(
        "id, landing_page_id, screenshot_url, hero_screenshot_url, page_text, pixel_diff_pct, has_meaningful_change, change_analysis, taken_at, status",
      )
      .in("landing_page_id", pageIds)
      .order("taken_at", { ascending: false });

    for (const snap of snapshots ?? []) {
      if (!latestByPage.has(snap.landing_page_id)) {
        latestByPage.set(snap.landing_page_id, snap);
      }
    }
  }

  const snapshotByGroupKey = await loadSnapshotMapForCompetitor(supabase, competitorId, dataUserId);
  const blockedHosts = buildBlockedHostsIndex(snapshotByGroupKey);

  const trackedPages = (pages ?? [])
    .filter((page) => {
      if (page.page_type === "pricing" || page.page_type === "features") return false;
      if (page.is_active || page.page_type === "homepage") return true;
      return page.auto_detected_from === "ads";
    })
    .map((page) => {
      const groupKey = landingPageGroupKey(page.url);
      const raw = latestByPage.get(page.id) ?? null;
      let latestSnapshot: LatestSnapshot | null = raw;

      if (groupKey) {
        const resolved = resolveSnapshotWithBlockedInheritance(groupKey, snapshotByGroupKey, blockedHosts);
        if (resolved?.status === "blocked" && (!raw || raw.status !== "ok")) {
          latestSnapshot = raw
            ? { ...raw, status: "blocked" }
            : {
                id: "inherited-blocked",
                screenshot_url: resolved.screenshot_url,
                hero_screenshot_url: resolved.hero_screenshot_url,
                page_text: {},
                pixel_diff_pct: null,
                has_meaningful_change: false,
                change_analysis: {},
                taken_at: resolved.taken_at,
                status: "blocked",
              };
        }
      }

      return {
        ...page,
        latestSnapshot,
      };
    })
    .sort((a, b) => {
      if (a.page_type === "homepage") return -1;
      if (b.page_type === "homepage") return 1;
      if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
      return new Date(a.added_at).getTime() - new Date(b.added_at).getTime();
    });

  return NextResponse.json({ ok: true, pages: trackedPages });
}

export async function POST(
  _req: Request,
  context: { params: Promise<{ competitor_id: string }> },
) {
  const { competitor_id: competitorIdRaw } = await context.params;
  const competitorId = competitorIdRaw?.trim() ?? "";
  if (!competitorId || !UUID_RE.test(competitorId)) {
    return NextResponse.json({ ok: false, error: "Invalid competitor_id" }, { status: 400 });
  }

  const auth = await authorizeCompetitor(competitorId);
  if ("error" in auth && auth.error) return auth.error;

  return NextResponse.json(
    { ok: false, error: "Manual URL entry is disabled. Pages are added automatically from ads and the homepage." },
    { status: 403 },
  );
}
