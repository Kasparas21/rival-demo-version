import { NextResponse } from "next/server";
import { z } from "zod";

import { isTikTokAdActive } from "@/lib/ad-library/count-active-ads";
import { metaLibraryItemLookupKeys, metaScrapedRowMatchesLibraryItemId } from "@/lib/ad-library/meta-library-item-keys";
import { isMetaRunningForLibraryRow } from "@/lib/ad-detail/resolve-meta-ad-killed";
import { isScrapedAdRunning } from "@/lib/ad-library/scraped-ad-lifecycle";
import type { MetaAdCard, TikTokAdCard } from "@/lib/ad-library/normalize";
import { libraryPreviewUrlFromScrapedRow } from "@/lib/saved-ads/library-preview-url";
import { libraryItemIdFromRawPayload, libraryItemKey, savedRowMatchesLibraryItem } from "@/lib/saved-ads/resolve-scraped-ad";
import { isWorkspaceBrandSavedAdsBlocked } from "@/lib/saved-ads/workspace-brand-saved-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bodySchema = z.object({
  competitorId: z.string().uuid(),
  scrapedAdIds: z.array(z.string().uuid()).optional(),
  libraryItems: z
    .array(
      z.object({
        platform: z.string().min(1),
        libraryItemId: z.string().min(1),
      }),
    )
    .optional(),
});

export async function POST(request: Request): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 });
  }

  const competitorId = parsed.competitorId;
  const savedAdsBlocked = await isWorkspaceBrandSavedAdsBlocked(supabase, user.id, competitorId);

  const scrapedAdIds = [...new Set(parsed.scrapedAdIds ?? [])];
  const libraryItems = parsed.libraryItems ?? [];

  const resolvedToScraped: Record<string, string> = {};
  const libraryLifecycle: Record<string, { isRunning: boolean }> = {};
  const libraryPreviewUrls: Record<string, string> = {};

  let lastScrapedAt: string | null = null;
  if (libraryItems.length > 0) {
    const { data: compRow } = await supabase
      .from("saved_competitors")
      .select("last_scraped_at")
      .eq("id", competitorId)
      .eq("user_id", user.id)
      .maybeSingle();
    lastScrapedAt = compRow?.last_scraped_at ?? null;
  }

  if (libraryItems.length > 0) {
    const platformSet = new Set<string>();
    const wantKeys = new Set<string>();
    for (const item of libraryItems) {
      const pl = item.platform.trim().toLowerCase();
      if (!pl) continue;
      platformSet.add(pl);
      wantKeys.add(libraryItemKey(item.platform, item.libraryItemId));
    }

    if (platformSet.size > 0) {
      const { data: candidates, error: candErr } = await supabase
        .from("scraped_ads")
        .select("id, platform, raw_payload, stable_ad_key, last_seen_at, is_active, ad_creative_url")
        .eq("user_id", user.id)
        .eq("competitor_id", competitorId)
        .in("platform", [...platformSet]);

      if (candErr) {
        return NextResponse.json({ ok: false, error: candErr.message }, { status: 500 });
      }

      type CandidateRow = NonNullable<typeof candidates>[number];
      const rowByLibraryKey = new Map<string, CandidateRow>();

      for (const row of candidates ?? []) {
        const payload = row.raw_payload;
        const pl = String(row.platform).trim().toLowerCase();
        const cardId = libraryItemIdFromRawPayload(payload);
        const stableKey =
          typeof row.stable_ad_key === "string" && row.stable_ad_key.trim()
            ? row.stable_ad_key.trim()
            : "";
        const matchIds = new Set<string>();
        if (cardId) matchIds.add(cardId);
        if (stableKey) matchIds.add(stableKey);
        if (pl === "meta" && payload && typeof payload === "object" && !Array.isArray(payload)) {
          for (const alias of metaLibraryItemLookupKeys(payload as MetaAdCard)) {
            matchIds.add(alias);
          }
        }

        const previewUrl = libraryPreviewUrlFromScrapedRow({
          platform: String(row.platform),
          ad_creative_url: row.ad_creative_url ?? null,
          raw_payload: row.raw_payload,
        });

        for (const matchId of matchIds) {
          const key = libraryItemKey(String(row.platform), matchId);
          if (previewUrl && !libraryPreviewUrls[key]) {
            libraryPreviewUrls[key] = previewUrl;
          }
          if (!wantKeys.has(key)) continue;
          if (!rowByLibraryKey.has(key)) {
            rowByLibraryKey.set(key, row);
          }
        }
      }

      for (const item of libraryItems) {
        const pl = item.platform.trim().toLowerCase();
        const key = libraryItemKey(item.platform, item.libraryItemId);
        if (!wantKeys.has(key)) continue;

        let row = rowByLibraryKey.get(key);
        if (!row && pl === "meta") {
          for (const candidate of candidates ?? []) {
            if (String(candidate.platform).trim().toLowerCase() !== "meta") continue;
            const payload = candidate.raw_payload;
            if (!payload || typeof payload !== "object" || Array.isArray(payload)) continue;
            if (!metaScrapedRowMatchesLibraryItemId(payload as MetaAdCard, item.libraryItemId)) continue;
            row = candidate;
            break;
          }
        }
        if (!row) continue;

        const payload = row.raw_payload;
        const previewUrl = libraryPreviewUrlFromScrapedRow({
          platform: String(row.platform),
          ad_creative_url: row.ad_creative_url ?? null,
          raw_payload: row.raw_payload,
        });
        if (previewUrl && !libraryPreviewUrls[key]) {
          libraryPreviewUrls[key] = previewUrl;
        }
        if (!resolvedToScraped[key]) {
          resolvedToScraped[key] = row.id;
        }
        if (libraryLifecycle[key] == null) {
          let running = false;
          if (
            row.is_active === false &&
            (pl === "meta" || pl === "google" || pl === "youtube" || pl === "tiktok")
          ) {
            running = false;
          } else if (pl === "meta" && payload && typeof payload === "object" && !Array.isArray(payload)) {
            running = isMetaRunningForLibraryRow({
              rawPayload: payload,
              lastSeenAt: row.last_seen_at,
              lastScrapedAt: lastScrapedAt,
              isActiveDb: row.is_active,
            });
          } else if (pl === "tiktok" && payload && typeof payload === "object" && !Array.isArray(payload)) {
            running = isTikTokAdActive(payload as TikTokAdCard);
          } else {
            running = row.is_active === true || isScrapedAdRunning(row.last_seen_at, lastScrapedAt);
          }
          libraryLifecycle[key] = { isRunning: running };
        }
      }
    }
  }

  const allScrapedIds = [...new Set([...scrapedAdIds, ...Object.values(resolvedToScraped)])];

  const savedMap: Record<string, string> = {};

  if (!savedAdsBlocked) {
    if (allScrapedIds.length > 0) {
      const { data: rows, error } = await supabase
        .from("saved_ads")
        .select("id, source_scraped_ad_id")
        .eq("user_id", user.id)
        .in("source_scraped_ad_id", allScrapedIds);

      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }

      for (const row of rows ?? []) {
        if (row.source_scraped_ad_id) {
          savedMap[row.source_scraped_ad_id] = row.id;
        }
      }
    }

    if (libraryItems.length > 0) {
      const { data: savedRows, error: savedErr } = await supabase
        .from("saved_ads")
        .select("id, source_scraped_ad_id, platform, raw_payload")
        .eq("user_id", user.id)
        .eq("competitor_id", competitorId);

      if (savedErr) {
        return NextResponse.json({ ok: false, error: savedErr.message }, { status: 500 });
      }

      for (const item of libraryItems) {
        const key = libraryItemKey(item.platform, item.libraryItemId);
        for (const saved of savedRows ?? []) {
          if (!savedRowMatchesLibraryItem(saved, item)) continue;

          const sid = resolvedToScraped[key]?.trim() || saved.source_scraped_ad_id?.trim();
          if (!sid) continue;

          savedMap[sid] = saved.id;
          if (!resolvedToScraped[key]) {
            resolvedToScraped[key] = sid;
          }
        }
      }
    }
  }

  return NextResponse.json({ ok: true, savedMap, resolvedToScraped, libraryLifecycle, libraryPreviewUrls });
}
