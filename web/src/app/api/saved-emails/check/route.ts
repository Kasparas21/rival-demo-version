import { NextResponse } from "next/server";
import { z } from "zod";

import { savedEmailToCompetitorRow } from "@/lib/saved-emails/snapshot";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveWorkspaceContext } from "@/lib/team/workspace-context";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bodySchema = z.object({
  competitorId: z.string().uuid(),
  emailIds: z.array(z.string().uuid()).optional(),
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

  const ctx = await resolveWorkspaceContext(supabase, user.id);
  const dataUserId = ctx.dataUserId;

  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 });
  }

  const emailIds = [...new Set(parsed.emailIds ?? [])];
  const savedMap: Record<string, string> = {};

  if (emailIds.length === 0) {
    return NextResponse.json({ ok: true, savedMap });
  }

  const { data, error } = await supabase
    .from("saved_emails")
    .select("id, source_competitor_email_id")
    .eq("user_id", dataUserId)
    .eq("competitor_id", parsed.competitorId)
    .in("source_competitor_email_id", emailIds);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  for (const row of data ?? []) {
    if (row.source_competitor_email_id) {
      savedMap[row.source_competitor_email_id] = row.id;
    }
  }

  return NextResponse.json({ ok: true, savedMap });
}
