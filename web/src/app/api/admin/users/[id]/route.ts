import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { deleteUserAccount } from "@/lib/account/delete-user-account";
import { adminCanWrite, authorizeAdminRequest } from "@/lib/admin/auth";
import { loadAdminUserUsageDetail } from "@/lib/admin/load-user-usage-detail";
import { rebuildAdminUserSnapshot } from "@/lib/admin/rebuild-snapshots";
import { getBillingEntitlement, type AdminAdsScrapeMode } from "@/lib/billing/entitlements";
import { normalizePlanTier, type PlanTier } from "@/lib/billing/plan-limits";
import { loadLifetimeScrapeOperations, loadMonthlyUsageSnapshot, utcYearMonth } from "@/lib/billing/usage-quotas";
import { getUserActivitySnapshot } from "@/lib/billing/user-activity";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/lib/supabase/types";

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

  const [
    profileRes,
    billing,
    activity,
    usage,
    lifetimeScrapes,
    competitorsRes,
    quotesRes,
    brandsRes,
    snapshotRes,
    usageDetail,
  ] = await Promise.all([
    admin.from("profiles").select("*").eq("id", userId).maybeSingle(),
    getBillingEntitlement(admin, userId),
    getUserActivitySnapshot(admin, userId),
    loadMonthlyUsageSnapshot(admin, userId, yearMonth),
    loadLifetimeScrapeOperations(admin, userId),
    admin.from("saved_competitors").select("id, brand_domain, name, created_at, last_scraped_at").eq("user_id", userId),
    admin.from("custom_quotes").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    admin.from("brands").select("id, name, domain, is_primary, created_at").eq("user_id", userId),
    admin.from("admin_user_snapshots").select("*").eq("user_id", userId).maybeSingle(),
    loadAdminUserUsageDetail(admin, userId),
  ]);

  if (!profileRes.data) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    profile: profileRes.data,
    billing,
    adsScrapeMode: billing.adminAdsScrapeMode,
    activity,
    usage: { month: yearMonth, ...usage, lifetimeScrapeOperations: lifetimeScrapes },
    competitors: competitorsRes.data ?? [],
    quotes: quotesRes.data ?? [],
    brands: brandsRes.data ?? [],
    snapshot: snapshotRes.data,
    usageDetail,
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

type UpdateUserBody = {
  profile?: {
    email?: string | null;
    full_name?: string | null;
    company_name?: string | null;
    company_url?: string | null;
    company_role?: string | null;
    onboarding_completed?: boolean;
  };
  /** Plan tier to force for this user; `null` clears the override (back to Polar-derived plan). */
  planTier?: string | null;
  adsScrapeMode?: AdminAdsScrapeMode;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sanitizeText(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || null;
}

async function applyAdminPlanOverride(
  admin: SupabaseClient<Database>,
  userId: string,
  tier: PlanTier | null,
): Promise<string | null> {
  const { data: existing } = await admin
    .from("billing_subscriptions")
    .select("raw_payload, polar_product_id, polar_subscription_id, status")
    .eq("user_id", userId)
    .maybeSingle();

  const payload =
    typeof existing?.raw_payload === "object" && existing.raw_payload !== null && !Array.isArray(existing.raw_payload)
      ? { ...(existing.raw_payload as Record<string, unknown>) }
      : {};

  if (tier === null) {
    delete payload.admin_plan_override;
  } else {
    payload.admin_plan_override = tier;
  }

  // Hidden complimentary flags (tester invite / dev switcher) bypass Polar and keep unlimited scrapes.
  // The plan dropdown is the source of truth — clear them whenever an admin edits the plan.
  delete payload.admin_unlimited;
  delete payload.dev_plan_override;

  let status = existing?.status ?? "none";
  if (tier === "free_trial") {
    status = "none";
  } else if (tier !== null) {
    status = "active";
  } else if (existing?.polar_product_id === "admin-override" || !existing) {
    // Clearing an override on a row that only exists because of the override → back to free trial.
    status = "none";
  }

  const { error } = await admin.from("billing_subscriptions").upsert(
    {
      user_id: userId,
      polar_product_id: existing?.polar_product_id ?? "admin-override",
      status,
      raw_payload: payload as Json,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  return error?.message ?? null;
}

async function applyAdminAdsScrapeMode(
  admin: SupabaseClient<Database>,
  userId: string,
  mode: AdminAdsScrapeMode,
): Promise<string | null> {
  const { data: existing } = await admin
    .from("billing_subscriptions")
    .select("raw_payload, polar_product_id, status")
    .eq("user_id", userId)
    .maybeSingle();

  const payload =
    typeof existing?.raw_payload === "object" && existing.raw_payload !== null && !Array.isArray(existing.raw_payload)
      ? { ...(existing.raw_payload as Record<string, unknown>) }
      : {};

  payload.admin_ads_scrape_mode = mode;

  const { error } = await admin.from("billing_subscriptions").upsert(
    {
      user_id: userId,
      polar_product_id: existing?.polar_product_id ?? "admin-override",
      status: existing?.status ?? "none",
      raw_payload: payload as Json,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  return error?.message ?? null;
}

export async function PATCH(req: Request, context: RouteContext) {
  const { id: userId } = await context.params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const auth = await authorizeAdminRequest(req, supabase, user);
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!adminCanWrite(auth.admin.role)) {
    return NextResponse.json({ error: "Read-only admin access" }, { status: 403 });
  }

  let body: UpdateUserBody;
  try {
    body = (await req.json()) as UpdateUserBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  const { data: profile } = await admin.from("profiles").select("id, email").eq("id", userId).maybeSingle();
  if (!profile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const changes: Record<string, unknown> = {};

  // --- Profile fields ---
  if (body.profile) {
    const profileUpdate: Database["public"]["Tables"]["profiles"]["Update"] = {};

    const email = sanitizeText(body.profile.email);
    if (email !== undefined) {
      if (!email || !EMAIL_RE.test(email)) {
        return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
      }
      const normalizedEmail = email.toLowerCase();
      if (normalizedEmail !== profile.email?.toLowerCase()) {
        const { error: authErr } = await admin.auth.admin.updateUserById(userId, {
          email: normalizedEmail,
          email_confirm: true,
        });
        if (authErr) {
          return NextResponse.json({ error: `Auth email update failed: ${authErr.message}` }, { status: 400 });
        }
        profileUpdate.email = normalizedEmail;
        changes.email = normalizedEmail;
      }
    }

    const fullName = sanitizeText(body.profile.full_name);
    if (fullName !== undefined) {
      profileUpdate.full_name = fullName;
      changes.full_name = fullName;
    }
    const companyName = sanitizeText(body.profile.company_name);
    if (companyName !== undefined) {
      profileUpdate.company_name = companyName;
      changes.company_name = companyName;
    }
    const companyUrl = sanitizeText(body.profile.company_url);
    if (companyUrl !== undefined) {
      profileUpdate.company_url = companyUrl;
      changes.company_url = companyUrl;
    }
    const companyRole = sanitizeText(body.profile.company_role);
    if (companyRole !== undefined) {
      profileUpdate.company_role = companyRole;
      changes.company_role = companyRole;
    }
    if (typeof body.profile.onboarding_completed === "boolean") {
      profileUpdate.onboarding_completed = body.profile.onboarding_completed;
      changes.onboarding_completed = body.profile.onboarding_completed;
    }

    if (Object.keys(profileUpdate).length > 0) {
      profileUpdate.updated_at = new Date().toISOString();
      const { error: profileErr } = await admin.from("profiles").update(profileUpdate).eq("id", userId);
      if (profileErr) {
        return NextResponse.json({ error: `Profile update failed: ${profileErr.message}` }, { status: 500 });
      }
    }
  }

  // --- Plan override ---
  if (body.planTier !== undefined) {
    let tier: PlanTier | null = null;
    if (body.planTier !== null && body.planTier !== "") {
      tier = normalizePlanTier(body.planTier);
      if (!tier) {
        return NextResponse.json({ error: "Invalid plan tier" }, { status: 400 });
      }
    }
    const planErr = await applyAdminPlanOverride(admin, userId, tier);
    if (planErr) {
      return NextResponse.json({ error: `Plan update failed: ${planErr}` }, { status: 500 });
    }
    changes.plan_override = tier;
  }

  if (body.adsScrapeMode !== undefined) {
    if (body.adsScrapeMode !== "auto" && body.adsScrapeMode !== "manual") {
      return NextResponse.json({ error: "Invalid ads scrape mode" }, { status: 400 });
    }
    const modeErr = await applyAdminAdsScrapeMode(admin, userId, body.adsScrapeMode);
    if (modeErr) {
      return NextResponse.json({ error: `Ads scrape mode update failed: ${modeErr}` }, { status: 500 });
    }
    changes.ads_scrape_mode = body.adsScrapeMode;
  }

  if (Object.keys(changes).length === 0) {
    return NextResponse.json({ error: "No changes provided" }, { status: 400 });
  }

  try {
    await admin.from("admin_event_log").insert({
      actor_user_id: user?.id ?? null,
      target_user_id: userId,
      event_type: "admin_user_updated",
      payload: changes as Json,
    });
  } catch (e) {
    console.warn("[admin] event log insert", e);
  }

  try {
    await rebuildAdminUserSnapshot(admin, userId);
  } catch (e) {
    console.warn("[admin] snapshot rebuild after update", e);
  }

  const [updatedProfile, billing] = await Promise.all([
    admin.from("profiles").select("*").eq("id", userId).maybeSingle(),
    getBillingEntitlement(admin, userId),
  ]);

  return NextResponse.json({
    ok: true,
    changes,
    profile: updatedProfile.data,
    billing,
    adsScrapeMode: billing.adminAdsScrapeMode,
  });
}

type DeleteUserBody = { confirm?: unknown };

export async function DELETE(req: Request, context: RouteContext) {
  const { id: userId } = await context.params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const auth = await authorizeAdminRequest(req, supabase, user);
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!adminCanWrite(auth.admin.role)) {
    return NextResponse.json({ error: "Read-only admin access" }, { status: 403 });
  }

  let body: DeleteUserBody = {};
  try {
    body = (await req.json()) as DeleteUserBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.confirm !== "DELETE") {
    return NextResponse.json(
      { error: 'Confirmation required. Send { "confirm": "DELETE" }.' },
      { status: 400 },
    );
  }

  if (user?.id === userId) {
    return NextResponse.json({ error: "You cannot delete your own account from admin." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  const { data: profile } = await admin.from("profiles").select("id, email").eq("id", userId).maybeSingle();
  if (!profile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  try {
    await admin.from("admin_event_log").insert({
      actor_user_id: user?.id ?? null,
      target_user_id: userId,
      event_type: "admin_user_deleted",
      payload: { email: profile.email } as Json,
    });
  } catch (e) {
    console.warn("[admin] event log insert before delete", e);
  }

  const result = await deleteUserAccount(admin, userId);
  if (!result.ok) {
    const status = result.error.includes("billing") ? 502 : 500;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ ok: true });
}
