"use client";

import { useEffect, useState } from "react";

import { SAVED_ITEMS_CHANGED_EVENT } from "@/lib/saved-items/saved-items-events";

import type { SavedHubCapabilities, SavedHubCounts } from "./use-competitor-saved-hub";

const EMPTY_COUNTS: SavedHubCounts = { ads: 0, emails: 0, organic: 0, landings: 0, total: 0 };

export function useCompetitorSavedCount(competitorId: string, enabled: boolean) {
  const [counts, setCounts] = useState<SavedHubCounts>(EMPTY_COUNTS);
  const [capabilities, setCapabilities] = useState<SavedHubCapabilities>({
    ads: true,
    emails: true,
    organic: true,
    landings: true,
  });
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const bump = () => setRevision((n) => n + 1);
    window.addEventListener(SAVED_ITEMS_CHANGED_EVENT, bump);
    return () => window.removeEventListener(SAVED_ITEMS_CHANGED_EVENT, bump);
  }, []);

  useEffect(() => {
    if (!enabled || !competitorId.trim()) {
      setCounts(EMPTY_COUNTS);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `/api/saved-items?competitorId=${encodeURIComponent(competitorId)}&summary=1`,
          { credentials: "include" },
        );
        const json = (await res.json()) as {
          ok?: boolean;
          counts?: SavedHubCounts;
          capabilities?: SavedHubCapabilities;
        };
        if (cancelled || !json.ok) return;
        setCounts(json.counts ?? EMPTY_COUNTS);
        setCapabilities(
          json.capabilities ?? { ads: true, emails: true, organic: false, landings: false },
        );
      } catch {
        if (!cancelled) setCounts(EMPTY_COUNTS);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [competitorId, enabled, revision]);

  return { counts, capabilities, bump: () => setRevision((n) => n + 1) };
}
