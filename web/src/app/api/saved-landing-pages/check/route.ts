import { NextResponse } from "next/server";
import { z } from "zod";

import { getRequestWorkspace } from "@/lib/team/session-workspace";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bodySchema = z.object({
  competitorId: z.string().uuid(),
  pageIds: z.array(z.string().uuid()).max(200).optional(),
});

/** Returns savedMap: { [landing_pages.id]: saved_landing_pages.id } */
export async function POST(request: Request): Promise<NextResponse> {
  const workspace = await getRequestWorkspace();
  if (!workspace?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { supabase, user, ctx, dataUserId } = workspace;
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 });
  }

  let query = supabase
    .from("saved_landing_pages")
    .select("id, source_landing_page_id")
    .eq("user_id", dataUserId)
    .eq("competitor_id", body.competitorId)
    .not("source_landing_page_id", "is", null);

  if (body.pageIds && body.pageIds.length > 0) {
    query = query.in("source_landing_page_id", body.pageIds);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const savedMap: Record<string, string> = {};
  for (const row of data ?? []) {
    if (row.source_landing_page_id) savedMap[row.source_landing_page_id] = row.id;
  }

  return NextResponse.json({ ok: true, savedMap });
}
