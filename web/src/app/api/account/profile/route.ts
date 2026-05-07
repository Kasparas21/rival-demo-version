import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchPrimaryBrandContext, patchPrimaryBrandForUser } from "@/lib/account/primary-brand-admin";
import { isPlausiblePublicHostname, normalizedWorkspaceHost } from "@/lib/onboarding/host";

import type { Database } from "@/lib/supabase/types";

const PATCH_PROFILE_KEYS = ["full_name", "company_name", "company_url", "avatar_url"] as const;
const MAX_BRAND_CONTEXT_CHARS = 12_000;

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("profiles").select("*").eq("id", user.id).maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json(
      { error: "No profile row yet—try signing out and back in, or contact support." },
      { status: 404 }
    );
  }

  const brand_context = await fetchPrimaryBrandContext(admin, user.id);

  return NextResponse.json({
    ok: true,
    profile: {
      ...data,
      email: data.email ?? user.email ?? null,
      brand_context,
    },
  });
}

export async function PATCH(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const profileUpdate: Record<string, string> = {};
  for (const key of PATCH_PROFILE_KEYS) {
    if (typeof body[key] === "string") {
      profileUpdate[key] = (body[key] as string).trim();
    }
  }

  let brandContextNext: string | null | undefined = undefined;
  if ("brand_context" in body) {
    if (body.brand_context === null) {
      brandContextNext = null;
    } else if (typeof body.brand_context === "string") {
      const trimmed = body.brand_context.trim();
      brandContextNext = trimmed.slice(0, MAX_BRAND_CONTEXT_CHARS);
      if (brandContextNext === "") brandContextNext = null;
    }
  }

  if (Object.keys(profileUpdate).length === 0 && brandContextNext === undefined) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  if (typeof profileUpdate.company_url === "string" && profileUpdate.company_url.length > 0) {
    const host = normalizedWorkspaceHost(profileUpdate.company_url);
    if (!isPlausiblePublicHostname(host)) {
      return NextResponse.json(
        { error: "Company website must look like a real public domain (e.g. acme.com)." },
        { status: 400 }
      );
    }
    profileUpdate.company_url = host;
  }

  let profileRow: ProfileRow | null = null;

  if (Object.keys(profileUpdate).length > 0) {
    const { data, error } = await admin
      .from("profiles")
      .update({ ...profileUpdate, updated_at: new Date().toISOString() })
      .eq("id", user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    profileRow = data;
  } else {
    const { data } = await admin.from("profiles").select("*").eq("id", user.id).maybeSingle();
    profileRow = data;
  }

  if (!profileRow) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const brandPatch: Record<string, string | null> = {};
  if ("company_name" in profileUpdate || "company_url" in profileUpdate) {
    const companyUrl = profileRow.company_url?.trim() ?? "";
    brandPatch.name = profileRow.company_name?.trim() || "My Brand";
    brandPatch.domain = companyUrl ? normalizedWorkspaceHost(companyUrl) : null;
  }
  if (brandContextNext !== undefined) {
    brandPatch.brand_context = brandContextNext;
  }

  if (Object.keys(brandPatch).length > 0) {
    const brandResult = await patchPrimaryBrandForUser(
      admin,
      user.id,
      brandPatch as Database["public"]["Tables"]["brands"]["Update"]
    );
    if (!brandResult.ok) {
      return NextResponse.json({ error: brandResult.error }, { status: 500 });
    }
  }

  const brand_context = await fetchPrimaryBrandContext(admin, user.id);

  return NextResponse.json({
    ok: true,
    profile: {
      ...profileRow,
      email: profileRow.email ?? user.email ?? null,
      brand_context,
    },
  });
}
