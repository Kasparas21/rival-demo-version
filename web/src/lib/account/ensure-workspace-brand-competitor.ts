import type { SupabaseClient } from "@supabase/supabase-js";

import { ensureCompetitorAdsPersisted } from "@/lib/ad-library/ensure-competitor-ads-persisted";
import {
  pickSavedCompetitorForDomainHint,
  resolveAdsCacheDomainForUser,
  savedCompetitorDomainOrFilter,
} from "@/lib/ad-library/competitor-cache-domain";
import { expandAdsCacheDomainCandidates } from "@/lib/strategy-overview/hydrate-scraped-from-ads-cache";
import { probeSavedCompetitorsColumns } from "@/lib/account/saved-competitors-schema";
import type { Database } from "@/lib/supabase/types";
import { normalizeCompetitorSlug } from "@/lib/sidebar-competitors";

function brandLabelFromDomain(domainHint: string): string {
  const host = normalizeCompetitorSlug(domainHint.trim()).toLowerCase();
  const first = host.split(".")[0] ?? host;
  if (!first) return domainHint.trim() || "Brand";
  return first.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export type WorkspaceBrandCompetitorSnapshot = {
  id: string;
  lastScrapedAt: string | null;
  libraryContext: { channels?: string[]; ids?: Record<string, string> } | null;
  persistOk?: boolean;
  persistErrors?: string[];
};

type SavedRow = {
  id: string;
  last_scraped_at: string | null;
  ads_library_context: unknown;
  brand_domain: string | null;
  slug: string;
};

function parseAdsLibraryContext(raw: unknown): WorkspaceBrandCompetitorSnapshot["libraryContext"] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  const channelsRaw = row.channels;
  const channels = Array.isArray(channelsRaw)
    ? channelsRaw.filter((c): c is string => typeof c === "string" && c.trim().length > 0)
    : undefined;
  const idsRaw = row.ids;
  const ids: Record<string, string> = {};
  if (idsRaw && typeof idsRaw === "object" && !Array.isArray(idsRaw)) {
    for (const [key, value] of Object.entries(idsRaw as Record<string, unknown>)) {
      if (typeof value === "string" && value.trim()) ids[key] = value.trim();
    }
  }
  if (!channels?.length && Object.keys(ids).length === 0) return null;
  return {
    ...(channels?.length ? { channels } : {}),
    ...(Object.keys(ids).length > 0 ? { ids } : {}),
  };
}

async function latestAdsCacheScrapeAt(
  supabase: SupabaseClient<Database>,
  userId: string,
  readDomains: string[],
): Promise<string | null> {
  const domains = expandAdsCacheDomainCandidates(readDomains.filter(Boolean));
  if (domains.length === 0) return null;

  const { data, error } = await supabase
    .from("ads_cache")
    .select("scraped_at")
    .eq("user_id", userId)
    .in("competitor_domain", domains)
    .order("scraped_at", { ascending: false, nullsFirst: false })
    .limit(1);

  if (error || !data?.[0]?.scraped_at) return null;
  return String(data[0].scraped_at);
}

async function findSavedRowForDomain(
  supabase: SupabaseClient<Database>,
  userId: string,
  cleaned: string,
  columns: { adsLibraryContext: boolean; workspaceBrand: boolean },
): Promise<SavedRow | null> {
  const orFilter = savedCompetitorDomainOrFilter(cleaned);
  if (!orFilter) return null;

  const selectCols = [
    "id",
    "last_scraped_at",
    "brand_domain",
    "slug",
    ...(columns.adsLibraryContext ? (["ads_library_context"] as const) : []),
    ...(columns.workspaceBrand ? (["is_workspace_brand"] as const) : []),
  ].join(", ");

  const domainQuery = await supabase
    .from("saved_competitors")
    .select(selectCols)
    .eq("user_id", userId)
    .or(orFilter)
    .order("last_scraped_at", { ascending: false, nullsFirst: false })
    .limit(8);
  if (domainQuery.error) throw domainQuery.error;

  type DomainQueryRow = {
    id: string;
    last_scraped_at: string | null;
    brand_domain: string | null;
    slug: string;
    ads_library_context?: unknown;
    is_workspace_brand?: boolean;
  };
  const domainRows = (domainQuery.data ?? []) as unknown as DomainQueryRow[];

  const picked = pickSavedCompetitorForDomainHint(domainRows, cleaned);
  if (!picked?.id) return null;
  const found = domainRows.find((r) => r.id === picked.id) ?? null;
  if (!found) return null;
  return {
    id: found.id,
    last_scraped_at: found.last_scraped_at ?? null,
    ads_library_context: columns.adsLibraryContext ? (found as SavedRow).ads_library_context ?? null : null,
    brand_domain: found.brand_domain ?? null,
    slug: found.slug,
  };
}

async function clearWorkspaceBrandFlagExcept(
  supabase: SupabaseClient<Database>,
  userId: string,
  keepId: string,
): Promise<void> {
  await supabase
    .from("saved_competitors")
    .update({ is_workspace_brand: false, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("is_workspace_brand", true)
    .neq("id", keepId);
}

/**
 * Guarantees a `saved_competitors` row for the workspace brand (same linkage competitors get from sidebar sync).
 * Backfills `last_scraped_at` from `ads_cache` and `scraped_ads` from cache when missing.
 */
export type EnsureWorkspaceBrandSavedCompetitorOptions = {
  /** When false, skip copying `ads_cache` → `scraped_ads` (fast read paths like workspace-last-scrape). */
  persistAds?: boolean;
};

export async function ensureWorkspaceBrandSavedCompetitor(
  supabase: SupabaseClient<Database>,
  userId: string,
  domainHint: string,
  brandNameHint?: string | null,
  options?: EnsureWorkspaceBrandSavedCompetitorOptions,
): Promise<WorkspaceBrandCompetitorSnapshot | null> {
  const persistAds = options?.persistAds !== false;
  const cleaned = normalizeCompetitorSlug(domainHint.trim()).toLowerCase();
  if (!cleaned) return null;

  const columnProbe = await probeSavedCompetitorsColumns(supabase, userId);
  const columnFlags = {
    adsLibraryContext: columnProbe.adsLibraryContext,
    workspaceBrand: columnProbe.workspaceBrand,
  };

  let row: SavedRow | null = await findSavedRowForDomain(supabase, userId, cleaned, columnFlags);

  if (!row) {
    const name = brandNameHint?.trim() || brandLabelFromDomain(cleaned);
    const insert: Database["public"]["Tables"]["saved_competitors"]["Insert"] = {
      user_id: userId,
      slug: cleaned,
      name,
      brand_name: name,
      brand_domain: cleaned,
      pending: false,
      updated_at: new Date().toISOString(),
      ...(columnFlags.workspaceBrand ? { is_workspace_brand: true } : {}),
    };
    const insertSelect = [
      "id",
      "last_scraped_at",
      "brand_domain",
      "slug",
      ...(columnFlags.adsLibraryContext ? (["ads_library_context"] as const) : []),
    ].join(", ");
    const { data: inserted, error: insertErr } = await supabase
      .from("saved_competitors")
      .insert(insert)
      .select(insertSelect)
      .single();
    if (insertErr) {
      row = await findSavedRowForDomain(supabase, userId, cleaned, columnFlags);
      if (!row) throw insertErr;
    } else if (inserted) {
      const insertedRow = inserted as unknown as SavedRow;
      row = {
        id: insertedRow.id,
        last_scraped_at: insertedRow.last_scraped_at ?? null,
        ads_library_context: columnFlags.adsLibraryContext
          ? insertedRow.ads_library_context ?? null
          : null,
        brand_domain: insertedRow.brand_domain ?? null,
        slug: insertedRow.slug,
      };
    } else {
      row = await findSavedRowForDomain(supabase, userId, cleaned, columnFlags);
    }
  }

  if (!row) return null;

  const id = row.id;

  if (columnFlags.workspaceBrand) {
    await clearWorkspaceBrandFlagExcept(supabase, userId, id);
    const patch: Database["public"]["Tables"]["saved_competitors"]["Update"] = {
      is_workspace_brand: true,
      updated_at: new Date().toISOString(),
    };
    if (!row.brand_domain?.trim()) patch.brand_domain = cleaned;
    const { error: promoteErr } = await supabase
      .from("saved_competitors")
      .update(patch)
      .eq("id", id)
      .eq("user_id", userId);
    if (promoteErr) throw promoteErr;
  }

  const { readDomains } = await resolveAdsCacheDomainForUser(supabase, userId, cleaned);

  let lastScrapedAt = row.last_scraped_at ? String(row.last_scraped_at) : null;
  if (!lastScrapedAt) {
    lastScrapedAt = await latestAdsCacheScrapeAt(supabase, userId, readDomains);
    if (lastScrapedAt) {
      await supabase
        .from("saved_competitors")
        .update({ last_scraped_at: lastScrapedAt, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", userId);
    }
  }

  const readDomainsForCheck = expandAdsCacheDomainCandidates(readDomains.filter(Boolean));
  let shouldPersist = false;
  if (readDomainsForCheck.length > 0) {
    const { count: cacheCount } = await supabase
      .from("ads_cache")
      .select("platform", { count: "exact", head: true })
      .eq("user_id", userId)
      .in("competitor_domain", readDomainsForCheck);
    shouldPersist = (cacheCount ?? 0) > 0;
  }

  let persistOk = !shouldPersist || !persistAds;
  let persistErrors: string[] | undefined;
  if (shouldPersist && persistAds) {
    try {
      const result = await ensureCompetitorAdsPersisted(supabase, {
        userId,
        domainHint: cleaned,
        competitorId: id,
      });
      persistOk = result.ok;
      if (result.errors.length > 0) persistErrors = result.errors;
    } catch (err) {
      persistOk = false;
      persistErrors = [err instanceof Error ? err.message : "persist_failed"];
      console.error("[ensure-workspace-brand-competitor] ensureCompetitorAdsPersisted", err);
    }
  }

  const freshSelect = [
    "last_scraped_at",
    ...(columnFlags.adsLibraryContext ? (["ads_library_context"] as const) : []),
  ].join(", ");
  const { data: freshRaw } = await supabase
    .from("saved_competitors")
    .select(freshSelect)
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  const fresh = freshRaw as unknown as {
    last_scraped_at?: string | null;
    ads_library_context?: unknown;
  } | null;

  return {
    id,
    lastScrapedAt: fresh?.last_scraped_at ? String(fresh.last_scraped_at) : lastScrapedAt,
    libraryContext: columnFlags.adsLibraryContext
      ? parseAdsLibraryContext(fresh?.ads_library_context ?? row.ads_library_context)
      : null,
    persistOk,
    ...(persistErrors?.length ? { persistErrors } : {}),
  };
}
