import { NextResponse } from "next/server";

import { authorizeAdminRequest } from "@/lib/admin/auth";
import { rebuildAdminUserSnapshot } from "@/lib/admin/rebuild-snapshots";
import { getBillingEntitlement } from "@/lib/billing/entitlements";
import { loadLifetimeScrapeOperations, loadMonthlyUsageSnapshot, utcYearMonth } from "@/lib/billing/usage-quotas";
import { getUserActivitySnapshot } from "@/lib/billing/user-activity";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: Request, context: RouteContext) {
  const { id: userId } = await context.params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const auth = await authorizeAdminRequest(req, supabase, user);
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const yearMonth = utcYearMonth();

  const [profileRes, billing, activity, usage, lifetimeScrapes, competitorsRes, quotesRes, brandsRes, snapshotRes] =
    await Promise.all([
      admin.from("profiles").select("*").eq("id", userId).maybeSingle(),
      getBillingEntitlement(admin, userId),
      getUserActivitySnapshot(admin, userId),
      loadMonthlyUsageSnapshot(admin, userId, yearMonth),
      loadLifetimeScrapeOperations(admin, userId),
      admin.from("saved_competitors").select("id, brand_domain, name, created_at, last_scraped_at").eq("user_id", userId),
      admin.from("custom_quotes").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      admin.from("brands").select("id, name, domain, is_primary, created_at").eq("user_id", userId),
      admin.from("admin_user_snapshots").select("*").eq("user_id", userId).maybeSingle(),
    ]);

  if (!profileRes.data) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    profile: profileRes.data,
    billing,
    activity,
    usage: { month: yearMonth, ...usage, lifetimeScrapeOperations: lifetimeScrapes },
    competitors: competitorsRes.data ?? [],
    quotes: quotesRes.data ?? [],
    brands: brandsRes.data ?? [],
    snapshot: snapshotRes.data,
  });
}

export async function POST(req: Request, context: RouteContext) {
  const { id: userId } = await context.params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const auth = await authorizeAdminRequest(req, supabase, user);
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  await rebuildAdminUserSnapshot(admin, userId);
  return NextResponse.json({ ok: true });
}
