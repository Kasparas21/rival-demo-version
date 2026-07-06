import { NextResponse } from "next/server";

import { buildStrategyGapsPayload } from "@/lib/workspace/build-strategy-gaps";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const brandId = url.searchParams.get("brandId")?.trim() || null;

  try {
    const payload = await buildStrategyGapsPayload({
      supabase,
      userId: user.id,
      brandId,
    });
    return NextResponse.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to build strategy gaps";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
