import type { SupabaseClient } from "@supabase/supabase-js";

import { isMissingDbColumnError } from "@/lib/supabase/postgrest-schema-error";
import type { Database } from "@/lib/supabase/types";

type ServerSupabase = SupabaseClient<Database>;

export type BrandWatchTarget = {
  brandId: string;
  brandName: string;
  brandDomain: string | null;
  brandContext: string | null;
  isPrimary: boolean;
  /** Non-workspace competitors currently mapped to this brand's sidebar. */
  competitorIds: Set<string>;
};

export type ResolvedWatchScope = {
  /** Competitor IDs autopilot may alert on right now. */
  allowedCompetitorIds: Set<string>;
  /** Owning (enabled) brand per competitor — used for per-client personalization. */
  brandByCompetitorId: Map<string, BrandWatchTarget>;
  /** Brands whose autopilot watch is on. */
  enabledBrands: BrandWatchTarget[];
};

/** Brand watch toggle: explicit value wins, otherwise only the primary brand is on. */
export function isBrandWatchEnabled(
  watchWorkspaces: Record<string, boolean>,
  brandId: string,
  isPrimary: boolean,
): boolean {
  const explicit = watchWorkspaces[brandId];
  return typeof explicit === "boolean" ? explicit : isPrimary;
}

/**
 * Loads every brand workspace with its live sidebar competitors.
 * Removing a competitor from a sidebar deletes its `brand_competitors` row,
 * so this reflects what the user actually tracks — never historical rows.
 */
export async function loadBrandWatchTargets(
  supabase: ServerSupabase,
  userId: string,
): Promise<BrandWatchTarget[]> {
  const { data: brands, error: brandsErr } = await supabase
    .from("brands")
    .select("id, name, domain, brand_context, is_primary, created_at")
    .eq("user_id", userId)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true });

  if (brandsErr) throw brandsErr;
  if (!brands?.length) return [];

  const { data: mappings, error: mapErr } = await supabase
    .from("brand_competitors")
    .select("brand_id, competitor_id")
    .eq("user_id", userId);

  if (
    mapErr &&
    !(isMissingDbColumnError(mapErr.message, "brand_competitors") || /brand_competitors/i.test(mapErr.message))
  ) {
    throw mapErr;
  }

  const rows = (mappings ?? []).filter((r) => r.brand_id && r.competitor_id);
  const mappedIds = [...new Set(rows.map((r) => String(r.competitor_id)))];

  const workspaceIds = new Set<string>();
  if (mappedIds.length > 0) {
    const { data: savedRows, error: savedErr } = await supabase
      .from("saved_competitors")
      .select("id, is_workspace_brand")
      .eq("user_id", userId)
      .in("id", mappedIds);
    if (savedErr && !isMissingDbColumnError(savedErr.message, "is_workspace_brand")) throw savedErr;
    for (const r of savedRows ?? []) {
      if (r.is_workspace_brand) workspaceIds.add(String(r.id));
    }
  }

  const competitorsByBrand = new Map<string, Set<string>>();
  for (const r of rows) {
    const cid = String(r.competitor_id);
    if (workspaceIds.has(cid)) continue;
    const bid = String(r.brand_id);
    const set = competitorsByBrand.get(bid) ?? new Set<string>();
    set.add(cid);
    competitorsByBrand.set(bid, set);
  }

  // First row is primary (query is ordered is_primary desc). Guard against
  // datasets where no brand is flagged primary.
  const hasExplicitPrimary = brands.some((b) => b.is_primary === true);

  return brands.map((b, i) => ({
    brandId: String(b.id),
    brandName: b.name?.trim() || "Your brand",
    brandDomain: b.domain?.trim() || null,
    brandContext: b.brand_context?.trim() || null,
    isPrimary: hasExplicitPrimary ? b.is_primary === true : i === 0,
    competitorIds: competitorsByBrand.get(String(b.id)) ?? new Set<string>(),
  }));
}

/**
 * Applies per-brand watch toggles and the optional explicit competitor list.
 * Brand toggles are the outer gate: competitors of disabled workspaces never
 * alert, even if they were explicitly picked before the workspace was disabled.
 */
export function resolveWatchScope(
  targets: BrandWatchTarget[],
  settings: { watch_workspaces: Record<string, boolean>; watch_competitor_ids: string[] | null },
): ResolvedWatchScope {
  const enabledBrands = targets.filter((t) =>
    isBrandWatchEnabled(settings.watch_workspaces, t.brandId, t.isPrimary),
  );

  const brandByCompetitorId = new Map<string, BrandWatchTarget>();
  for (const brand of enabledBrands) {
    for (const cid of brand.competitorIds) {
      const current = brandByCompetitorId.get(cid);
      if (!current || (brand.isPrimary && !current.isPrimary)) {
        brandByCompetitorId.set(cid, brand);
      }
    }
  }

  let allowedCompetitorIds = new Set(brandByCompetitorId.keys());
  if (settings.watch_competitor_ids?.length) {
    allowedCompetitorIds = new Set(
      settings.watch_competitor_ids.filter((id) => allowedCompetitorIds.has(id)),
    );
  }

  return { allowedCompetitorIds, brandByCompetitorId, enabledBrands };
}
