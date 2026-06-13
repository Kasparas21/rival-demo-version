import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { adsProfileSetupV1, parseAdsProfileSetup } from "@/lib/onboarding/workspace-ads-setup";
import { syncWorkspaceBrandLibraryContextFromSetup } from "@/lib/account/sync-workspace-brand-library-context";
import { isMissingDbColumnError } from "@/lib/supabase/postgrest-schema-error";
import type { Json } from "@/lib/supabase/types";
import { getBillingEntitlement } from "@/lib/billing/entitlements";
import { tierAllowsMultipleBrandWorkspaces } from "@/lib/billing/plan-limits";

const MISSING_ADS_PROFILE_SETUP_HELP =
  "The database is missing column brands.ads_profile_setup. In the Supabase dashboard open SQL Editor and run: alter table public.brands add column if not exists ads_profile_setup jsonb; Wait a few seconds for the API schema cache to refresh (or reload the project). Full migration: supabase/migrations/20260511120000_brands_ads_workspace_competitor.sql";

function brandsDbErrorResponse(message: string | undefined): NextResponse {
  if (isMissingDbColumnError(message, "ads_profile_setup")) {
    return NextResponse.json(
      { ok: false, error: MISSING_ADS_PROFILE_SETUP_HELP, code: "missing_ads_profile_setup_column" },
      { status: 503 },
    );
  }
  return NextResponse.json({ ok: false, error: message ?? "Database error" }, { status: 500 });
}

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("brands")
    .select("*")
    .eq("user_id", user.id)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) {
    return brandsDbErrorResponse(error.message);
  }

  return NextResponse.json({ ok: true, brands: data ?? [] });
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const entitlement = await getBillingEntitlement(supabase, user.id);
  const maxBrands = entitlement.limits.maxOwnBrandWorkspaces;

  const { count, error: countError } = await admin
    .from("brands")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (!countError && (count ?? 0) >= maxBrands) {
    const message = !tierAllowsMultipleBrandWorkspaces(entitlement.planTier)
      ? entitlement.planTier === "free_trial"
        ? "Free trial includes one brand workspace. Upgrade to Agency to add more brands."
        : "Multiple brand workspaces require the Agency plan. Upgrade to add more brands."
      : `You can add up to ${maxBrands} brand workspaces on your Agency plan.`;
    return NextResponse.json(
      { error: message, code: "brand_workspace_limit" },
      { status: 400 }
    );
  }

  let body: { name?: unknown; domain?: unknown; color?: unknown };
  try {
    body = (await req.json()) as { name?: unknown; domain?: unknown; color?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { data, error } = await admin
    .from("brands")
    .insert({
      user_id: user.id,
      name: typeof body.name === "string" && body.name.trim() ? body.name.trim() : "New Brand",
      domain: typeof body.domain === "string" && body.domain.trim() ? body.domain.trim() : null,
      color: typeof body.color === "string" && body.color.trim() ? body.color.trim() : "#343434",
      is_primary: false,
    })
    .select()
    .single();

  if (error) {
    return brandsDbErrorResponse(error.message);
  }

  return NextResponse.json({ ok: true, brand: data });
}

export async function PATCH(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    id?: unknown;
    ads_profile_setup?: unknown;
    name?: unknown;
    domain?: unknown;
    brand_context?: unknown;
    logo_url?: unknown;
  };
  try {
    body = (await req.json()) as {
      id?: unknown;
      ads_profile_setup?: unknown;
      name?: unknown;
      domain?: unknown;
      brand_context?: unknown;
      logo_url?: unknown;
    };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const rowPatch: {
    ads_profile_setup?: Json;
    name?: string;
    domain?: string | null;
    brand_context?: string | null;
    logo_url?: string | null;
  } = {};

  let parsedAdsSetup: ReturnType<typeof parseAdsProfileSetup> = null;

  if (body.ads_profile_setup !== undefined) {
    const parsed = parseAdsProfileSetup(body.ads_profile_setup);
    if (!parsed) {
      return NextResponse.json({ error: "Invalid ads_profile_setup" }, { status: 400 });
    }
    parsedAdsSetup = parsed;
    rowPatch.ads_profile_setup = adsProfileSetupV1(parsed) as Json;
  }

  if (typeof body.name === "string") {
    rowPatch.name = body.name.trim() || "Brand";
  }
  if (typeof body.domain === "string") {
    rowPatch.domain = body.domain.trim() ? body.domain.trim() : null;
  }
  if (body.brand_context === null || typeof body.brand_context === "string") {
    rowPatch.brand_context =
      body.brand_context == null || !body.brand_context.trim() ? null : body.brand_context.trim();
  }
  if (body.logo_url === null || typeof body.logo_url === "string") {
    rowPatch.logo_url =
      body.logo_url == null || !String(body.logo_url).trim() ? null : String(body.logo_url).trim();
  }

  if (Object.keys(rowPatch).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  const requestedId = typeof body.id === "string" && body.id.trim() ? body.id.trim() : null;

  let targetId: string | null = null;

  if (requestedId) {
    const { data: row, error: selErr } = await admin
      .from("brands")
      .select("id")
      .eq("id", requestedId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (selErr) {
      return NextResponse.json({ error: selErr.message }, { status: 500 });
    }
    if (!row?.id) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }
    targetId = row.id;
  } else {
    const { data: rows, error: selErr } = await admin
      .from("brands")
      .select("id")
      .eq("user_id", user.id)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(1);
    if (selErr) {
      return NextResponse.json({ error: selErr.message }, { status: 500 });
    }
    targetId = rows?.[0]?.id ?? null;
  }

  if (!targetId) {
    const insertName =
      rowPatch.name ??
      (typeof body.name === "string" && body.name.trim() ? body.name.trim() : "My Brand");
    const { error: insErr } = await admin.from("brands").insert({
      user_id: user.id,
      is_primary: true,
      name: insertName,
      domain: rowPatch.domain ?? null,
      color: "#343434",
      brand_context: rowPatch.brand_context ?? null,
      logo_url: rowPatch.logo_url ?? null,
      ...(rowPatch.ads_profile_setup != null ? { ads_profile_setup: rowPatch.ads_profile_setup } : {}),
    });

    if (insErr) {
      return brandsDbErrorResponse(insErr.message);
    }
    return NextResponse.json({ ok: true });
  }

  const { error: updErr } = await admin.from("brands").update(rowPatch).eq("id", targetId).eq("user_id", user.id);

  if (updErr) {
    return brandsDbErrorResponse(updErr.message);
  }

  if (parsedAdsSetup) {
    const { data: brandRow } = await admin
      .from("brands")
      .select("domain, name")
      .eq("id", targetId)
      .eq("user_id", user.id)
      .maybeSingle();
    const domainHint = brandRow?.domain?.trim() || rowPatch.domain?.trim() || "";
    if (domainHint) {
      try {
        await syncWorkspaceBrandLibraryContextFromSetup(
          admin,
          user.id,
          domainHint,
          parsedAdsSetup,
          brandRow?.name ?? rowPatch.name,
          targetId,
        );
      } catch (syncErr) {
        console.error("[brands PATCH] sync workspace library context", syncErr);
      }
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { id?: unknown };
  try {
    body = (await req.json()) as { id?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const targetId = typeof body.id === "string" && body.id.trim() ? body.id.trim() : null;
  if (!targetId) {
    return NextResponse.json({ error: "Brand id is required" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data: brands, error: brandsError } = await admin
    .from("brands")
    .select("id, is_primary, created_at")
    .eq("user_id", user.id)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true });

  if (brandsError) {
    return brandsDbErrorResponse(brandsError.message);
  }

  const rows = brands ?? [];
  const target = rows.find((brand) => brand.id === targetId);
  if (!target) {
    return NextResponse.json({ error: "Brand not found" }, { status: 404 });
  }
  if (rows.length <= 1) {
    return NextResponse.json({ error: "You need at least one brand workspace." }, { status: 400 });
  }

  const replacement = rows.find((brand) => brand.id !== targetId);
  const { error: deleteError } = await admin.from("brands").delete().eq("id", targetId).eq("user_id", user.id);
  if (deleteError) {
    return brandsDbErrorResponse(deleteError.message);
  }

  if (target.is_primary && replacement?.id) {
    const { error: promoteError } = await admin
      .from("brands")
      .update({ is_primary: true })
      .eq("id", replacement.id)
      .eq("user_id", user.id);
    if (promoteError) {
      return brandsDbErrorResponse(promoteError.message);
    }
  }

  return NextResponse.json({ ok: true, nextBrandId: replacement?.id ?? null });
}
