import { NextResponse } from "next/server";
import { z } from "zod";

import { libraryItemIdFromRawPayload, libraryItemKey } from "@/lib/saved-ads/resolve-scraped-ad";
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
  const scrapedAdIds = [...new Set(parsed.scrapedAdIds ?? [])];
  const libraryItems = parsed.libraryItems ?? [];

  const resolvedToScraped: Record<string, string> = {};

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
        .select("id, platform, raw_payload")
        .eq("user_id", user.id)
        .eq("competitor_id", competitorId)
        .in("platform", [...platformSet]);

      if (candErr) {
        return NextResponse.json({ ok: false, error: candErr.message }, { status: 500 });
      }

      for (const row of candidates ?? []) {
        const cardId = libraryItemIdFromRawPayload(row.raw_payload);
        if (!cardId) continue;
        const key = libraryItemKey(String(row.platform), cardId);
        if (wantKeys.has(key) && !resolvedToScraped[key]) {
          resolvedToScraped[key] = row.id;
        }
      }
    }
  }

  const allScrapedIds = [...new Set([...scrapedAdIds, ...Object.values(resolvedToScraped)])];

  if (allScrapedIds.length === 0) {
    return NextResponse.json({ ok: true, savedMap: {}, resolvedToScraped });
  }

  const { data: rows, error } = await supabase
    .from("saved_ads")
    .select("id, source_scraped_ad_id")
    .eq("user_id", user.id)
    .in("source_scraped_ad_id", allScrapedIds);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const savedMap: Record<string, string> = {};
  for (const row of rows ?? []) {
    if (row.source_scraped_ad_id) {
      savedMap[row.source_scraped_ad_id] = row.id;
    }
  }

  return NextResponse.json({ ok: true, savedMap, resolvedToScraped });
}
