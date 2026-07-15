"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { emitSavedItemsChanged } from "@/lib/saved-items/saved-items-events";

const PENDING_ID = "__pending__";

type SavedMap = Record<string, string>;

/**
 * Saved-status + toggle for landing pages.
 * Keyed by landing_pages.id → saved_landing_pages.id.
 */
export function useSavedLandingPages(competitorId: string, pageIds: string[]) {
  const [savedMap, setSavedMap] = useState<SavedMap>({});

  const idsKey = useMemo(() => [...pageIds].sort().join(","), [pageIds]);

  useEffect(() => {
    const cid = competitorId.trim();
    if (!cid || !idsKey) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/saved-landing-pages/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ competitorId: cid, pageIds: idsKey.split(",") }),
        });
        const json = (await res.json()) as { ok?: boolean; savedMap?: SavedMap };
        if (cancelled || !json.ok) return;
        setSavedMap((prev) => ({ ...prev, ...(json.savedMap ?? {}) }));
      } catch {
        // best-effort
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [competitorId, idsKey]);

  const isSaved = useCallback(
    (pageId: string) => Boolean(savedMap[pageId]),
    [savedMap],
  );

  const toggleSave = useCallback(
    async (pageId: string) => {
      const existing = savedMap[pageId];
      if (existing === PENDING_ID) return;

      if (existing) {
        setSavedMap((prev) => {
          const next = { ...prev };
          delete next[pageId];
          return next;
        });
        const res = await fetch(`/api/saved-landing-pages/${existing}`, {
          method: "DELETE",
          credentials: "include",
        });
        const json = (await res.json()) as { ok?: boolean };
        if (!json.ok) {
          setSavedMap((prev) => ({ ...prev, [pageId]: existing }));
          return;
        }
        emitSavedItemsChanged();
        return;
      }

      setSavedMap((prev) => ({ ...prev, [pageId]: PENDING_ID }));
      const res = await fetch("/api/saved-landing-pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ landingPageId: pageId }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        savedLandingPage?: { id: string };
      };
      if (json.ok && json.savedLandingPage?.id) {
        const savedId = json.savedLandingPage.id;
        setSavedMap((prev) => ({ ...prev, [pageId]: savedId }));
        emitSavedItemsChanged();
      } else {
        setSavedMap((prev) => {
          const next = { ...prev };
          delete next[pageId];
          return next;
        });
      }
    },
    [savedMap],
  );

  return { savedMap, isSaved, toggleSave };
}
