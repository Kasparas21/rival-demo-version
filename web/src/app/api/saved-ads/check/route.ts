import { NextResponse } from "next/server";
import { z } from "zod";

import { isMetaAdActive, isTikTokAdActive } from "@/lib/ad-library/count-active-ads";
import { metaLibraryItemLookupKeys, metaScrapedRowMatchesLibraryItemId } from "@/lib/ad-library/meta-library-item-keys";
import { isScrapedAdRunning } from "@/lib/ad-library/scraped-ad-lifecycle";
import type { MetaAdCard, TikTokAdCard } from "@/lib/ad-library/normalize";
import { libraryPreviewUrlFromScrapedRow } from "@/lib/saved-ads/library-preview-url";
import { libraryItemIdFromRawPayload, libraryItemKey, savedRowMatchesLibraryItem } from "@/lib/saved-ads/resolve-scraped-ad";
import { isWorkspaceBrandSavedAdsBlocked } from "@/lib/saved-ads/workspace-brand-saved-access";
import { getRequestWorkspace } from "@/lib/team/session-workspace";
import { workspaceReadClient } from "@/lib/team/workspace-read-client";

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

function winnerLibraryKeysFromScrapedRow(
  platform: string,
  row: { raw_payload: unknown; stable_ad_key: string | null },
): string[] {
  const keys = new Set<string>();
  const pl = platform.trim().toLowerCase();
  const cardId = libraryItemIdFromRawPayload(row.raw_payload);
  if (cardId) keys.add(libraryItemKey(pl, cardId));
  const stableKey = typeof row.stable_ad_key === "string" ? row.stable_ad_key.trim() : "";
  if (stableKey) keys.add(libraryItemKey(pl, stableKey));
  if (pl === "meta" && row.raw_payload && typeof row.raw_payload === "object" && !Array.isArray(row.raw_payload)) {
    for (const alias of metaLibraryItemLookupKeys(row.raw_payload as MetaAdCard)) {
      keys.add(libraryItemKey(pl, alias));
    }
  }
  return [...keys];
}

export async function POST(request: Request): Promise<NextResponse> {
  const workspace = await getRequestWorkspace();
  if (!workspace) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = workspaceReadClient(workspace);
  const { user, ctx, dataUserId } = workspace;
  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 });
  }

  const competitorId = parsed.competitorId;
  const savedAdsBlocked = await isWorkspaceBrandSavedAdsBlocked(db, dataUserId, competitorId);

  const scrapedAdIds = [...new Set(parsed.scrapedAdIds ?? [])];
  const libraryItems = parsed.libraryItems ?? [];

  const resolvedToScraped: Record<string, string> = {};
  const libraryLifecycle: Record<string, { isRunning: boolean }> = {};
  const libraryPreviewUrls: Record<string, string> = {};

  let lastScrapedAt: string | null = null;
  if (libraryItems.length > 0) {
    const { data: compRow } = await db
      .from("saved_competitors")
      .select("last_scraped_at")
      .eq("id", competitorId)
      .eq("user_id", dataUserId)
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
      const { data: candidates, error: candErr } = await db
        .from("scraped_ads")
        .select("id, platform, raw_payload, stable_ad_key, last_seen_at, is_active, ad_creative_url")
        .eq("user_id", dataUserId)
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
          const scrapeMs = lastScrapedAt ? Date.parse(lastScrapedAt) : Number.NaN;
          const scrapeAtMs = Number.isFinite(scrapeMs) ? scrapeMs : undefined;
          let running = false;
          if (pl === "meta" && payload && typeof payload === "object" && !Array.isArray(payload)) {
            running = isMetaAdActive(payload as MetaAdCard, scrapeAtMs);
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
      const { data: rows, error } = await db
        .from("saved_ads")
        .select("id, source_scraped_ad_id")
        .eq("user_id", dataUserId)
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
      const { data: savedRows, error: savedErr } = await db
        .from("saved_ads")
        .select("id, source_scraped_ad_id, platform, raw_payload")
        .eq("user_id", dataUserId)
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

  const winnerScrapedAdIds: string[] = [];
  const winnerLibraryKeysSet = new Set<string>();

  const { data: winnerTests, error: winnerTestsErr } = await db
    .from("creative_tests")
    .select("winner_ad_id")
    .eq("user_id", dataUserId)
    .eq("competitor_id", competitorId)
    .not("winner_ad_id", "is", null);

  if (winnerTestsErr) {
    return NextResponse.json({ ok: false, error: winnerTestsErr.message }, { status: 500 });
  }

  const winnerIds = [
    ...new Set(
      (winnerTests ?? [])
        .map((t) => t.winner_ad_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  ];

  if (winnerIds.length > 0) {
    const { data: winnerRows, error: winnerRowsErr } = await db
      .from("scraped_ads")
      .select("id, platform, raw_payload, stable_ad_key")
      .eq("user_id", dataUserId)
      .eq("competitor_id", competitorId)
      .in("id", winnerIds);

    if (winnerRowsErr) {
      return NextResponse.json({ ok: false, error: winnerRowsErr.message }, { status: 500 });
    }

    for (const row of winnerRows ?? []) {
      winnerScrapedAdIds.push(row.id);
      for (const key of winnerLibraryKeysFromScrapedRow(String(row.platform), row)) {
        winnerLibraryKeysSet.add(key);
      }
    }
  }

  return NextResponse.json({
    ok: true,
    savedMap,
    resolvedToScraped,
    libraryLifecycle,
    libraryPreviewUrls,
    winnerScrapedAdIds,
    winnerLibraryKeys: [...winnerLibraryKeysSet],
  });
}
