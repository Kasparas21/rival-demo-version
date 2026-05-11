"use client";

import type { SavedCompetitorPayload, SavedSearchPayload } from "./types";
import { hoistLogoOntoRow, type SidebarCompetitor } from "@/lib/sidebar-competitors";

async function safeJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

/** JSON body for POST `/api/account/saved-competitors` — includes `adsLibraryContext` when present. */
export function sidebarCompetitorToAccountPayload(h: SidebarCompetitor): SavedCompetitorPayload {
  const payload: SavedCompetitorPayload = {
    slug: h.slug,
    name: h.name,
    logoUrl: h.logoUrl,
    brand: h.brand,
    pending: h.pending,
    lastScrapedAt: h.lastScrapedAt,
  };
  const lc = h.libraryContext;
  if (lc && (lc.ids || lc.channels?.length || lc.confirmed !== undefined)) {
    payload.adsLibraryContext = {
      ...(lc.ids && Object.keys(lc.ids).length > 0 ? { ids: { ...lc.ids } } : {}),
      ...(lc.channels?.length ? { channels: [...lc.channels] } : {}),
      ...(lc.confirmed !== undefined ? { confirmed: lc.confirmed } : {}),
    };
  }
  return payload;
}

function normalizeForAccountApi(h: SidebarCompetitor): SavedCompetitorPayload {
  return sidebarCompetitorToAccountPayload(hoistLogoOntoRow(h));
}

export async function saveCompetitorToAccount(
  competitor: SavedCompetitorPayload
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const hoisted = hoistLogoOntoRow(competitor as SidebarCompetitor);
    const response = await fetch("/api/account/saved-competitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ competitor: normalizeForAccountApi(hoisted) }),
    });
    const payload = await safeJson(response);
    if (!response.ok) {
      return {
        ok: false,
        error: typeof payload?.error === "string" ? payload.error : "Could not save competitor.",
      };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Network error while saving competitor." };
  }
}

export async function syncCompetitorsToAccount(competitors: SavedCompetitorPayload[]) {
  try {
    const hoisted = competitors.map((c) =>
      normalizeForAccountApi(hoistLogoOntoRow(c as SidebarCompetitor)),
    );
    await fetch("/api/account/saved-competitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ competitors: hoisted }),
    });
  } catch {
    // Local storage remains the fallback source.
  }
}

export async function fetchSavedCompetitorsFromAccount() {
  try {
    const response = await fetch("/api/account/saved-competitors", {
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
  cacheDomain: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const response = await fetch("/api/account/saved-competitors", {
      method: "DELETE",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, cacheDomain }),
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
