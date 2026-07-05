import { NextResponse } from "next/server";

import { isAutopilotDevFireAllowed } from "@/lib/autopilot/is-autopilot-dev-fire-allowed";
import { runDevAutopilotWatchSlack } from "@/lib/autopilot/run-dev-autopilot-watch-slack";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_DEV_FIRES_PER_HOUR = 30;

export async function POST(req: Request): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  if (!isAutopilotDevFireAllowed(user.email)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  let relaxSensitivity = true;
  try {
    const body = (await req.json()) as { relaxSensitivity?: boolean };
    if (body.relaxSensitivity === false) relaxSensitivity = false;
  } catch {
    /* default relax */
  }

  const admin = createSupabaseAdminClient();
  const hourAgo = new Date(Date.now() - 3_600_000).toISOString();
  const { count } = await admin
    .from("autopilot_outputs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .like("dedupe_key", "dev_slack:%")
    .gte("created_at", hourAgo);

  if ((count ?? 0) >= MAX_DEV_FIRES_PER_HOUR) {
    return NextResponse.json({ ok: false, error: "Dev fire limit: 30 per hour" }, { status: 429 });
  }

  const result = await runDevAutopilotWatchSlack({
    admin,
    userId: user.id,
    relaxSensitivity,
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error ?? "failed", sent: result.sent, blockCount: result.blockCount, preview: result.preview },
      { status: 502 },
    );
  }

  return NextResponse.json({ ...result, ok: true });
}
