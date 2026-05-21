import { NextResponse } from "next/server";
import { ensureUserProfile } from "@/lib/auth/profile";
import type { AdsLibraryContextPayload, SavedCompetitorPayload } from "@/lib/account/types";
import { getBillingEntitlement, quotaExceededResponseBody } from "@/lib/billing/entitlements";
import { loadMonthlyUsageSnapshot, utcYearMonth } from "@/lib/billing/usage-quotas";
import { isMissingDbColumnError } from "@/lib/supabase/postgrest-schema-error";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";
import { collectAdsCacheDomainVariantsForSavedCompetitorRow } from "@/lib/ad-library/competitor-cache-domain";
import { MAX_WATCHED_COMPETITORS, normalizeCompetitorSlug, WORKSPACE_BRAND_PLACEHOLDER_SLUG, type SidebarCompetitor, isSidebarRowLikelyWorkspaceBrand } from "@/lib/sidebar-competitors";

function sanitizeAdsLibraryContext(raw: AdsLibraryContextPayload): AdsLibraryContextPayload | null {
  const ids =
    raw.ids && typeof raw.ids === "object" && raw.ids !== null && !Array.isArray(raw.ids)
      ? Object.fromEntries(
          Object.entries(raw.ids).filter(([, v]) => typeof v === "string" && v.trim() !== ""),
        )
      : undefined;
  const channels = Array.isArray(raw.channels)
    ? raw.channels.filter((c): c is string => typeof c === "string" && c.trim() !== "")
    : undefined;
  const confirmed = typeof raw.confirmed === "boolean" ? raw.confirmed : undefined;
  const out: AdsLibraryContextPayload = {};
  if (ids && Object.keys(ids).length > 0) out.ids = ids;
  if (channels && channels.length > 0) out.channels = channels;
  if (confirmed !== undefined) out.confirmed = confirmed;
  if (!out.ids && !out.channels?.length && out.confirmed === undefined) return null;
  return out;
}

function rowToLibraryContext(raw: unknown): SidebarCompetitor["libraryContext"] | undefined {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const idsRaw = o.ids;
  const channelsRaw = o.channels;
  const confirmedRaw = o.confirmed;
  const out: NonNullable<SidebarCompetitor["libraryContext"]> = {};
  if (idsRaw && typeof idsRaw === "object" && !Array.isArray(idsRaw)) {
    const entries = Object.entries(idsRaw).filter(([, v]) => typeof v === "string");
    if (entries.length > 0) out.ids = Object.fromEntries(entries);
  }
  if (Array.isArray(channelsRaw)) {
    const ch = channelsRaw.filter((c): c is string => typeof c === "string");
    if (ch.length > 0) out.channels = ch;
  }
  if (typeof confirmedRaw === "boolean") out.confirmed = confirmedRaw;
  if (out.ids || out.channels?.length || out.confirmed !== undefined) return out;
  return undefined;
}

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
  if (input.adsLibraryContext !== undefined) {
    base.adsLibraryContext =
      input.adsLibraryContext === null ? null : sanitizeAdsLibraryContext(input.adsLibraryContext) ?? null;
  }
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

  const { data: primaryBrand } = await supabase
    .from("brands")
    .select("domain")
    .eq("user_id", user.id)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const workspaceDomain = primaryBrand?.domain?.trim() || null;

  const rows = data ?? [];
  const competitorIdsForWeekly = rows.map((r) => r.id).filter(Boolean);
  const weeklyLatestStartByCompetitor = new Map<string, string>();

  if (competitorIdsForWeekly.length > 0) {
    const { data: weeklyRows, error: weeklyErr } = await supabase
      .from("weekly_scrape_jobs")
      .select("competitor_id, week_start")
      .eq("user_id", user.id)
      .eq("status", "done")
      .in("competitor_id", competitorIdsForWeekly)
      .order("week_start", { ascending: false });

    if (weeklyErr) {
      console.error("[saved-competitors GET] weekly_scrape_jobs", weeklyErr.message);
    } else {
      for (const w of weeklyRows ?? []) {
        if (!weeklyLatestStartByCompetitor.has(w.competitor_id)) {
          weeklyLatestStartByCompetitor.set(w.competitor_id, w.week_start);
        }
      }
    }
  }

  const competitors = rows
    .map((row) => {
      const lc = rowToLibraryContext(row.ads_library_context);
      const weeklyLabel = weeklyLatestStartByCompetitor.get(row.id);
      const base = {
        savedCompetitorDbId: row.id,
        slug: row.slug,
        name: row.name,
        spyOnBrandFollowed: Boolean(row.is_followed ?? false),
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
        ...(lc ? { libraryContext: lc } : {}),
        ...(weeklyLabel ? { lastWeeklyWeekStart: weeklyLabel } : {}),
      };
      return base;
    })
    .filter((row) => !isSidebarRowLikelyWorkspaceBrand(row as SidebarCompetitor, workspaceDomain));

  return NextResponse.json({ competitors });
}

type ExistingRowMeta = {
  slug: string;
  logo_url: string | null;
  brand_logo_url: string | null;
  is_workspace_brand?: boolean | null;
  ads_library_context?: Json | null;
};

type ServerSupabase = Awaited<ReturnType<typeof createSupabaseServerClient>>;

async function deleteWorkspaceBrandPlaceholderRows(
  supabase: ServerSupabase,
  userId: string,
): Promise<void> {
  await supabase
    .from("saved_competitors")
    .delete()
    .eq("user_id", userId)
    .eq("slug", WORKSPACE_BRAND_PLACEHOLDER_SLUG);
}

async function fetchExistingSavedRows(
  supabase: ServerSupabase,
  userId: string
): Promise<
  | { ok: true; rows: ExistingRowMeta[]; workspaceBrandColumnSupported: boolean; adsLibraryContextColumnSupported: boolean }
  | { ok: false; error: string }
> {
  const full = await supabase
    .from("saved_competitors")
    .select("slug, logo_url, brand_logo_url, is_workspace_brand, ads_library_context")
    .eq("user_id", userId);

  if (!full.error) {
    return {
      ok: true,
      rows: (full.data ?? []) as ExistingRowMeta[],
      workspaceBrandColumnSupported: true,
      adsLibraryContextColumnSupported: true,
    };
  }

  if (isMissingDbColumnError(full.error.message, "ads_library_context")) {
    const mid = await supabase
      .from("saved_competitors")
      .select("slug, logo_url, brand_logo_url, is_workspace_brand")
      .eq("user_id", userId);
    if (!mid.error) {
      return {
        ok: true,
        rows: (mid.data ?? []).map((r) => ({ ...r, ads_library_context: null })) as ExistingRowMeta[],
        workspaceBrandColumnSupported: true,
        adsLibraryContextColumnSupported: false,
      };
    }
    if (!isMissingDbColumnError(mid.error.message, "is_workspace_brand")) {
      return { ok: false, error: mid.error.message };
    }
    const leg = await supabase.from("saved_competitors").select("slug, logo_url, brand_logo_url").eq("user_id", userId);
    if (leg.error) return { ok: false, error: leg.error.message };
    return {
      ok: true,
      rows: (leg.data ?? []).map((r) => ({
        ...(r as ExistingRowMeta),
        is_workspace_brand: false,
        ads_library_context: null,
      })),
      workspaceBrandColumnSupported: false,
      adsLibraryContextColumnSupported: false,
    };
  }

  if (isMissingDbColumnError(full.error.message, "is_workspace_brand")) {
    const leg = await supabase.from("saved_competitors").select("slug, logo_url, brand_logo_url").eq("user_id", userId);
    if (leg.error) return { ok: false, error: leg.error.message };
    return {
      ok: true,
      rows: (leg.data ?? []).map((r) => ({
        ...(r as ExistingRowMeta),
        is_workspace_brand: false,
        ads_library_context: null,
      })),
      workspaceBrandColumnSupported: false,
      adsLibraryContextColumnSupported: false,
    };
  }

  return { ok: false, error: full.error.message };
}

function buildUpsertRows(params: {
  items: SavedCompetitorPayload[];
  existingRows: ExistingRowMeta[];
  userId: string;
  workspaceBrandColumnSupported: boolean;
  adsLibraryContextColumnSupported: boolean;
}) {
  const { items, existingRows, userId, workspaceBrandColumnSupported, adsLibraryContextColumnSupported } = params;

  const existingBySlug = new Map(
    existingRows.map((r) => {
      const s = normalizeCompetitorSlug(String(r.slug ?? ""));
      return [
        s,
        {
          logo_url: r.logo_url,
          brand_logo_url: r.brand_logo_url,
          is_workspace_brand: Boolean(r.is_workspace_brand),
          ads_library_context: r.ads_library_context ?? null,
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

    let ads_library_context_val: Json | null;
    if (item.adsLibraryContext !== undefined) {
      ads_library_context_val =
        item.adsLibraryContext === null
          ? null
          : (sanitizeAdsLibraryContext(item.adsLibraryContext) as Json | null);
    } else {
      ads_library_context_val = (prior?.ads_library_context as Json | null) ?? null;
    }

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
      ...(adsLibraryContextColumnSupported ? { ads_library_context: ads_library_context_val } : {}),
    };
    return workspaceBrandColumnSupported ? { ...base, is_workspace_brand } : base;
  });
}

/** After POST upserts, return DB ids immediately so clients can unlock Ad Library clicks without waiting for GET sync. */
async function selectSavedCompetitorIdsBySlug(
  supabase: ServerSupabase,
  userId: string,
  normalizedSlugs: string[]
): Promise<{ slug: string; savedCompetitorDbId: string }[]> {
  if (normalizedSlugs.length === 0) return [];
  const unique = [...new Set(normalizedSlugs)].filter(Boolean);
  const { data, error } = await supabase
    .from("saved_competitors")
    .select("id, slug")
    .eq("user_id", userId)
    .in("slug", unique);
  if (error || !data) return [];
  return data
    .map((row) => ({
      slug: normalizeCompetitorSlug(String(row.slug ?? "")),
      savedCompetitorDbId: String(row.id ?? "").trim(),
    }))
    .filter((r) => r.slug.length > 0 && r.savedCompetitorDbId.length > 0);
}

export async function POST(request: Request) {
  const { supabase, user } = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

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
  if (normalizedRaw.length === 0) {
    return NextResponse.json({ error: "No competitors provided" }, { status: 400 });
  }

  const workspaceItems = normalizedRaw.filter((item) => item.isWorkspaceBrand === true);
  const competitorItemsRaw = normalizedRaw.filter((item) => item.isWorkspaceBrand !== true);

  if (workspaceItems.length > 1) {
    return NextResponse.json({ error: "At most one workspace brand competitor is allowed." }, { status: 400 });
  }

  const entitlement = await getBillingEntitlement(supabase, user.id);
  /** Let new users finish onboarding: persist workspace brand row without a paid plan. Rivals still require access. */
  const workspaceBrandOnly = workspaceItems.length === 1 && competitorItemsRaw.length === 0;
  if (!entitlement.hasAccess && !workspaceBrandOnly) {
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

  const existingResult = await fetchExistingSavedRows(supabase, user.id);
  if (!existingResult.ok) {
    return NextResponse.json({ error: existingResult.error }, { status: 500 });
  }
  const { rows: existingList, workspaceBrandColumnSupported, adsLibraryContextColumnSupported } =
    existingResult;

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
  const slugIdsToReturn = new Set<string>();

  if (workspaceItems.length === 1) {
    const wsSlug = normalizeCompetitorSlug(workspaceItems[0]!.slug);
    await deleteWorkspaceBrandPlaceholderRows(supabase, user.id);
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
      adsLibraryContextColumnSupported,
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
    slugIdsToReturn.add(wsSlug);
  }

  if (competitorItemsRaw.length > 0) {
    const rows = buildUpsertRows({
      items: competitorItemsRaw,
      existingRows: mergeRowsAgainst,
      userId: user.id,
      workspaceBrandColumnSupported,
      adsLibraryContextColumnSupported,
    });
    const { error } = await supabase.from("saved_competitors").upsert(rows, {
      onConflict: "user_id,slug",
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    for (const item of competitorItemsRaw) {
      slugIdsToReturn.add(normalizeCompetitorSlug(item.slug));
    }
  }

  const competitors = await selectSavedCompetitorIdsBySlug(
    supabase,
    user.id,
    [...slugIdsToReturn],
  );

  return NextResponse.json({ ok: true, competitors });
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

  const entitlement = await getBillingEntitlement(supabase, user.id);
  if (existing && !entitlement.isUnlimited && entitlement.limits.maxSwapsPerMonth > 0) {
    const usage = await loadMonthlyUsageSnapshot(supabase, user.id, utcYearMonth());
    if (usage.swapCount >= entitlement.limits.maxSwapsPerMonth) {
      return NextResponse.json(
        quotaExceededResponseBody({
          used: usage.swapCount,
          requested: 1,
          limit: entitlement.limits.maxSwapsPerMonth,
          metric: "competitor swaps",
        }),
        { status: 402 },
      );
    }
  }

  const bodyCacheDomain = typeof body.cacheDomain === "string" && body.cacheDomain.trim() ? body.cacheDomain : undefined;
  let purgeDomains: string[] =
    existing?.slug || existing?.brand_domain
      ? collectAdsCacheDomainVariantsForSavedCompetitorRow(
          { slug: existing?.slug, brand_domain: existing?.brand_domain ?? null },
          bodyCacheDomain ?? null
        )
      : [];
  if (purgeDomains.length === 0) {
    purgeDomains = [
      slug,
      ...(bodyCacheDomain ? [normalizeCompetitorSlug(bodyCacheDomain)] : []),
    ].filter((x, i, a) => Boolean(x?.length) && a.indexOf(x) === i);
  }

  const { error: delSavedError } = await supabase
    .from("saved_competitors")
    .delete()
    .eq("user_id", user.id)
    .eq("slug", slug);

  if (delSavedError) {
    return NextResponse.json({ error: delSavedError.message }, { status: 500 });
  }

  if (existing && !entitlement.isUnlimited) {
    await supabase.rpc("increment_competitor_swap_usage");
  }

  let adsRes: { error: { message: string } | null } = { error: null };
  let stratRes: { error: { message: string } | null } = { error: null };
  if (purgeDomains.length > 0) {
    const results = await Promise.all([
      supabase.from("ads_cache").delete().eq("user_id", user.id).in("competitor_domain", purgeDomains),
      supabase
        .from("strategy_overview_cache")
        .delete()
        .eq("user_id", user.id)
        .in("competitor_domain", purgeDomains),
    ]);
    adsRes = results[0];
    stratRes = results[1];
  }

  const warnings: string[] = [];
  if (adsRes.error) warnings.push(adsRes.error.message);
  if (stratRes.error) warnings.push(stratRes.error.message);

  return NextResponse.json({
    ok: true,
    hadSavedRow: Boolean(existing),
    cacheDomainsPurged: purgeDomains,
    ...(warnings.length > 0 ? { warnings } : {}),
  });
}
