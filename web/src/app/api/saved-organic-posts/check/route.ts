import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveWorkspaceContext } from "@/lib/team/workspace-context";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bodySchema = z.object({
  competitorId: z.string().uuid(),
  postIds: z.array(z.string().uuid()).max(200).optional(),
});

/** Returns savedMap: { [organic_posts.id]: saved_organic_posts.id } */
export async function POST(request: Request): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const ctx = await resolveWorkspaceContext(supabase, user.id);
  const dataUserId = ctx.dataUserId;

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 });
  }

  let query = supabase
    .from("saved_organic_posts")
    .select("id, source_organic_post_id")
    .eq("user_id", dataUserId)
    .eq("competitor_id", body.competitorId)
    .not("source_organic_post_id", "is", null);

  if (body.postIds && body.postIds.length > 0) {
    query = query.in("source_organic_post_id", body.postIds);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const savedMap: Record<string, string> = {};
  for (const row of data ?? []) {
    if (row.source_organic_post_id) savedMap[row.source_organic_post_id] = row.id;
  }

  return NextResponse.json({ ok: true, savedMap });
}
