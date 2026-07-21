import { NextResponse } from "next/server";
import { ensureUserProfile } from "@/lib/auth/profile";
import type { AdsLibraryContextPayload, SavedCompetitorPayload } from "@/lib/account/types";
import { getBillingEntitlement, quotaExceededResponseBody } from "@/lib/billing/entitlements";
import { loadMonthlyUsageSnapshot, utcYearMonth } from "@/lib/billing/usage-quotas";
import { isMissingDbColumnError } from "@/lib/supabase/postgrest-schema-error";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";
import { competitorWatchLimitReachedMessage } from "@/lib/billing/competitor-limit-copy";
import { countWatchedCompetitorSlotsForUser } from "@/lib/billing/brand-competitor-slots";
import { createDefaultLandingPages } from "@/lib/landing-page-tracker/create-defaults";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { assertCanMutate, permissionDeniedResponse } from "@/lib/team/permissions";
import { getRequestWorkspace } from "@/lib/team/session-workspace";
import { workspaceReadClient } from "@/lib/team/workspace-read-client";
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
  const regionsRaw = raw.regions;
  const regions =
    regionsRaw && typeof regionsRaw === "object" && !Array.isArray(regionsRaw)
      ? Object.fromEntries(
          Object.entries(regionsRaw).filter(
            ([, v]) => typeof v === "string" && v.trim() !== "",
          ),
        )
      : undefined;
  const out: AdsLibraryContextPayload = {};
  if (ids && Object.keys(ids).length > 0) out.ids = ids;
  if (channels && channels.length > 0) out.channels = channels;
  if (confirmed !== undefined) out.confirmed = confirmed;
  if (regions && Object.keys(regions).length > 0) {
    out.regions = regions as AdsLibraryContextPayload["regions"];
  }
  if (!out.ids && !out.channels?.length && out.confirmed === undefined && !out.regions) return null;
  return out;
}

function rowToLibraryContext(raw: unknown): SidebarCompetitor["libraryContext"] | undefined {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const idsRaw = o.ids;
  const channelsRaw = o.channels;
  const confirmedRaw = o.confirmed;
  const regionsRaw = o.regions;
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
  if (regionsRaw && typeof regionsRaw === "object" && !Array.isArray(regionsRaw)) {
    const entries = Object.entries(regionsRaw).filter(([, v]) => typeof v === "string");
    if (entries.length > 0) out.regions = Object.fromEntries(entries);
  }
  if (out.ids || out.channels?.length || out.confirmed !== undefined || out.regions) return out;
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

async function resolveBrandId(
  supabase: ServerSupabase,
  userId: string,
  requestedBrandId?: string | null,
): Promise<string | null> {
  const requested = requestedBrandId?.trim();
  if (requested && requested !== "default" && requested !== "_workspace") {
    const { data, error } = await supabase
      .from("brands")
      .select("id")
      .eq("id", requested)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return data?.id ?? null;
  }

  const { data, error } = await supabase
    .from("brands")
    .select("id")
    .eq("user_id", userId)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

async function loadMappedCompetitorIds(
  supabase: ServerSupabase,
  userId: string,
  brandId: string | null,
): Promise<{ supported: boolean; ids: string[] }> {
  if (!brandId) return { supported: false, ids: [] };

  const { data, error } = await supabase
    .from("brand_competitors")
    .select("competitor_id")
    .eq("user_id", userId)
    .eq("brand_id", brandId);

  if (error) {
    if (isMissingDbColumnError(error.message, "brand_competitors") || /brand_competitors/i.test(error.message)) {
      return { supported: false, ids: [] };
    }
    throw error;
  }

  return {
    supported: true,
    ids: (data ?? []).map((r) => String(r.competitor_id ?? "")).filter(Boolean),
  };
}

async function ensurePrimaryBrandBackfillIfNeeded(
  supabase: ServerSupabase,
  userId: string,
  brandId: string | null,
): Promise<void> {
  if (!brandId) return;

  const { data: brand } = await supabase
    .from("brands")
    .select("is_primary")
    .eq("id", brandId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!brand?.is_primary) return;

  const { data: existingMappings, error: existingMappingsError } = await supabase
    .from("brand_competitors")
    .select("id")
    .eq("user_id", userId)
    .limit(1);
  if (existingMappingsError || existingMappings?.length) return;

  const { data: rows, error: rowsError } = await supabase
    .from("saved_competitors")
    .select("id")
    .eq("user_id", userId)
    .eq("is_workspace_brand", false);
  if (rowsError || !rows?.length) return;

  await insertBrandCompetitorMappings(
    supabase,
    userId,
    brandId,
    rows.map((row) => row.id).filter(Boolean),
  );
}

async function insertBrandCompetitorMappings(
  supabase: ServerSupabase,
  userId: string,
  brandId: string | null,
  competitorIds: string[],
): Promise<void> {
  if (!brandId || competitorIds.length === 0) return;
  const now = new Date().toISOString();
  const rows = [...new Set(competitorIds)].map((competitorId) => ({
    user_id: userId,
    brand_id: brandId,
    competitor_id: competitorId,
    updated_at: now,
  }));
  const { error } = await supabase.from("brand_competitors").upsert(rows, {
    onConflict: "user_id,brand_id,competitor_id",
  });
  if (error && !/brand_competitors/i.test(error.message)) throw error;
}

export async function GET(request: Request) {
  const workspace = await getRequestWorkspace();
  if (!workspace) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { supabase, user, ctx, dataUserId } = workspace;
  const db = workspaceReadClient(workspace);
  if (user) {
    await ensureUserProfile(supabase, user);
  }

  const url = new URL(request.url);
  const requestedBrandId = url.searchParams.get("brandId");
  const hasScopedBrandRequest = Boolean(
    requestedBrandId?.trim() && requestedBrandId !== "default" && requestedBrandId !== "_workspace",
  );
  let brandId: string | null = null;
  try {
    brandId = await resolveBrandId(db, dataUserId, requestedBrandId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not resolve brand";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  if (hasScopedBrandRequest && !brandId) {
    return NextResponse.json({ competitors: [] });
  }

  const mapped = await loadMappedCompetitorIds(db, dataUserId, brandId);
  if (hasScopedBrandRequest && !mapped.supported) {
    return NextResponse.json(
      { error: "Brand competitor mappings are not available. Run the multi-brand workspace migration." },
      { status: 500 },
    );
  }
  if (hasScopedBrandRequest && mapped.supported && mapped.ids.length === 0) {
    await ensurePrimaryBrandBackfillIfNeeded(db, dataUserId, brandId);
  }
  const mappedAfterBackfill =
    hasScopedBrandRequest && mapped.supported && mapped.ids.length === 0
      ? await loadMappedCompetitorIds(db, dataUserId, brandId)
      : mapped;
  const baseQuery = db
    .from("saved_competitors")
    .select("*")
    .eq("user_id", dataUserId)
    .order("updated_at", { ascending: false })
    .limit(MAX_WATCHED_COMPETITORS + 4);

  const { data, error } = mappedAfterBackfill.supported
    ? mappedAfterBackfill.ids.length > 0
      ? await baseQuery.in("id", mappedAfterBackfill.ids)
      : { data: [], error: null }
    : await baseQuery;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const brandDomainQuery = db
    .from("brands")
    .select("domain")
    .eq("user_id", dataUserId);

  const { data: activeBrand } = brandId
    ? await brandDomainQuery.eq("id", brandId).maybeSingle()
    : await brandDomainQuery
        .order("is_primary", { ascending: false })
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

  const workspaceDomain = activeBrand?.domain?.trim() || null;

  const rows = data ?? [];
  const competitorIdsForWeekly = rows.map((r) => r.id).filter(Boolean);
  const weeklyLatestStartByCompetitor = new Map<string, string>();

  if (competitorIdsForWeekly.length > 0) {
    const { data: weeklyRows, error: weeklyErr } = await db
      .from("weekly_scrape_jobs")
      .select("competitor_id, week_start")
      .eq("user_id", dataUserId)
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

  return NextResponse.json({
    competitors,
    workspace: {
      isViewer: ctx.isViewer,
      isGuest: ctx.isGuest,
      role: ctx.role,
      dataUserId: ctx.dataUserId,
      owner: ctx.owner ?? null,
    },
  });
}

type ExistingRowMeta = {
  id: string;
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
    .select("id, slug, logo_url, brand_logo_url, is_workspace_brand, ads_library_context")
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
      .select("id, slug, logo_url, brand_logo_url, is_workspace_brand")
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
    const leg = await supabase.from("saved_competitors").select("id, slug, logo_url, brand_logo_url").eq("user_id", userId);
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
    const leg = await supabase.from("saved_competitors").select("id, slug, logo_url, brand_logo_url").eq("user_id", userId);
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
  const workspace = await getRequestWorkspace();
  if (!workspace?.user) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const { supabase, user, ctx, dataUserId } = workspace;
  try {
    assertCanMutate(ctx);
  } catch (err) {
    return permissionDeniedResponse(err);
  }

  const body = (await request.json()) as {
    brandId?: unknown;
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
  let competitorItemsRaw = normalizedRaw.filter((item) => item.isWorkspaceBrand !== true);

  const requestedBrandId = typeof body.brandId === "string" ? body.brandId : null;
  const hasScopedBrandRequest = Boolean(
    requestedBrandId?.trim() && requestedBrandId !== "default" && requestedBrandId !== "_workspace",
  );
  let brandId: string | null = null;
  try {
    brandId = await resolveBrandId(
      supabase,
      dataUserId,
      requestedBrandId,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not resolve brand";
    return NextResponse.json({ error: message }, { status: 500 });
  }
  if (hasScopedBrandRequest && !brandId) {
    return NextResponse.json({ error: "Brand not found" }, { status: 404 });
  }

  let activeBrandDomain: string | null = null;
  if (brandId) {
    const { data: activeBrand } = await supabase
      .from("brands")
      .select("domain")
      .eq("id", brandId)
      .eq("user_id", user.id)
      .maybeSingle();
    activeBrandDomain = activeBrand?.domain?.trim() || null;
  }
  if (activeBrandDomain) {
    const activeBrandSlug = normalizeCompetitorSlug(activeBrandDomain);
    competitorItemsRaw = competitorItemsRaw.filter(
      (item) => normalizeCompetitorSlug(item.slug) !== activeBrandSlug,
    );
  }

  if (workspaceItems.length === 0 && competitorItemsRaw.length === 0) {
    return NextResponse.json({ ok: true, competitors: [] });
  }

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

  const mappedForBrand = await loadMappedCompetitorIds(supabase, user.id, brandId);
  const brandMappingsUnavailable = hasScopedBrandRequest && !mappedForBrand.supported;
  /** Legacy: watched rivals only for the active own brand (when `brand_competitors` is unavailable). */
  const slugCountIfLegacy = (): number => {
    const s = new Set<string>();
    const existingForBrand = mappedForBrand.supported
      ? existingList.filter((r) => mappedForBrand.ids.includes(r.id))
      : existingList.filter((r) => !(workspaceBrandColumnSupported && r.is_workspace_brand));
    for (const r of existingForBrand) s.add(normalizeCompetitorSlug(String(r.slug ?? "")));
    for (const c of competitorItemsRaw) s.add(normalizeCompetitorSlug(c.slug));
    return s.size;
  };

  let mergeRowsAgainst: ExistingRowMeta[] = existingList;
  const slugIdsToReturn = new Set<string>();

  if (workspaceItems.length === 1) {
    const wsSlug = normalizeCompetitorSlug(workspaceItems[0]!.slug);
    await deleteWorkspaceBrandPlaceholderRows(supabase, user.id);

    const rows = buildUpsertRows({
      items: [workspaceItems[0]!],
      existingRows: mergeRowsAgainst,
      userId: user.id,
      workspaceBrandColumnSupported,
      adsLibraryContextColumnSupported,
    });
    const upsertRes = await supabase.from("saved_competitors").upsert(rows, {
      onConflict: "user_id,slug",
    });
    if (upsertRes.error) {
      return NextResponse.json({ error: upsertRes.error.message }, { status: 500 });
    }

    const refetch = await fetchExistingSavedRows(supabase, user.id);
    if (!refetch.ok) {
      return NextResponse.json({ error: refetch.error }, { status: 500 });
    }
    mergeRowsAgainst = refetch.rows;
    const wsRow = refetch.rows.find((r) => normalizeCompetitorSlug(r.slug) === wsSlug);
    if (brandId && wsRow?.id) {
      await supabase
        .from("brands")
        .update({ workspace_competitor_id: wsRow.id })
        .eq("id", brandId)
        .eq("user_id", user.id);
    }
  }

  if (competitorItemsRaw.length > 0 && !entitlement.isUnlimited) {
    const useGlobalMappings = Boolean(brandId && mappedForBrand.supported);
    if (useGlobalMappings) {
      const existingMapped = new Set(mappedForBrand.ids);
      let newMappingCount = 0;
      for (const item of competitorItemsRaw) {
        const slug = normalizeCompetitorSlug(item.slug);
        const row = mergeRowsAgainst.find((r) => normalizeCompetitorSlug(String(r.slug ?? "")) === slug);
        if (row?.id) {
          if (!existingMapped.has(row.id)) newMappingCount += 1;
        } else {
          newMappingCount += 1;
        }
      }
      const { count: currentSlots } = await countWatchedCompetitorSlotsForUser(supabase, user.id);
      if (currentSlots + newMappingCount > maxWatchedCompetitors) {
        return NextResponse.json(
          {
            error: competitorWatchLimitReachedMessage(maxWatchedCompetitors),
          },
          { status: 400 },
        );
      }
    } else if (slugCountIfLegacy() > maxWatchedCompetitors) {
      return NextResponse.json(
        {
          error: competitorWatchLimitReachedMessage(maxWatchedCompetitors),
        },
        { status: 400 },
      );
    }
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

  await insertBrandCompetitorMappings(
    supabase,
    user.id,
    brandId,
    competitors
      .filter((c) => !workspaceItems.some((w) => normalizeCompetitorSlug(w.slug) === c.slug))
      .map((c) => c.savedCompetitorDbId),
  );

  if (competitorItemsRaw.length > 0 && competitors.length > 0) {
    try {
      const admin = createSupabaseAdminClient();
      for (const saved of competitors) {
        const item = competitorItemsRaw.find(
          (c) => normalizeCompetitorSlug(c.slug) === saved.slug,
        );
        const website = item?.brand?.domain?.trim() || item?.slug?.trim();
        if (!website || !saved.savedCompetitorDbId) continue;
        await createDefaultLandingPages(admin, saved.savedCompetitorDbId, user.id, website);
      }
    } catch (landingErr) {
      console.error("[saved-competitors] createDefaultLandingPages failed", landingErr);
    }
  }

  return NextResponse.json({ ok: true, competitors, mappingUnavailable: brandMappingsUnavailable });
}

export async function DELETE(request: Request) {
  const workspace = await getRequestWorkspace();
  if (!workspace?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { supabase, user, ctx, dataUserId } = workspace;
  try {
    assertCanMutate(ctx);
  } catch (err) {
    return permissionDeniedResponse(err);
  }

  let body: { slug?: unknown; cacheDomain?: unknown; brandId?: unknown };
  try {
    body = (await request.json()) as { slug?: unknown; cacheDomain?: unknown; brandId?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body.slug !== "string" || !body.slug.trim()) {
    return NextResponse.json({ error: "slug is required" }, { status: 400 });
  }

  const slug = normalizeCompetitorSlug(body.slug);
  const requestedBrandId = typeof body.brandId === "string" ? body.brandId : null;
  const hasScopedBrandRequest = Boolean(
    requestedBrandId?.trim() && requestedBrandId !== "default" && requestedBrandId !== "_workspace",
  );
  let brandId: string | null = null;
  try {
    brandId = await resolveBrandId(
      supabase,
      dataUserId,
      requestedBrandId,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not resolve brand";
    return NextResponse.json({ error: message }, { status: 500 });
  }
  if (hasScopedBrandRequest && !brandId) {
    return NextResponse.json({ error: "Brand not found" }, { status: 404 });
  }

  const selWs = await supabase
    .from("saved_competitors")
    .select("id, slug, brand_domain, is_workspace_brand")
    .eq("user_id", user.id)
    .eq("slug", slug)
    .maybeSingle();

  let existing: {
    id?: string;
    slug?: string;
    brand_domain?: string | null;
    is_workspace_brand?: boolean;
  } | null = null;

  if (!selWs.error) {
    existing = selWs.data;
  } else if (isMissingDbColumnError(selWs.error.message, "is_workspace_brand")) {
    const selLegacy = await supabase
      .from("saved_competitors")
      .select("id, slug, brand_domain")
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

  if (existing?.id && brandId) {
    const { error: delMapError } = await supabase
      .from("brand_competitors")
      .delete()
      .eq("user_id", user.id)
      .eq("brand_id", brandId)
      .eq("competitor_id", existing.id);

    if (delMapError && !/brand_competitors/i.test(delMapError.message)) {
      return NextResponse.json({ error: delMapError.message }, { status: 500 });
    }
    if (hasScopedBrandRequest && delMapError) {
      return NextResponse.json({
        ok: true,
        hadSavedRow: Boolean(existing),
        mappingUnavailable: true,
        cacheDomainsPurged: [],
      });
    }
  }

  // When no brand tracks this competitor anymore, purge the saved row entirely.
  // FKs cascade (alerts, ads, strategy overview…) so stale data can't resurface
  // in autopilot or anywhere else.
  if (existing?.id) {
    const { data: remainingMappings, error: remainingErr } = await supabase
      .from("brand_competitors")
      .select("id")
      .eq("user_id", user.id)
      .eq("competitor_id", existing.id)
      .limit(1);

    const mappingsUnavailable = Boolean(
      remainingErr && /brand_competitors/i.test(remainingErr.message),
    );
    if (mappingsUnavailable || (!remainingErr && (remainingMappings ?? []).length === 0)) {
      const { error: delRowError } = await supabase
        .from("saved_competitors")
        .delete()
        .eq("user_id", user.id)
        .eq("id", existing.id);
      if (delRowError) {
        return NextResponse.json({ error: delRowError.message }, { status: 500 });
      }
    }
  }

  if (existing && !entitlement.isUnlimited) {
    await supabase.rpc("increment_competitor_swap_usage");
  }

  return NextResponse.json({
    ok: true,
    hadSavedRow: Boolean(existing),
    cacheDomainsPurged: [],
  });
}
