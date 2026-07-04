import { NextResponse } from "next/server";

import { revokeRefreshTokensForUserClient } from "@/lib/mcp/oauth/refresh-tokens";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ clientId: string }> };

export async function DELETE(_req: Request, context: RouteContext): Promise<NextResponse> {
  const { clientId } = await context.params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    await revokeRefreshTokensForUserClient(user.id, decodeURIComponent(clientId));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "revoke_failed" },
      { status: 500 },
    );
  }
}
