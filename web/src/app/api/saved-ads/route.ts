import { NextResponse } from "next/server";
import { z } from "zod";

import { getPostHogServerClient, getPostHogDistinctId } from "@/lib/analytics/posthog-server";
import { resolveScrapedAdIdForLibraryItem } from "@/lib/saved-ads/resolve-scraped-ad";
import { denyIfWorkspaceBrandSavedAdsBlocked } from "@/lib/saved-ads/workspace-brand-saved-access";
import { assertCanMutate, permissionDeniedResponse } from "@/lib/team/permissions";
import { getRequestWorkspace } from "@/lib/team/session-workspace";

import type { Database } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const postBodySchema = z.object({
  scrapedAdId: z.string().uuid().optional(),
  competitorId: z.string().uuid().optional(),
  platform: z.string().min(1).optional(),
  libraryItemId: z.string().min(1).optional(),
  notes: z.string().max(500).nullable().optional(),
});

export async function GET(request: Request): Promise<NextResponse> {
  const workspace = await getRequestWorkspace();
  if (!workspace) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { supabase, user, ctx, dataUserId } = workspace;
  const { searchParams } = new URL(request.url);
  const competitorId = (searchParams.get("competitorId") ?? "").trim();
  if (!competitorId) {
    return NextResponse.json({ ok: false, error: "missing competitorId" }, { status: 400 });
  }

  const blocked = await denyIfWorkspaceBrandSavedAdsBlocked(supabase, dataUserId, competitorId);
  if (blocked) return blocked;

  const { data, error } = await supabase
    .from("saved_ads")
    .select("*")
    .eq("user_id", dataUserId)
    .eq("competitor_id", competitorId)
    .order("saved_at", { ascending: false });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, savedAds: data ?? [] });
}

export async function POST(request: Request): Promise<NextResponse> {
  const workspace = await getRequestWorkspace();
  if (!workspace?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { supabase, user, ctx, dataUserId } = workspace;
  try {
    assertCanMutate(ctx);
  } catch (err) {
    return permissionDeniedResponse(err);
  }

  let body: z.infer<typeof postBodySchema>;
  try {
    body = postBodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 });
  }

  let scrapedAdId = body.scrapedAdId?.trim() ?? "";

  if (!scrapedAdId && body.competitorId && body.platform && body.libraryItemId) {
    const resolved = await resolveScrapedAdIdForLibraryItem(
      supabase,
      dataUserId,
      body.competitorId.trim(),
      body.platform,
      body.libraryItemId,
    );
    scrapedAdId = resolved ?? "";
  }

  if (!scrapedAdId) {
    return NextResponse.json({ ok: false, error: "missing scrapedAdId or library lookup" }, { status: 400 });
  }

  const { data: srcAd, error: srcErr } = await supabase
    .from("scraped_ads")
    .select("*")
    .eq("id", scrapedAdId)
    .eq("user_id", dataUserId)
    .maybeSingle();

  if (srcErr || !srcAd) {
    return NextResponse.json({ ok: false, error: "ad not found" }, { status: 404 });
  }

  const blocked = await denyIfWorkspaceBrandSavedAdsBlocked(supabase, dataUserId, srcAd.competitor_id);
  if (blocked) return blocked;

  const { data: existing } = await supabase
    .from("saved_ads")
    .select("*")
    .eq("user_id", dataUserId)
    .eq("competitor_id", srcAd.competitor_id)
    .eq("source_scraped_ad_id", srcAd.id)
    .maybeSingle();

  if (existing) {
    if (body.notes !== undefined && body.notes !== null) {
      const { data: updated, error: updErr } = await supabase
        .from("saved_ads")
        .update({ notes: body.notes.slice(0, 500) })
        .eq("id", existing.id)
        .eq("user_id", dataUserId)
        .select()
        .single();
      if (updErr) {
        return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true, savedAd: updated, wasExisting: true });
    }
    return NextResponse.json({ ok: true, savedAd: existing, wasExisting: true });
  }

  const insert: Database["public"]["Tables"]["saved_ads"]["Insert"] = {
    user_id: dataUserId,
    competitor_id: srcAd.competitor_id,
    source_scraped_ad_id: srcAd.id,
    platform: srcAd.platform,
    ad_text: srcAd.ad_text,
    ad_creative_url: srcAd.ad_creative_url,
    format: srcAd.format,
    ai_extracted_angle: srcAd.ai_extracted_angle,
    funnel_stage: srcAd.funnel_stage,
    raw_payload: srcAd.raw_payload,
    source_first_seen_at: srcAd.first_seen_at,
    source_last_seen_at: srcAd.last_seen_at,
    notes: body.notes != null ? body.notes.slice(0, 500) : null,
    saved_by_user_id: user.id,
  };

  const { data: inserted, error: insertErr } = await supabase.from("saved_ads").insert(insert).select().single();

  if (insertErr) {
    return NextResponse.json({ ok: false, error: insertErr.message }, { status: 500 });
  }

  const posthog = getPostHogServerClient();
  if (posthog) {
    const distinctId = (await getPostHogDistinctId()) ?? user.id;
    posthog.capture({
      distinctId,
      event: "ad_saved",
      properties: {
        user_id: dataUserId,
        platform: srcAd.platform,
        format: srcAd.format,
        competitor_id: srcAd.competitor_id,
      },
    });
  }

  return NextResponse.json({ ok: true, savedAd: inserted });
}
