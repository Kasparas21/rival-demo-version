import { NextResponse } from "next/server";
import { z } from "zod";

import { getPostHogServerClient, getPostHogDistinctId } from "@/lib/analytics/posthog-server";
import { archiveSavedAdCreative } from "@/lib/saved-ads/archive-saved-ad-creative";
import { resolveScrapedAdIdForLibraryItem } from "@/lib/saved-ads/resolve-scraped-ad";
import { resolveSavedFolderId } from "@/lib/saved-ads/saved-folders";
import { denyIfWorkspaceBrandSavedAdsBlocked } from "@/lib/saved-ads/workspace-brand-saved-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import type { Database } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const postBodySchema = z.object({
  scrapedAdId: z.string().uuid().optional(),
  competitorId: z.string().uuid().optional(),
  platform: z.string().min(1).optional(),
  libraryItemId: z.string().min(1).optional(),
  notes: z.string().max(500).nullable().optional(),
  folderId: z.string().uuid().optional(),
});

export async function GET(request: Request): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const competitorId = (searchParams.get("competitorId") ?? "").trim();
  if (!competitorId) {
    return NextResponse.json({ ok: false, error: "missing competitorId" }, { status: 400 });
  }

  const blocked = await denyIfWorkspaceBrandSavedAdsBlocked(supabase, user.id, competitorId);
  if (blocked) return blocked;

  const { data, error } = await supabase
    .from("saved_ads")
    .select("*")
    .eq("user_id", user.id)
    .eq("competitor_id", competitorId)
    .order("saved_at", { ascending: false });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, savedAds: data ?? [] });
}

export async function POST(request: Request): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
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
      user.id,
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
    .eq("user_id", user.id)
    .maybeSingle();

  if (srcErr || !srcAd) {
    return NextResponse.json({ ok: false, error: "ad not found" }, { status: 404 });
  }

  const blocked = await denyIfWorkspaceBrandSavedAdsBlocked(supabase, user.id, srcAd.competitor_id);
  if (blocked) return blocked;

  const { data: existing } = await supabase
    .from("saved_ads")
    .select("*")
    .eq("user_id", user.id)
    .eq("competitor_id", srcAd.competitor_id)
    .eq("source_scraped_ad_id", srcAd.id)
    .maybeSingle();

  const { folderId: resolvedFolderId, error: folderErr } = await resolveSavedFolderId(
    supabase,
    user.id,
    body.folderId,
  );
  if (folderErr || !resolvedFolderId) {
    return NextResponse.json({ ok: false, error: folderErr ?? "folder required" }, { status: 400 });
  }

  if (existing) {
    const patch: Database["public"]["Tables"]["saved_ads"]["Update"] = {};
    if (body.notes !== undefined && body.notes !== null) {
      patch.notes = body.notes.slice(0, 500);
    }
    if (body.folderId) {
      patch.folder_id = resolvedFolderId;
    }
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ ok: true, savedAd: existing, wasExisting: true });
    }
    const { data: updated, error: updErr } = await supabase
      .from("saved_ads")
      .update(patch)
      .eq("id", existing.id)
      .eq("user_id", user.id)
      .select()
      .single();
    if (updErr) {
      return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, savedAd: updated, wasExisting: true });
  }

  const scrapedArchived =
    "archived_creative_url" in srcAd
      ? (srcAd as { archived_creative_url?: string | null }).archived_creative_url
      : null;

  const insert: Database["public"]["Tables"]["saved_ads"]["Insert"] = {
    user_id: user.id,
    competitor_id: srcAd.competitor_id,
    source_scraped_ad_id: srcAd.id,
    platform: srcAd.platform,
    ad_text: srcAd.ad_text,
    ad_creative_url: srcAd.ad_creative_url,
    archived_creative_url: scrapedArchived?.trim() || null,
    format: srcAd.format,
    ai_extracted_angle: srcAd.ai_extracted_angle,
    funnel_stage: srcAd.funnel_stage,
    raw_payload: srcAd.raw_payload,
    source_first_seen_at: srcAd.first_seen_at,
    source_last_seen_at: srcAd.last_seen_at,
    notes: body.notes != null ? body.notes.slice(0, 500) : null,
    folder_id: resolvedFolderId,
    saved_by_user_id: user.id,
  };

  const { data: inserted, error: insertErr } = await supabase.from("saved_ads").insert(insert).select().single();

  if (insertErr) {
    return NextResponse.json({ ok: false, error: insertErr.message }, { status: 500 });
  }

  const archivedUrl = await archiveSavedAdCreative({
    userId: user.id,
    savedAdId: inserted.id,
    row: {
      id: inserted.id,
      ad_creative_url: inserted.ad_creative_url,
      raw_payload: inserted.raw_payload,
      archived_creative_url: inserted.archived_creative_url,
    },
    scrapedArchivedUrl: scrapedArchived,
  });

  let savedAd = inserted;
  if (archivedUrl && archivedUrl !== inserted.archived_creative_url) {
    const { data: refreshed } = await supabase
      .from("saved_ads")
      .select("*")
      .eq("id", inserted.id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (refreshed) savedAd = refreshed;
  }

  const posthog = getPostHogServerClient();
  if (posthog) {
    const distinctId = (await getPostHogDistinctId()) ?? user.id;
    posthog.capture({
      distinctId,
      event: "ad_saved",
      properties: {
        user_id: user.id,
        platform: srcAd.platform,
        format: srcAd.format,
        competitor_id: srcAd.competitor_id,
      },
    });
  }

  return NextResponse.json({ ok: true, savedAd });
}
