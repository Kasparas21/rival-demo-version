import { NextResponse } from "next/server";

import { authorizeAdminRequest } from "@/lib/admin/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const auth = await authorizeAdminRequest(req, supabase, user?.id ?? null);
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim().toLowerCase() ?? "";
  const filter = url.searchParams.get("filter")?.trim() ?? "";
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") ?? "100") || 100));
  const offset = Math.max(0, Number(url.searchParams.get("offset") ?? "0") || 0);

  const admin = createSupabaseAdminClient();
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
  } else if (filter === "awaiting_quote") {
    query = query.in("custom_quote_status", ["draft", "null"]).neq("plan_tier", "custom");
  } else if (filter === "quote_sent") {
    query = query.eq("custom_quote_status", "sent");
  } else if (filter === "active") {
    query = query.in("billing_status", ["active", "trialing"]);
  }

  const { data, error, count } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    count: count ?? 0,
    rows: data ?? [],
  });
}
