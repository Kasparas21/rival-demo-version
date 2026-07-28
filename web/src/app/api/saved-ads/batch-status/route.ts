import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bodySchema = z.object({
  scrapedAdIds: z.array(z.string().uuid()).max(500),
});

/** POST — resolve saved state for many scraped ad ids (discovery feed, etc.). */
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

  const scrapedAdIds = [...new Set(parsed.scrapedAdIds)];
  if (scrapedAdIds.length === 0) {
    return NextResponse.json({ ok: true, savedMap: {} });
  }

  const { data, error } = await supabase
    .from("saved_ads")
    .select("id, source_scraped_ad_id")
    .eq("user_id", user.id)
    .in("source_scraped_ad_id", scrapedAdIds);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const savedMap: Record<string, string> = {};
  for (const row of data ?? []) {
    if (row.source_scraped_ad_id) {
      savedMap[row.source_scraped_ad_id] = row.id;
    }
  }

  return NextResponse.json({ ok: true, savedMap });
}
