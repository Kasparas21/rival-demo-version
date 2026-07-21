import { NextResponse } from "next/server";

import { buildStrategyGapsPayload } from "@/lib/workspace/build-strategy-gaps";
import { getRequestWorkspace } from "@/lib/team/session-workspace";
import { workspaceReadClient } from "@/lib/team/workspace-read-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    const workspace = await getRequestWorkspace();
  if (!workspace) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { user, dataUserId } = workspace;
  const db = workspaceReadClient(workspace);

  const url = new URL(req.url);
  const brandId = url.searchParams.get("brandId")?.trim() || null;

  try {
    const payload = await buildStrategyGapsPayload({
      supabase: db,
      userId: dataUserId,
      brandId,
      userEmail: user?.email ?? null,
    });
    const emailGaps = payload.gaps.filter((g) => g.channel === "email");
    return NextResponse.json({
      ok: true,
      gaps: emailGaps,
      computedAt: payload.computedAt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to build email gaps";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
