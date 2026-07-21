import { NextResponse } from "next/server";
import { z } from "zod";

import { getRequestWorkspace } from "@/lib/team/session-workspace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.union([
  z.object({ all: z.literal(true) }),
  z.object({ ids: z.array(z.string().uuid()).min(1) }),
]);

export async function POST(req: Request): Promise<NextResponse> {
  const workspace = await getRequestWorkspace();
  if (!workspace?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { supabase, user, ctx, dataUserId } = workspace;

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }

  let query = supabase
    .from("competitor_alerts")
    .update({ is_read: true })
    .eq("user_id", dataUserId)
    .eq("is_read", false);

  if ("ids" in body) {
    query = query.in("id", body.ids);
  }

  const { error } = await query;

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
