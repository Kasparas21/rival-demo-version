import { NextResponse } from "next/server";

import { authorizeAdminRequest } from "@/lib/admin/auth";
import { rebuildAllAdminUserSnapshots } from "@/lib/admin/rebuild-snapshots";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SNAPSHOT_STALE_MS = 30 * 60 * 1000;

/** Refresh pre-aggregated admin rows on demand (no hourly Vercel cron on Hobby). */
async function maybeRefreshAdminSnapshots(admin: ReturnType<typeof createSupabaseAdminClient>) {
  const { data } = await admin
    .from("admin_user_snapshots")
    .select("snapshot_at")
    .order("snapshot_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const latestAt = data?.snapshot_at ? Date.parse(data.snapshot_at) : null;
  const isEmpty = latestAt === null || Number.isNaN(latestAt);
  const isStale = !isEmpty && Date.now() - latestAt > SNAPSHOT_STALE_MS;

  if (isEmpty) {
    await rebuildAllAdminUserSnapshots(admin);
    return;
  }
  if (isStale) {
    void rebuildAllAdminUserSnapshots(admin).catch((e) => {
      console.error("[admin] background snapshot rebuild", e);
    });
  }
}

export async function GET(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const auth = await authorizeAdminRequest(req, supabase, user);
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim().toLowerCase() ?? "";
  const filter = url.searchParams.get("filter")?.trim() ?? "";
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") ?? "100") || 100));
  const offset = Math.max(0, Number(url.searchParams.get("offset") ?? "0") || 0);

  const admin = createSupabaseAdminClient();
  await maybeRefreshAdminSnapshots(admin);

  let query = admin
    .from("admin_user_snapshots")
    .select("*", { count: "exact" })
    .order("snapshot_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (q) {
    query = query.or(`email.ilike.%${q}%,company_name.ilike.%${q}%`);
  }

  if (filter === "inactive") {
    query = query.gte("days_inactive", 7);
  } else if (filter === "scrape_paused") {
    query = query.eq("scrape_paused", true);
  } else if (filter === "suspended") {
    query = query.eq("account_suspended", true);
  } else if (filter === "awaiting_quote") {
    query = query.in("custom_quote_status", ["draft", "null"]).neq("plan_tier", "custom");
  } else if (filter === "quote_sent") {
    query = query.eq("custom_quote_status", "sent");
  } else if (filter === "active") {
    query = query.in("billing_status", ["active", "trialing"]);
  }

  const { data, error, count } = await query;
  if (error) {
    // Snapshots table may be empty before first cron run — fall back to profiles list.
    if (error.message.includes("admin_user_snapshots")) {
      const { data: profiles, error: profileError } = await admin
        .from("profiles")
        .select("id, email, company_name, onboarding_completed, last_active_date, created_at")
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);
      if (profileError) {
        return NextResponse.json({ error: profileError.message }, { status: 500 });
      }
      const rows = (profiles ?? []).map((p) => ({
        user_id: p.id,
        email: p.email,
        company_name: p.company_name,
        onboarding_completed: p.onboarding_completed ?? false,
        last_active_date: p.last_active_date,
        profile_created_at: p.created_at,
        competitor_count: 0,
        ads_scraped_month: 0,
        mrr_cents: 0,
        days_inactive: 0,
        scrape_paused: false,
        funnel_stage: "signed_up",
        plan_tier: null,
        billing_status: null,
        custom_quote_status: null,
      }));
      return NextResponse.json({
        ok: true,
        count: rows.length,
        rows,
        snapshotsMissing: true,
      });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    count: count ?? 0,
    rows: data ?? [],
  });
}
