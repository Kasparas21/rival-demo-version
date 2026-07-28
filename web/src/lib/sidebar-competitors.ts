/** Persisted “spied” competitors for the dashboard sidebar */

import { readClientCompetitorSlotsRemaining, readClientMaxWatchedCompetitors } from "@/lib/billing/client-plan-cap";
import { googleFaviconUrlForDomain } from "@/lib/discovery";
import { safeSetLocalStorage } from "@/lib/cache/storage-quota";

export const SIDEBAR_COMPETITORS_EVENT = "rival_sidebar_competitors";
export const SIDEBAR_COMPETITORS_STORAGE_KEY = "rival_sidebar_competitors_v2";
const STORAGE_V1 = "rival_competitors";
const ACTIVE_BRAND_STORAGE_KEY = "rival_active_brand";
/** Tracks which Supabase user last owned `SIDEBAR_COMPETITORS_STORAGE_KEY` — prevents cross-account leakage on shared browsers. */
const SIDEBAR_STORAGE_OWNER_KEY = "rival_sidebar_competitors_owner_v1";

function scopedSidebarStorageKey(): string {
  if (typeof window === "undefined") return SIDEBAR_COMPETITORS_STORAGE_KEY;
  try {
    const activeBrand = window.localStorage.getItem(ACTIVE_BRAND_STORAGE_KEY)?.trim();
    if (activeBrand && activeBrand !== "default" && activeBrand !== "_workspace") {
      return `${SIDEBAR_COMPETITORS_STORAGE_KEY}:${activeBrand}`;
    }
  } catch {
    /* ignore */
  }
  return SIDEBAR_COMPETITORS_STORAGE_KEY;
}

function removeAllSidebarCompetitorStorage(): void {
  if (typeof window === "undefined") return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (
        key === SIDEBAR_COMPETITORS_STORAGE_KEY ||
        key?.startsWith(`${SIDEBAR_COMPETITORS_STORAGE_KEY}:`)
      ) {
        keys.push(key);
      }
    }
    for (const key of keys) window.localStorage.removeItem(key);
    window.localStorage.removeItem(STORAGE_V1);
  } catch {
    /* ignore */
  }
}

export function ensureSidebarStorageBelongsToUser(userId: string): void {
  if (typeof window === "undefined" || !userId) return;
  try {
    const prev = localStorage.getItem(SIDEBAR_STORAGE_OWNER_KEY);
    if (prev && prev !== userId) {
      removeAllSidebarCompetitorStorage();
      window.dispatchEvent(new Event(SIDEBAR_COMPETITORS_EVENT));
    }
    localStorage.setItem(SIDEBAR_STORAGE_OWNER_KEY, userId);
  } catch {
    /* ignore */
  }
}

/** Call on sign-out so the next login never inherits the previous session’s sidebar list. */
export function clearSidebarCompetitorsStorageForSignOut(): void {
  if (typeof window === "undefined") return;
  try {
    removeAllSidebarCompetitorStorage();
    localStorage.removeItem(SIDEBAR_STORAGE_OWNER_KEY);
    window.dispatchEvent(new Event(SIDEBAR_COMPETITORS_EVENT));
  } catch {
    /* ignore */
  }
}

export function clearSidebarCompetitorsForBrand(brandId: string): void {
  if (typeof window === "undefined" || !brandId.trim()) return;
  try {
    window.localStorage.removeItem(`${SIDEBAR_COMPETITORS_STORAGE_KEY}:${brandId.trim()}`);
    window.dispatchEvent(new Event(SIDEBAR_COMPETITORS_EVENT));
  } catch {
    /* ignore */
  }
}

export type SidebarCompetitorBrand = {
  name: string;
  domain: string;
  logoUrl?: string;
};

export type SidebarCompetitor = {
  slug: string;
  name: string;
  logoUrl?: string;
  brand?: SidebarCompetitorBrand;
  libraryContext?: {
    ids?: Record<string, string>;
    channels?: string[];
    confirmed?: boolean;
    regions?: {
      metaCountry?: string;
      googleRegion?: string;
      tiktokRegion?: string;
      pinterestCountry?: string;
      linkedinCountryCode?: string;
      snapchatCountry?: string;
    };
  };
  /** ISO timestamp from `saved_competitors.last_scraped_at` when synced from account */
  lastScrapedAt?: string;
  /** True while Firecrawl / discover API is in flight */
  pending?: boolean;
  /** Supabase `saved_competitors.id` — from account GET */
  savedCompetitorDbId?: string;
  /** Weekly cron “spy on this brand” flag */
  spyOnBrandFollowed?: boolean;
  /** Latest successful `weekly_scrape_jobs.week_start` (YYYY-MM-DD) */
  lastWeeklyWeekStart?: string;
};

function firstNonEmptyLogoUrl(...urls: (string | undefined)[]): string | undefined {
  for (const u of urls) {
    const t = u?.trim();
    /** Clearbit Logo API is discontinued — stored URLs pointing at it are dead. */
    if (t && !t.includes("logo.clearbit.com")) return t;
  }
  return undefined;
}

/** Logo for UI + storage — discovery often only sets `brand.logoUrl` */
export function resolvedSidebarCompetitorLogoUrl(c: SidebarCompetitor): string | undefined {
  return firstNonEmptyLogoUrl(c.logoUrl, c.brand?.logoUrl);
}

export function normalizeCompetitorSlug(raw: string): string {
  const t = raw.trim().toLowerCase();
  return t.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] || t;
}

/** Alphanumeric fold for “same brand” matching (Trycrush ≈ TRYCRUSH ≈ Try Crush) */
export function competitorNameFingerprint(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function slugDotCount(s: string): number {
  return (normalizeCompetitorSlug(s).match(/\./g) ?? []).length;
}

/** Prefer real domains over bare keywords for URLs and storage */
export function preferCanonicalSlug(...candidates: (string | undefined)[]): string {
  const parts = candidates.map((c) => (c ? normalizeCompetitorSlug(c) : "")).filter(Boolean);
  if (parts.length === 0) return "";
  return [...parts].sort((a, b) => {
    const d = slugDotCount(b) - slugDotCount(a);
    if (d !== 0) return d;
    return b.length - a.length;
  })[0];
}

/** Same host or parent/child label (trycrush vs trycrush.ai) */
export function slugsLikelySameCompany(a: string, b: string): boolean {
  const na = normalizeCompetitorSlug(a);
  const nb = normalizeCompetitorSlug(b);
  if (na === nb) return true;
  if (nb.startsWith(na + ".") || na.startsWith(nb + ".")) return true;
  const ba = na.split(".")[0] ?? na;
  const bb = nb.split(".")[0] ?? nb;
  if (ba === bb && ba.length >= 3 && (na === ba || nb === ba)) return true;
  return false;
}

function competitorsMatch(a: SidebarCompetitor, slug: string, lookupName: string): boolean {
  if (normalizeCompetitorSlug(a.slug) === normalizeCompetitorSlug(slug)) return true;
  if (slugsLikelySameCompany(a.slug, slug)) return true;
  const fp = competitorNameFingerprint(lookupName);
  const fpa = competitorNameFingerprint(a.name);
  if (fp.length >= 4 && fpa === fp) return true;
  return false;
}

export function findMatchingCompetitorIndex(
  list: SidebarCompetitor[],
  slug: string,
  lookupName: string
): number {
  return list.findIndex((c) => competitorsMatch(c, slug, lookupName));
}

function mergeBrand(
  prev?: SidebarCompetitorBrand,
  incoming?: SidebarCompetitorBrand
): SidebarCompetitorBrand | undefined {
  if (!prev) return incoming;
  if (!incoming) return prev;
  const domain = preferCanonicalSlug(prev.domain, incoming.domain) || prev.domain;
  return {
    name: incoming.name.trim().length >= prev.name.trim().length ? incoming.name : prev.name,
    domain,
    logoUrl: incoming.logoUrl ?? prev.logoUrl,
  };
}

/** Deep-merge Ads Library sidebar fields so account sync / URL-less views never wipe identifiers. */
export function mergeSidebarLibraryContext(
  prev?: SidebarCompetitor["libraryContext"],
  incoming?: SidebarCompetitor["libraryContext"],
): SidebarCompetitor["libraryContext"] | undefined {
  if (!incoming && !prev) return undefined;
  if (!incoming) return prev;
  if (!prev) return incoming;
  const channels = incoming.channels !== undefined ? incoming.channels : prev.channels;
  const ids = incoming.ids !== undefined ? incoming.ids : prev.ids;
  const confirmed = incoming.confirmed !== undefined ? incoming.confirmed : prev.confirmed;
  return { ids, channels, confirmed };
}

/**
 * Saved-competitors API omits `libraryContext` and may omit logo fields. Reconcile with the current
 * local session row so thumbnails + ads-library payloads stay stable after refresh/account sync.
 */
export function mergeAccountSidebarRowsWithLocalLibraryContext(
  accountRows: SidebarCompetitor[],
  localRows: SidebarCompetitor[],
): SidebarCompetitor[] {
  return accountRows.map((remote) => {
    const idx = findMatchingCompetitorIndex(localRows, remote.slug, remote.brand?.name ?? remote.name);
    if (idx < 0) return hoistLogoOntoRow(remote);
    const loc = localRows[idx];
    const brand = mergeBrand(loc.brand, remote.brand);
    const logoUrl = firstNonEmptyLogoUrl(
      remote.logoUrl,
      remote.brand?.logoUrl,
      loc.logoUrl,
      loc.brand?.logoUrl,
    );
    return hoistLogoOntoRow({
      ...remote,
      logoUrl,
      brand,
      libraryContext: mergeSidebarLibraryContext(loc.libraryContext, remote.libraryContext),
      ...(remote.savedCompetitorDbId != null ? { savedCompetitorDbId: remote.savedCompetitorDbId } : {}),
      spyOnBrandFollowed:
        remote.spyOnBrandFollowed !== undefined ? remote.spyOnBrandFollowed : loc.spyOnBrandFollowed,
      lastWeeklyWeekStart: remote.lastWeeklyWeekStart ?? loc.lastWeeklyWeekStart,
    });
  });
}

/** `patch` is the newest API / navigation write; `stored` is the existing row */
function mergePatchIntoRow(
  stored: SidebarCompetitor,
  patch: { slug: string } & Partial<Omit<SidebarCompetitor, "slug">>
): SidebarCompetitor {
  const slug = preferCanonicalSlug(stored.slug, patch.slug, stored.brand?.domain, patch.brand?.domain);
  const name =
    patch.name !== undefined ? patch.name.trim() || stored.name : stored.name;
  const trimmed = (name.trim() || slug).trim() || slug;
  const brand =
    patch.brand !== undefined ? mergeBrand(stored.brand, patch.brand) ?? patch.brand : stored.brand;
  const logoUrl = firstNonEmptyLogoUrl(
    patch.logoUrl,
    patch.brand?.logoUrl,
    stored.logoUrl,
    stored.brand?.logoUrl,
    brand?.logoUrl
  );
  return {
    slug,
    name: trimmed,
    logoUrl,
    brand,
    libraryContext: mergeSidebarLibraryContext(stored.libraryContext, patch.libraryContext),
    pending: patch.pending !== undefined ? patch.pending : stored.pending,
    lastScrapedAt:
      patch.lastScrapedAt !== undefined ? patch.lastScrapedAt : stored.lastScrapedAt,
    savedCompetitorDbId: patch.savedCompetitorDbId ?? stored.savedCompetitorDbId,
    spyOnBrandFollowed:
      patch.spyOnBrandFollowed !== undefined ? patch.spyOnBrandFollowed : stored.spyOnBrandFollowed,
    lastWeeklyWeekStart:
      patch.lastWeeklyWeekStart !== undefined ? patch.lastWeeklyWeekStart : stored.lastWeeklyWeekStart,
  };
}

/** `newer` was seen first in a newest-first list; merge an older duplicate into it */
function mergeDuplicateGroup(newer: SidebarCompetitor, older: SidebarCompetitor): SidebarCompetitor {
  const slug = preferCanonicalSlug(newer.slug, older.slug, newer.brand?.domain, older.brand?.domain);
  const name = (newer.name.trim() || older.name.trim() || slug).trim() || slug;
  return {
    slug,
    name,
    logoUrl: firstNonEmptyLogoUrl(
      newer.logoUrl,
      newer.brand?.logoUrl,
      older.logoUrl,
      older.brand?.logoUrl
    ),
    brand: mergeBrand(older.brand, newer.brand),
    libraryContext: mergeSidebarLibraryContext(older.libraryContext, newer.libraryContext),
    pending: newer.pending && older.pending,
    lastScrapedAt: newer.lastScrapedAt ?? older.lastScrapedAt,
    savedCompetitorDbId: newer.savedCompetitorDbId ?? older.savedCompetitorDbId,
    spyOnBrandFollowed: newer.spyOnBrandFollowed ?? older.spyOnBrandFollowed,
    lastWeeklyWeekStart: newer.lastWeeklyWeekStart ?? older.lastWeeklyWeekStart,
  };
}

function isLikelyRealDomainHost(host: string): boolean {
  const h = host.trim().toLowerCase();
  if (!h.includes(".")) return false;
  return /^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(h);
}

/** Stable host key for merging duplicate sidebar rows (same site, different slug labels). */
function sidebarRowCanonicalHost(c: SidebarCompetitor): string {
  return coerceSidebarCompetitorUrlHost(c).toLowerCase();
}

/** Collapse duplicates (same slug group, same name fingerprint, or same canonical domain); input should be newest-first */
export function dedupeSidebarCompetitors(list: SidebarCompetitor[]): SidebarCompetitor[] {
  const out: SidebarCompetitor[] = [];
  for (const item of list) {
    const lookupName = item.brand?.name ?? item.name;
    const j = findMatchingCompetitorIndex(out, item.slug, lookupName);
    const host = sidebarRowCanonicalHost(item);
    const hostIdx =
      isLikelyRealDomainHost(host) ? out.findIndex((o) => sidebarRowCanonicalHost(o) === host) : -1;
    const mergeIdx = j >= 0 ? j : hostIdx >= 0 ? hostIdx : -1;
    if (mergeIdx < 0) {
      out.push({ ...item });
    } else {
      out[mergeIdx] = mergeDuplicateGroup(out[mergeIdx], item);
    }
  }
  return out;
}

function migrateV1IfNeeded(): SidebarCompetitor[] {
  if (typeof window === "undefined") return [];
  try {
    const v2 = window.localStorage.getItem(SIDEBAR_COMPETITORS_STORAGE_KEY);
    if (v2) {
      const parsed = JSON.parse(v2) as unknown;
      if (Array.isArray(parsed)) return parsed as SidebarCompetitor[];
    }
    const v1 = window.localStorage.getItem(STORAGE_V1);
    if (v1) {
      const arr = JSON.parse(v1) as unknown;
      if (Array.isArray(arr)) {
        const migrated: SidebarCompetitor[] = arr
          .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
          .map((slug) => {
            const s = normalizeCompetitorSlug(slug);
            const short = s.split(".")[0] || s;
            return {
              slug: s,
              name: short.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
              pending: false,
            };
          });
        safeSetLocalStorage(SIDEBAR_COMPETITORS_STORAGE_KEY, JSON.stringify(migrated));
        window.localStorage.removeItem(STORAGE_V1);
        return migrated;
      }
    }
  } catch {
    /* ignore */
  }
  return [];
}

/** Default fallback when plan limits are not loaded yet (Pro tier). Used for add-cap checks only — not sidebar display. */
export const MAX_WATCHED_COMPETITORS = 15;

/** Placeholder slug used during workspace brand scrape — never a watched competitor. */
export const WORKSPACE_BRAND_PLACEHOLDER_SLUG = "workspace-brand";

let cachedWorkspaceDomainForCap: string | null = null;

/** Set from dashboard layout once workspace brand domain is known. */
export function setWorkspaceDomainForCompetitorCap(domain: string | null | undefined): void {
  cachedWorkspaceDomainForCap = domain?.trim() ? domain.trim() : null;
}

function resolveWorkspaceDomainForCap(explicit?: string | null): string | null | undefined {
  if (explicit !== undefined) return explicit;
  return cachedWorkspaceDomainForCap;
}

export function loadWatchedSidebarCompetitors(
  workspaceDomain?: string | null,
): SidebarCompetitor[] {
  return sidebarCompetitorsWithoutWorkspaceRow(
    loadSidebarCompetitors(),
    resolveWorkspaceDomainForCap(workspaceDomain),
  );
}

export function countWatchedSidebarCompetitors(workspaceDomain?: string | null): number {
  return loadWatchedSidebarCompetitors(workspaceDomain).length;
}

export function wouldExceedWatchedCompetitorCap(
  query: string,
  cap: number,
  workspaceDomain?: string | null,
): boolean {
  const trimmed = query.trim();
  if (!trimmed || !Number.isFinite(cap) || cap < 1) return false;
  const slug = normalizeCompetitorSlug(trimmed);
  const watched = loadWatchedSidebarCompetitors(workspaceDomain);
  const idx = findMatchingCompetitorIndex(watched, slug, trimmed);
  if (idx >= 0) return false;

  const globalRemaining = readClientCompetitorSlotsRemaining();
  if (globalRemaining !== null) {
    return globalRemaining <= 0;
  }
  return watched.length >= cap;
}

export type UpsertSidebarCompetitorResult =
  | { ok: true }
  | { ok: false; reason: "max_watched_competitors" };

export function loadSidebarCompetitors(): SidebarCompetitor[] {
  if (typeof window === "undefined") return [];
  try {
    let list: SidebarCompetitor[];
    const key = scopedSidebarStorageKey();
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      list = key === SIDEBAR_COMPETITORS_STORAGE_KEY ? migrateV1IfNeeded() : [];
    } else {
      const parsed = JSON.parse(raw) as unknown;
      list = Array.isArray(parsed) ? (parsed as SidebarCompetitor[]) : [];
    }
    const deduped = dedupeSidebarCompetitors(list);
    const withLogos = deduped.map(hoistLogoOntoRow);
    const logosHoisted = withLogos.some((c, i) => c.logoUrl !== deduped[i].logoUrl);
    if (deduped.length !== list.length || logosHoisted) {
      safeSetLocalStorage(key, JSON.stringify(withLogos));
    }
    return withLogos;
  } catch {
    return [];
  }
}

export function saveSidebarCompetitors(list: SidebarCompetitor[]) {
  if (typeof window === "undefined") return;
  const cleaned = dedupeSidebarCompetitors(list).map(hoistLogoOntoRow);
  const serialized = JSON.stringify(cleaned);
  const key = scopedSidebarStorageKey();
  const prev = window.localStorage.getItem(key);
  if (prev === serialized) return;
  if (!safeSetLocalStorage(key, serialized)) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[sidebar] could not persist competitors list — storage full");
    }
    return;
  }
  window.dispatchEvent(new Event(SIDEBAR_COMPETITORS_EVENT));
}

/**
 * Insert or update one competitor — matches existing row by slug, related domain, or same brand name (no duplicates).
 */
export function upsertSidebarCompetitor(
  partial: { slug: string } & Partial<Omit<SidebarCompetitor, "slug">>
): UpsertSidebarCompetitorResult {
  if (typeof window === "undefined") return { ok: true };
  const slug = normalizeCompetitorSlug(partial.slug);
  const lookupName = partial.name?.trim() || partial.brand?.name || slug;
  const list = loadSidebarCompetitors();
  const idx = findMatchingCompetitorIndex(list, slug, lookupName);
  const isNew = idx < 0;
  const cap = readClientMaxWatchedCompetitors();
  if (isNew) {
    const globalRemaining = readClientCompetitorSlotsRemaining();
    if (globalRemaining !== null) {
      if (globalRemaining <= 0) return { ok: false, reason: "max_watched_competitors" };
    } else if (countWatchedSidebarCompetitors() >= cap) {
      return { ok: false, reason: "max_watched_competitors" };
    }
  }
  const prev = idx >= 0 ? list[idx] : undefined;
  const merged: SidebarCompetitor = prev
    ? mergePatchIntoRow(prev, partial)
    : {
        slug,
        name: (partial.name?.trim() || partial.brand?.name || slug).trim() || slug,
        logoUrl: firstNonEmptyLogoUrl(partial.logoUrl, partial.brand?.logoUrl),
        brand: partial.brand,
        pending: partial.pending ?? false,
        ...(partial.lastScrapedAt !== undefined ? { lastScrapedAt: partial.lastScrapedAt } : {}),
        ...(partial.savedCompetitorDbId?.trim()
          ? { savedCompetitorDbId: partial.savedCompetitorDbId.trim() }
          : {}),
      };
  if (isNew) {
    const nextNew = [...list];
    nextNew.unshift(merged);
    saveSidebarCompetitors(nextNew);
  } else if (idx >= 0) {
    const nextUpdate = [...list];
    nextUpdate[idx] = merged;
    saveSidebarCompetitors(nextUpdate);
  }
  return { ok: true };
}

/**
 * Remove one saved competitor (same matching rules as `upsertSidebarCompetitor`).
 * @returns Whether a matching row existed in storage and was removed.
 */
export function removeSidebarCompetitor(competitor: SidebarCompetitor): boolean {
  if (typeof window === "undefined") return false;
  const lookupName = competitor.brand?.name ?? competitor.name;
  const list = loadSidebarCompetitors();
  const idx = findMatchingCompetitorIndex(list, competitor.slug, lookupName);
  if (idx < 0) return false;
  const next = list.filter((_, i) => i !== idx);
  saveSidebarCompetitors(next);
  return true;
}

/**
 * Single host for links, favicon, and subtitle — pulls a domain out of messy slugs
 * (e.g. multi-word queries) and prefers `brand.domain` when set.
 */
export function coerceSidebarCompetitorUrlHost(c: Pick<SidebarCompetitor, "slug" | "brand">): string {
  const b = c.brand?.domain?.trim();
  if (b) return normalizeCompetitorSlug(b);
  const raw = c.slug.trim();
  const m = raw.match(/\b[a-z0-9][a-z0-9-]*\.[a-z]{2,}\b/i);
  if (m) return normalizeCompetitorSlug(m[0]);
  const one = raw.split(/\s+/).filter(Boolean)[0];
  return normalizeCompetitorSlug(one || raw);
}

type SidebarRowWithWorkspaceFlag = SidebarCompetitor & { isWorkspaceBrand?: boolean };

/**
 * Whether this sidebar row represents the user's own workspace brand (Spy / sidebar should not list it as a "competitor").
 * Uses `isWorkspaceBrand` when present, and falls back to matching the workspace domain to slug / brand.domain.
 */
export function isSidebarRowLikelyWorkspaceBrand(
  row: SidebarRowWithWorkspaceFlag,
  workspaceDomain: string | null | undefined,
): boolean {
  if (row.isWorkspaceBrand === true) return true;
  if (normalizeCompetitorSlug(row.slug) === WORKSPACE_BRAND_PLACEHOLDER_SLUG) return true;
  const ws = normalizeCompetitorSlug(String(workspaceDomain ?? "").trim());
  if (!ws) return false;
  const rowHost = coerceSidebarCompetitorUrlHost(row);
  const brandDom = row.brand?.domain?.trim() ? normalizeCompetitorSlug(row.brand.domain) : "";
  if (rowHost === ws || brandDom === ws) return true;
  if (slugsLikelySameCompany(row.slug, ws)) return true;
  if (brandDom && slugsLikelySameCompany(brandDom, ws)) return true;
  return false;
}

export function sidebarCompetitorsWithoutWorkspaceRow(
  rows: SidebarCompetitor[],
  workspaceDomain: string | null | undefined,
): SidebarCompetitor[] {
  return rows.filter((r) => !isSidebarRowLikelyWorkspaceBrand(r, workspaceDomain));
}

/** Drop workspace-brand rows from local sidebar storage; returns whether anything was removed. */
export function purgeExcludedSidebarCompetitorRows(
  workspaceDomain: string | null | undefined,
): boolean {
  if (typeof window === "undefined") return false;
  const cur = loadSidebarCompetitors();
  const next = sidebarCompetitorsWithoutWorkspaceRow(cur, workspaceDomain);
  if (next.length === cur.length) return false;
  saveSidebarCompetitors(next);
  return true;
}

/**
 * After DELETE from the sidebar, the competitor route can still be mounted for a frame — its
 * `useEffect` calls `upsertSidebarCompetitor` and would re-insert the row. Suppress upserts for
 * this slug set briefly (sessionStorage) so the row stays removed.
 */
const SIDEBAR_UPSERT_SUPPRESS_KEY = "rival_sidebar_upsert_suppress_v1";

type SidebarUpsertSuppressPayload = { slugs: string[]; until: number };

export function suppressSidebarUpsertAfterRemoval(competitor: SidebarCompetitor, ttlMs = 12_000): void {
  if (typeof window === "undefined") return;
  const slugs = new Set<string>();
  slugs.add(normalizeCompetitorSlug(competitor.slug));
  slugs.add(normalizeCompetitorSlug(coerceSidebarCompetitorUrlHost(competitor)));
  const bd = competitor.brand?.domain?.trim();
  if (bd) slugs.add(normalizeCompetitorSlug(bd));
  try {
    const payload: SidebarUpsertSuppressPayload = {
      slugs: [...slugs].filter(Boolean),
      until: Date.now() + ttlMs,
    };
    window.sessionStorage.setItem(SIDEBAR_UPSERT_SUPPRESS_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

export function shouldSuppressSidebarUpsertForSlug(slug: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.sessionStorage.getItem(SIDEBAR_UPSERT_SUPPRESS_KEY);
    if (!raw) return false;
    const o = JSON.parse(raw) as SidebarUpsertSuppressPayload;
    if (!o?.until || !Array.isArray(o.slugs)) return false;
    if (Date.now() > o.until) {
      window.sessionStorage.removeItem(SIDEBAR_UPSERT_SUPPRESS_KEY);
      return false;
    }
    const n = normalizeCompetitorSlug(slug);
    return o.slugs.some((s) => s && normalizeCompetitorSlug(s) === n);
  } catch {
    return false;
  }
}

/** Sidebar search: match name, slug, brand, domain, or coerced host (multi-word = all words must match). */
export function competitorMatchesFilter(c: SidebarCompetitor, filter: string): boolean {
  const q = filter.trim().toLowerCase();
  if (!q) return true;
  const host = coerceSidebarCompetitorUrlHost(c).toLowerCase();
  const blob = [
    c.name,
    c.slug,
    c.brand?.name,
    c.brand?.domain,
    host,
    normalizeCompetitorSlug(c.slug),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const words = q.split(/\s+/).filter(Boolean);
  return words.every((w) => w.length > 0 && blob.includes(w));
}

/**
 * Show the full sidebar skeleton while discovery is still in progress.
 * Pending rows must not fall through to the normal row layout (avatar-only + empty text).
 */
export function competitorSidebarShowsLoadingSkeleton(c: SidebarCompetitor): boolean {
  return Boolean(c.pending);
}

/** Third-party favicon endpoint when the Google favicon proxy fails (CDN hotlink quirks). */
function duckduckgoFaviconUrlForDomain(host: string): string {
  const h = normalizeCompetitorSlug(host).replace(/^www\./i, "");
  return `https://icons.duckduckgo.com/ip3/${encodeURIComponent(h)}.ico`;
}

/** When no stored logo URL, derive one from the domain (Clearbit is discontinued — use Google favicon). */
function synthesizeDomainLogoUrl(c: Pick<SidebarCompetitor, "slug" | "brand">): string | undefined {
  const host = coerceSidebarCompetitorUrlHost(c);
  const h = normalizeCompetitorSlug(host);
  if (!h.includes(".")) return undefined;
  if (!/^([a-z0-9][a-z0-9-]*\.)+[a-z]{2,}$/i.test(h)) return undefined;
  return googleFaviconUrlForDomain(h);
}

/** Ensures `logoUrl` is set where possible (stored logo → Google favicon) before sidebar display or API sync */
export function hoistLogoOntoRow(c: SidebarCompetitor): SidebarCompetitor {
  const direct = resolvedSidebarCompetitorLogoUrl(c);
  if (direct) return { ...c, logoUrl: direct };
  const syn = synthesizeDomainLogoUrl(c);
  if (syn) return { ...c, logoUrl: syn };
  return { ...c };
}

/**
 * Preferred logo URLs for the sidebar (first loads first); fall back on image error for flaky CDNs.
 * Order: stored logo → Google favicon inferred from domain → DuckDuckGo favicon.
 */
export function sidebarCompetitorLogoCandidates(c: SidebarCompetitor): string[] {
  const out: string[] = [];
  const push = (u?: string) => {
    const t = u?.trim();
    if (!t || out.includes(t)) return;
    out.push(t);
  };
  push(resolvedSidebarCompetitorLogoUrl(c));
  push(synthesizeDomainLogoUrl(c));
  const host = coerceSidebarCompetitorUrlHost(c);
  const h = normalizeCompetitorSlug(host);
  if (h.includes(".") && /^([a-z0-9][a-z0-9-]*\.)+[a-z]{2,}$/i.test(h)) {
    push(duckduckgoFaviconUrlForDomain(h));
  }
  return out;
}

/** Primary URL for callers that only need one preview. */
export function sidebarCompetitorImageSrc(c: SidebarCompetitor): string | undefined {
  return sidebarCompetitorLogoCandidates(c)[0];
}

export function buildCompetitorSidebarHref(
  c: Pick<SidebarCompetitor, "slug" | "brand" | "logoUrl" | "libraryContext">
): string {
  const urlHost = coerceSidebarCompetitorUrlHost(c);
  return `/dashboard/competitor/${encodeURIComponent(urlHost)}`;
}

const SIDEBAR_LETTER_PALETTE = [
  "#343434",
  "#5a99b8",
  "#95C14B",
  "#0066EE",
  "#EE7624",
  "#16a34a",
  "#00B0B9",
  "#7c3aed",
  "#c2410c",
  "#0f766e",
] as const;

/** First letter for sidebar mock avatar (same idea as “Your brand” badge) */
export function competitorSidebarAvatarLetter(name: string): string {
  const t = name.trim();
  for (const ch of t) {
    if (/[a-zA-Z]/.test(ch)) return ch.toUpperCase();
  }
  const d = t.match(/\d/);
  if (d) return d[0];
  return "?";
}

/** Stable accent background per name — matches dashboard brand-switcher energy */
export function competitorSidebarAvatarColor(name: string): string {
  const s = name.trim() || "?";
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(h) % SIDEBAR_LETTER_PALETTE.length;
  return SIDEBAR_LETTER_PALETTE[idx];
}
