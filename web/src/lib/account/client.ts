"use client";

import type { SavedCompetitorPayload, SavedSearchPayload } from "./types";
import { hoistLogoOntoRow, upsertSidebarCompetitor, WORKSPACE_BRAND_PLACEHOLDER_SLUG, type SidebarCompetitor } from "@/lib/sidebar-competitors";

/** Persist DB UUIDs locally after POST so Ad Library clicks/saves/analytics unblock before layout GET merges. */
function patchSidebarSavedCompetitorDbIds(payload: unknown) {
  if (payload === null || typeof payload !== "object") return;
  const list = (payload as { competitors?: unknown }).competitors;
  if (!Array.isArray(list)) return;
  for (const row of list) {
    if (row === null || typeof row !== "object") continue;
    const o = row as { slug?: unknown; savedCompetitorDbId?: unknown };
    const slug = typeof o.slug === "string" ? o.slug.trim() : "";
    const savedCompetitorDbId =
      typeof o.savedCompetitorDbId === "string" ? o.savedCompetitorDbId.trim() : "";
    if (!slug || !savedCompetitorDbId) continue;
    if (slug.toLowerCase().replace(/^www\./, "") === WORKSPACE_BRAND_PLACEHOLDER_SLUG) continue;
    upsertSidebarCompetitor({ slug, savedCompetitorDbId });
  }
}

async function safeJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

/** JSON body for POST `/api/account/saved-competitors` — includes `adsLibraryContext` when present. */
export function sidebarCompetitorToAccountPayload(
  h: SidebarCompetitor & Partial<Pick<SavedCompetitorPayload, "adsLibraryContext">>,
): SavedCompetitorPayload {
  const payload: SavedCompetitorPayload = {
    slug: h.slug,
    name: h.name,
    logoUrl: h.logoUrl,
    brand: h.brand,
    pending: h.pending,
    lastScrapedAt: h.lastScrapedAt,
  };

  const fromExplicit = h.adsLibraryContext;
  const lc = h.libraryContext;
  const source =
    fromExplicit !== undefined
      ? fromExplicit
      : lc &&
          (lc.ids ||
            lc.channels?.length ||
            lc.confirmed !== undefined ||
            (lc.regions && Object.keys(lc.regions).length > 0))
        ? {
            ...(lc.ids && Object.keys(lc.ids).length > 0 ? { ids: { ...lc.ids } } : {}),
            ...(lc.channels?.length ? { channels: [...lc.channels] } : {}),
            ...(lc.confirmed !== undefined ? { confirmed: lc.confirmed } : {}),
            ...(lc.regions && Object.keys(lc.regions).length > 0 ? { regions: { ...lc.regions } } : {}),
          }
        : undefined;

  if (source !== undefined) {
    if (source === null) {
      payload.adsLibraryContext = null;
    } else {
      payload.adsLibraryContext = {
        ...(source.ids && Object.keys(source.ids).length > 0 ? { ids: { ...source.ids } } : {}),
        ...(source.channels?.length ? { channels: [...source.channels] } : {}),
        ...(source.confirmed !== undefined ? { confirmed: source.confirmed } : {}),
        ...(source.regions && Object.keys(source.regions).length > 0
          ? { regions: { ...source.regions } }
          : {}),
      };
    }
  }

  return payload;
}

function normalizeForAccountApi(h: SidebarCompetitor): SavedCompetitorPayload {
  return sidebarCompetitorToAccountPayload(hoistLogoOntoRow(h));
}

export async function saveCompetitorToAccount(
  competitor: SavedCompetitorPayload,
  brandId?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const hoisted = hoistLogoOntoRow(competitor as SidebarCompetitor);
    const response = await fetch("/api/account/saved-competitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ competitor: normalizeForAccountApi(hoisted), ...(brandId ? { brandId } : {}) }),
    });
    const payload = await safeJson(response);
    if (!response.ok) {
      return {
        ok: false,
        error: typeof payload?.error === "string" ? payload.error : "Could not save competitor.",
      };
    }
    if (competitor.isWorkspaceBrand !== true) {
      patchSidebarSavedCompetitorDbIds(payload);
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Network error while saving competitor." };
  }
}

export async function syncCompetitorsToAccount(competitors: SavedCompetitorPayload[], brandId?: string) {
  try {
    const hoisted = competitors.map((c) =>
      normalizeForAccountApi(hoistLogoOntoRow(c as SidebarCompetitor)),
    );
    const response = await fetch("/api/account/saved-competitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ competitors: hoisted, ...(brandId ? { brandId } : {}) }),
    });
    const payload = await safeJson(response);
    if (response.ok) patchSidebarSavedCompetitorDbIds(payload);
  } catch {
    // Local storage remains the fallback source.
  }
}

export async function fetchSavedCompetitorsFromAccount(brandId?: string) {
  try {
    const qs = brandId ? `?brandId=${encodeURIComponent(brandId)}` : "";
    const response = await fetch(`/api/account/saved-competitors${qs}`, {
      method: "GET",
      cache: "no-store",
    });
    if (!response.ok) return [];
    const payload = await safeJson(response);
    return Array.isArray(payload?.competitors) ? payload.competitors : [];
  } catch {
    return [];
  }
}

export async function deleteSavedCompetitorFromAccount(
  slug: string,
  cacheDomain: string,
  brandId?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const response = await fetch("/api/account/saved-competitors", {
      method: "DELETE",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, cacheDomain, ...(brandId ? { brandId } : {}) }),
    });
    const payload = await safeJson(response);
    if (!response.ok || !payload?.ok) {
      return { ok: false, error: typeof payload?.error === "string" ? payload.error : "Remove failed." };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Network error while removing competitor." };
  }
}

export async function saveSearchToAccount(search: SavedSearchPayload) {
  try {
    await fetch("/api/account/saved-searches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(search),
    });
  } catch {
    // Ignore backend failures during search flow.
  }
}
