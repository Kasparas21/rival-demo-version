import { NextResponse } from "next/server";

import { authorizeCron } from "@/lib/cron/authorize-cron";
import { runAutopilotReport } from "@/lib/autopilot/run-autopilot-report";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 300;

async function handleAutopilotReport(req: Request): Promise<NextResponse> {
  if (!authorizeCron(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const testMode = url.searchParams.get("test") === "1";
  const testUserId = url.searchParams.get("userId")?.trim() || null;

  const admin = createSupabaseAdminClient();
  const summary = await runAutopilotReport({ admin, testMode, testUserId });
  return NextResponse.json(summary);
}

export async function GET(req: Request): Promise<NextResponse> {
  return handleAutopilotReport(req);
}

export async function POST(req: Request): Promise<NextResponse> {
  return handleAutopilotReport(req);
}
