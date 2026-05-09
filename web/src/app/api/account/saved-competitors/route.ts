import { NextResponse } from "next/server";
import { ensureUserProfile } from "@/lib/auth/profile";
import type { SavedCompetitorPayload } from "@/lib/account/types";
import { getBillingEntitlement } from "@/lib/billing/entitlements";
import { isMissingDbColumnError } from "@/lib/supabase/postgrest-schema-error";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MAX_WATCHED_COMPETITORS, normalizeCompetitorSlug } from "@/lib/sidebar-competitors";

function normalizeCompetitor(input: SavedCompetitorPayload): SavedCompetitorPayload {
  const base: SavedCompetitorPayload = {
    slug: input.slug.trim().toLowerCase(),
    name: input.name.trim(),
    logoUrl: input.logoUrl?.trim() || undefined,
    pending: Boolean(input.pending),
    brand:
      input.brand?.name && input.brand.domain
        ? {
            name: input.brand.name.trim(),
            domain: input.brand.domain.trim().toLowerCase(),
            logoUrl: input.brand.logoUrl?.trim() || undefined,
          }
        : undefined,
  };
  if (input.isWorkspaceBrand === true) {
    return { ...base, isWorkspaceBrand: true };
  }
  return base;
}

async function getAuthenticatedUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { supabase, user: null };
  }

  await ensureUserProfile(supabase, user);
  return { supabase, user };
}

export async function GET() {
  const { supabase, user } = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ competitors: [] });
  }

  const { data, error } = await supabase
    .from("saved_competitors")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(MAX_WATCHED_COMPETITORS + 4);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const competitors = (data ?? []).map((row) => ({
    slug: row.slug,
    name: row.name,
    ...(row.logo_url ? { logoUrl: row.logo_url } : {}),
    ...(row.brand_name && row.brand_domain
      ? {
          brand: {
            name: row.brand_name,
            domain: row.brand_domain,
            ...(row.brand_logo_url ? { logoUrl: row.brand_logo_url } : {}),
          },
        }
      : {}),
    pending: row.pending,
    ...(row.last_scraped_at ? { lastScrapedAt: row.last_scraped_at } : {}),
    ...(row.is_workspace_brand === true ? { isWorkspaceBrand: true } : {}),
  }));

  return NextResponse.json({ competitors });
}

type ExistingRowMeta = {
  slug: string;
  logo_url: string | null;
  brand_logo_url: string | null;
  is_workspace_brand?: boolean | null;
};

type ServerSupabase = Awaited<ReturnType<typeof createSupabaseServerClient>>;

async function fetchExistingSavedRows(
  supabase: ServerSupabase,
  userId: string
): Promise<{ ok: true; rows: ExistingRowMeta[]; workspaceBrandColumnSupported: boolean } | { ok: false; error: string }> {
  const withWs = await supabase
    .from("saved_competitors")
    .select("slug, logo_url, brand_logo_url, is_workspace_brand")
    .eq("user_id", userId);

  if (!withWs.error) {
    return {
      ok: true,
      rows: (withWs.data ?? []) as ExistingRowMeta[],
      workspaceBrandColumnSupported: true,
    };
  }
  if (!isMissingDbColumnError(withWs.error.message, "is_workspace_brand")) {
    return { ok: false, error: withWs.error.message };
  }

  const noWs = await supabase.from("saved_competitors").select("slug, logo_url, brand_logo_url").eq("user_id", userId);

  if (noWs.error) {
    return { ok: false, error: noWs.error.message };
  }

  return {
    ok: true,
    rows: (noWs.data ?? []).map((r) => ({
      ...(r as ExistingRowMeta),
      is_workspace_brand: false,
    })),
    workspaceBrandColumnSupported: false,
  };
}

function buildUpsertRows(params: {
  items: SavedCompetitorPayload[];
  existingRows: ExistingRowMeta[];
  userId: string;
  workspaceBrandColumnSupported: boolean;
}) {
  const { items, existingRows, userId, workspaceBrandColumnSupported } = params;

  const existingBySlug = new Map(
    existingRows.map((r) => {
      const s = normalizeCompetitorSlug(String(r.slug ?? ""));
      return [
        s,
        {
          logo_url: r.logo_url,
          brand_logo_url: r.brand_logo_url,
          is_workspace_brand: Boolean(r.is_workspace_brand),
        },
      ] as const;
    })
  );

  return items.map((item) => {
    const slug = normalizeCompetitorSlug(item.slug);
    const prior = existingBySlug.get(slug);
    const logo_url = item.logoUrl?.trim() ? item.logoUrl.trim() : prior?.logo_url ?? null;
    const brand_logo_url = item.brand?.logoUrl?.trim()
      ? item.brand.logoUrl.trim()
      : prior?.brand_logo_url ?? null;

    const is_workspace_brand =
      item.isWorkspaceBrand === true ? true : (prior?.is_workspace_brand ?? false);

    const base = {
      user_id: userId,
      slug,
      name: item.name,
      logo_url,
      brand_name: item.brand?.name ?? null,
      brand_domain: item.brand?.domain ?? null,
      brand_logo_url,
      pending: item.pending ?? false,
      updated_at: new Date().toISOString(),
    };
    return workspaceBrandColumnSupported ? { ...base, is_workspace_brand } : base;
  });
}

export async function POST(request: Request) {
  const { supabase, user } = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const entitlement = await getBillingEntitlement(supabase, user.id);
  if (!entitlement.hasAccess) {
    return NextResponse.json(
      {
        ok: false,
        code: "subscription_required",
        error: "Start your subscription to save monitored competitors.",
        checkoutUrl: "/checkout",
      },
      { status: 402 },
    );
  }
  const maxWatchedCompetitors = entitlement.limits.maxWatchedCompetitors;

  const body = (await request.json()) as {
    competitor?: SavedCompetitorPayload;
    competitors?: SavedCompetitorPayload[];
  };

  const payload = Array.isArray(body.competitors)
    ? body.competitors
    : body.competitor
      ? [body.competitor]
      : [];

  if (payload.length === 0) {
    return NextResponse.json({ error: "No competitors provided" }, { status: 400 });
  }

  const normalizedRaw = payload.map(normalizeCompetitor).filter((item) => item.slug && item.name);
  const workspaceItems = normalizedRaw.filter((item) => item.isWorkspaceBrand === true);
  const competitorItemsRaw = normalizedRaw.filter((item) => item.isWorkspaceBrand !== true);

  if (workspaceItems.length > 1) {
    return NextResponse.json({ error: "At most one workspace brand competitor is allowed." }, { status: 400 });
  }

  const existingResult = await fetchExistingSavedRows(supabase, user.id);
  if (!existingResult.ok) {
    return NextResponse.json({ error: existingResult.error }, { status: 500 });
  }
  const { rows: existingList, workspaceBrandColumnSupported } = existingResult;

  /** Watched rivals only (workspace slug does not consume a competitor slot once `is_workspace_brand` exists). */
  const slugCountIfApplied = (): number => {
    const s = new Set<string>();
    for (const r of existingList) {
      if (!(workspaceBrandColumnSupported && r.is_workspace_brand)) {
        s.add(normalizeCompetitorSlug(String(r.slug ?? "")));
      }
    }
    for (const c of competitorItemsRaw) {
      s.add(normalizeCompetitorSlug(c.slug));
    }
    return s.size;
  };

  if (!entitlement.isUnlimited && slugCountIfApplied() > maxWatchedCompetitors) {
    return NextResponse.json(
      {
        error: `You can watch at most ${maxWatchedCompetitors} competitors. Remove one to add another.`,
      },
      { status: 400 }
    );
  }

  let mergeRowsAgainst: ExistingRowMeta[] = existingList;

  if (workspaceItems.length === 1) {
    const wsSlug = normalizeCompetitorSlug(workspaceItems[0]!.slug);
    let delWs;
    if (workspaceBrandColumnSupported) {
      delWs = await supabase
        .from("saved_competitors")
        .delete()
        .eq("user_id", user.id)
        .eq("is_workspace_brand", true);
    } else {
      delWs = await supabase.from("saved_competitors").delete().eq("user_id", user.id).eq("slug", wsSlug);
    }
    if (delWs.error) {
      return NextResponse.json({ error: delWs.error.message }, { status: 500 });
    }

    const rows = buildUpsertRows({
      items: [workspaceItems[0]!],
      existingRows: [],
      userId: user.id,
      workspaceBrandColumnSupported,
    });
    const insertRes = await supabase.from("saved_competitors").insert(rows);
    if (insertRes.error) {
      return NextResponse.json({ error: insertRes.error.message }, { status: 500 });
    }

    const refetch = await fetchExistingSavedRows(supabase, user.id);
    if (!refetch.ok) {
      return NextResponse.json({ error: refetch.error }, { status: 500 });
    }
    mergeRowsAgainst = refetch.rows;
  }

  if (competitorItemsRaw.length > 0) {
    const rows = buildUpsertRows({
      items: competitorItemsRaw,
      existingRows: mergeRowsAgainst,
      userId: user.id,
      workspaceBrandColumnSupported,
    });
    const { error } = await supabase.from("saved_competitors").upsert(rows, {
      onConflict: "user_id,slug",
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const { supabase, user } = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { slug?: unknown; cacheDomain?: unknown };
  try {
    body = (await request.json()) as { slug?: unknown; cacheDomain?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body.slug !== "string" || !body.slug.trim()) {
    return NextResponse.json({ error: "slug is required" }, { status: 400 });
  }

  const slug = normalizeCompetitorSlug(body.slug);
  let cacheDomain = slug;

  const selWs = await supabase
    .from("saved_competitors")
    .select("slug, brand_domain, is_workspace_brand")
    .eq("user_id", user.id)
    .eq("slug", slug)
    .maybeSingle();

  let existing: {
    slug?: string;
    brand_domain?: string | null;
    is_workspace_brand?: boolean;
  } | null = null;

  if (!selWs.error) {
    existing = selWs.data;
  } else if (isMissingDbColumnError(selWs.error.message, "is_workspace_brand")) {
    const selLegacy = await supabase
      .from("saved_competitors")
      .select("slug, brand_domain")
      .eq("user_id", user.id)
      .eq("slug", slug)
      .maybeSingle();
    if (selLegacy.error) {
      return NextResponse.json({ error: selLegacy.error.message }, { status: 500 });
    }
    existing = selLegacy.data;
  } else {
    return NextResponse.json({ error: selWs.error.message }, { status: 500 });
  }

  if (existing?.is_workspace_brand) {
    return NextResponse.json(
      { error: "Your workspace brand cannot be removed as a competitor. Manage it under brand settings instead." },
      { status: 403 },
    );
  }

  if (existing?.brand_domain?.trim()) {
    cacheDomain = normalizeCompetitorSlug(existing.brand_domain);
  } else if (existing?.slug?.trim()) {
    cacheDomain = normalizeCompetitorSlug(existing.slug);
  } else if (typeof body.cacheDomain === "string" && body.cacheDomain.trim()) {
    cacheDomain = normalizeCompetitorSlug(body.cacheDomain);
  }

  const { error: delSavedError } = await supabase
    .from("saved_competitors")
    .delete()
    .eq("user_id", user.id)
    .eq("slug", slug);

  if (delSavedError) {
    return NextResponse.json({ error: delSavedError.message }, { status: 500 });
  }

  const [adsRes, stratRes] = await Promise.all([
    supabase.from("ads_cache").delete().eq("user_id", user.id).eq("competitor_domain", cacheDomain),
    supabase
      .from("strategy_overview_cache")
      .delete()
      .eq("user_id", user.id)
      .eq("competitor_domain", cacheDomain),
  ]);

  const warnings: string[] = [];
  if (adsRes.error) warnings.push(adsRes.error.message);
  if (stratRes.error) warnings.push(stratRes.error.message);

  return NextResponse.json({
    ok: true,
    hadSavedRow: Boolean(existing),
    cacheDomainPurged: cacheDomain,
    ...(warnings.length > 0 ? { warnings } : {}),
  });
}
