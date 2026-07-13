import { NextResponse } from "next/server";

import { rebuildAllAdminUserSnapshots } from "@/lib/admin/rebuild-snapshots";
import { authorizeCron, cronUnauthorizedResponse } from "@/lib/cron/authorize-cron";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Hourly rebuild of admin_user_snapshots for fast admin dashboard queries. */
export async function GET(req: Request) {
  if (!authorizeCron(req)) {
    return cronUnauthorizedResponse();
  }

  try {
    const admin = createSupabaseAdminClient();
    const { count } = await rebuildAllAdminUserSnapshots(admin);
    return NextResponse.json({ ok: true, count });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Snapshot rebuild failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  return GET(req);
}
