"use client";

import type { SavedCompetitorPayload, SavedSearchPayload } from "./types";

async function safeJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function saveCompetitorToAccount(competitor: SavedCompetitorPayload) {
  try {
    await fetch("/api/account/saved-competitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ competitor }),
    });
  } catch {
    // Keep local UX resilient even if the backend is offline.
  }
}

export async function syncCompetitorsToAccount(competitors: SavedCompetitorPayload[]) {
  try {
    await fetch("/api/account/saved-competitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ competitors }),
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
