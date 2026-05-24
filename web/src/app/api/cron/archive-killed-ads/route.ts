import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { authorizeCron, cronUnauthorizedResponse } from "@/lib/cron/authorize-cron";

export const runtime = "nodejs";

const RETENTION_DAYS = 90;

/** Archives scraped_ads not seen in 90+ days. Bearer CRON_SECRET. */
async function runArchiveKilledAds(req: Request) {
  if (!authorizeCron(req)) {
    return cronUnauthorizedResponse();
  }

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 86_400_000).toISOString();
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin
    .from("scraped_ads")
    .update({ archived_at: new Date().toISOString() })
    .lt("last_seen_at", cutoff)
    .is("archived_at", null)
    .select("id");

  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  const summary = { ok: true, archived: data?.length ?? 0, cutoff };
  console.info("[cron/archive-killed-ads]", summary);
  return Response.json(summary);
}

export async function GET(req: Request) {
  return runArchiveKilledAds(req);
}

export async function POST(req: Request) {
  return runArchiveKilledAds(req);
}
