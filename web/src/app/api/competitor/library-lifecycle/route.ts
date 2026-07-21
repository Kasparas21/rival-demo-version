import { NextResponse } from "next/server";

import { isMetaAdActive, isTikTokAdActive } from "@/lib/ad-library/count-active-ads";
import { metaCardForLifecycle } from "@/lib/ad-library/meta-payload-lifecycle";
import { libraryItemIdFromRawPayload, libraryItemKey } from "@/lib/saved-ads/resolve-scraped-ad";
import { isScrapedAdRunning } from "@/lib/ad-library/scraped-ad-lifecycle";
import type { TikTokAdCard } from "@/lib/ad-library/normalize";
import { getRequestWorkspace } from "@/lib/team/session-workspace";
import { workspaceReadClient } from "@/lib/team/workspace-read-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Bulk lifecycle for ads-library cards (key = `platform:libraryItemId`). */
export async function GET(request: Request): Promise<NextResponse> {
  const workspace = await getRequestWorkspace();
  if (!workspace) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { supabase, user, ctx, dataUserId } = workspace;
  const db = workspaceReadClient(workspace);
  const competitorId = new URL(request.url).searchParams.get("competitorId")?.trim() ?? "";
  if (!competitorId) {
    return NextResponse.json({ ok: false, error: "missing competitorId" }, { status: 400 });
  }

  const [{ data: compRow }, { data: rows, error }] = await Promise.all([
    db
      .from("saved_competitors")
      .select("last_scraped_at")
      .eq("id", competitorId)
      .eq("user_id", dataUserId)
      .maybeSingle(),
    db
      .from("scraped_ads")
      .select("platform, raw_payload, last_seen_at, is_active, archived_creative_url")
      .eq("user_id", dataUserId)
      .eq("competitor_id", competitorId),
  ]);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const lastScrapedAt = compRow?.last_scraped_at ?? null;
  const libraryLifecycle: Record<string, { isRunning: boolean; archivedCreativeUrl?: string }> = {};

  for (const row of rows ?? []) {
    const cardId = libraryItemIdFromRawPayload(row.raw_payload);
    if (!cardId) continue;
    const key = libraryItemKey(String(row.platform), cardId);
    const pl = String(row.platform).trim().toLowerCase();
    const payload = row.raw_payload;

    let running = false;
    const scrapeMs = lastScrapedAt ? Date.parse(lastScrapedAt) : Number.NaN;
    const scrapeAtMs = Number.isFinite(scrapeMs) ? scrapeMs : undefined;
    if (row.is_active === false && (pl === "meta" || pl === "google" || pl === "youtube" || pl === "tiktok")) {
      /** Sweep reconciliation proved this ad is gone — authoritative over stale payloads. */
      running = false;
    } else if (pl === "meta" && payload && typeof payload === "object" && !Array.isArray(payload)) {
      const card = metaCardForLifecycle(payload, scrapeAtMs);
      running = card ? isMetaAdActive(card, scrapeAtMs) : false;
    } else if (pl === "tiktok" && payload && typeof payload === "object" && !Array.isArray(payload)) {
      running = isTikTokAdActive(payload as TikTokAdCard);
    } else {
      running = row.is_active === true || isScrapedAdRunning(row.last_seen_at, lastScrapedAt);
    }
    const archived = row.archived_creative_url?.trim();
    libraryLifecycle[key] = {
      isRunning: running,
      ...(archived ? { archivedCreativeUrl: archived } : {}),
    };
  }

  return NextResponse.json({ ok: true, libraryLifecycle });
}
