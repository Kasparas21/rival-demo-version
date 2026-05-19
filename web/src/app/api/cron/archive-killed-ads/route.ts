import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const RETENTION_DAYS = 90;

/** POST — archives scraped_ads not seen in 90+ days. Bearer CRON_SECRET. */
export async function POST(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
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

  return Response.json({ ok: true, archived: data?.length ?? 0, cutoff });
}
