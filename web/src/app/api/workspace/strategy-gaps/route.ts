import { NextResponse } from "next/server";

import { buildStrategyGapsPayload } from "@/lib/workspace/build-strategy-gaps";
import { getRequestWorkspace } from "@/lib/team/session-workspace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    const workspace = await getRequestWorkspace();
  if (!workspace) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { supabase, user, ctx, dataUserId } = workspace;

  const url = new URL(req.url);
  const brandId = url.searchParams.get("brandId")?.trim() || null;

  try {
    const payload = await buildStrategyGapsPayload({
      supabase,
      userId: dataUserId,
      brandId,
      userEmail: user?.email ?? null,
    });
    return NextResponse.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to build strategy gaps";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
