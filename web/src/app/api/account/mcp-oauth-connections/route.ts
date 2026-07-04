import { NextResponse } from "next/server";

import { listActiveOAuthConnections, revokeRefreshTokensForUserClient } from "@/lib/mcp/oauth/refresh-tokens";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const connections = await listActiveOAuthConnections(user.id);
    return NextResponse.json({ ok: true, connections });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "load_failed" },
      { status: 500 },
    );
  }
}
