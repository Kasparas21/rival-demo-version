import { NextResponse } from "next/server";

import { authorizeCron } from "@/lib/cron/authorize-cron";
import { runAutopilotWatch } from "@/lib/autopilot/run-autopilot-watch";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 300;

async function handleAutopilotWatch(req: Request): Promise<NextResponse> {
  if (!authorizeCron(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const testMode = url.searchParams.get("test") === "1";
  const testUserId = url.searchParams.get("userId")?.trim() || null;

  const admin = createSupabaseAdminClient();
  const summary = await runAutopilotWatch({
    admin,
    testMode,
    testUserId,
  });

  const body: Record<string, unknown> = { ...summary };
  if (process.env.VERCEL === "1") {
    body.note =
      "Vercel cron runs daily at 07:15 UTC. Use ?test=1&userId=<uuid> with CRON_SECRET to process backlog manually.";
  }

  return NextResponse.json(body);
}

export async function GET(req: Request): Promise<NextResponse> {
  return handleAutopilotWatch(req);
}

export async function POST(req: Request): Promise<NextResponse> {
  return handleAutopilotWatch(req);
}
