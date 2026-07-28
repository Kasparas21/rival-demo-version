"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { invalidateSavedAdsCaches } from "@/lib/cache/cache-invalidator";
import { emitSavedItemsChanged } from "@/lib/saved-items/saved-items-events";
import { PENDING_SAVED_AD_ID } from "@/lib/saved-ads/use-saved-ads";

type DiscoveryAdRef = {
  id: string;
  competitor_id: string;
};

export function useDiscoverySavedAds(ads: DiscoveryAdRef[], feedKey = "") {
  const [savedMap, setSavedMap] = useState<Record<string, string>>({});
  const savedMapRef = useRef(savedMap);
  savedMapRef.current = savedMap;
  const trackedIdsRef = useRef<Set<string>>(new Set());
  const lastFeedKeyRef = useRef(feedKey);

  useEffect(() => {
    if (feedKey === lastFeedKeyRef.current) return;
    lastFeedKeyRef.current = feedKey;
    trackedIdsRef.current = new Set();
    setSavedMap({});
  }, [feedKey]);

  const scrapedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const ad of ads) {
      if (ad.id) ids.add(ad.id);
    }
    return [...ids];
  }, [ads]);

  const idsKey = useMemo(() => scrapedIds.slice().sort().join(","), [scrapedIds]);

  useEffect(() => {
    if (!scrapedIds.length) {
      setSavedMap({});
      trackedIdsRef.current = new Set();
      return;
    }

    const newIds = scrapedIds.filter((id) => !trackedIdsRef.current.has(id));
    if (newIds.length === 0) return;

    let cancelled = false;
    void fetch("/api/saved-ads/batch-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ scrapedAdIds: newIds }),
    })
      .then((r) => r.json())
      .then((res: { ok?: boolean; savedMap?: Record<string, string> }) => {
        if (cancelled || !res.ok) return;
        for (const id of newIds) trackedIdsRef.current.add(id);
        setSavedMap((prev) => ({ ...prev, ...(res.savedMap ?? {}) }));
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [idsKey, scrapedIds]);

  const isSaved = useCallback(
    (scrapedAdId: string) => {
      const hit = savedMap[scrapedAdId];
      return Boolean(hit && hit !== PENDING_SAVED_AD_ID);
    },
    [savedMap],
  );

  const isPending = useCallback(
    (scrapedAdId: string) => savedMap[scrapedAdId] === PENDING_SAVED_AD_ID,
    [savedMap],
  );

  const toggleSave = useCallback(async (ad: DiscoveryAdRef) => {
    const sid = ad.id.trim();
    const competitorId = ad.competitor_id.trim();
    if (!sid || !competitorId) return;

    const current = savedMapRef.current[sid];

    if (current && current !== PENDING_SAVED_AD_ID) {
      const savedAdId = current;
      setSavedMap((prev) => {
        const next = { ...prev };
        delete next[sid];
        return next;
      });
      try {
        const res = await fetch(`/api/saved-ads/${savedAdId}`, { method: "DELETE", credentials: "include" });
        const json = (await res.json()) as { ok?: boolean };
        if (!json.ok) {
          setSavedMap((prev) => ({ ...prev, [sid]: savedAdId }));
        } else {
          emitSavedItemsChanged();
          invalidateSavedAdsCaches("", competitorId);
        }
      } catch {
        setSavedMap((prev) => ({ ...prev, [sid]: savedAdId }));
      }
      return;
    }

    if (current === PENDING_SAVED_AD_ID) return;

    setSavedMap((prev) => ({ ...prev, [sid]: PENDING_SAVED_AD_ID }));
    try {
      const res = await fetch("/api/saved-ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ competitorId, scrapedAdId: sid }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        savedAd?: { id: string; source_scraped_ad_id: string | null };
      };
      if (json.ok && json.savedAd?.id) {
        setSavedMap((prev) => ({ ...prev, [sid]: json.savedAd!.id }));
        emitSavedItemsChanged();
        invalidateSavedAdsCaches("", competitorId);
      } else {
        setSavedMap((prev) => {
          const next = { ...prev };
          if (next[sid] === PENDING_SAVED_AD_ID) delete next[sid];
          return next;
        });
      }
    } catch {
      setSavedMap((prev) => {
        const next = { ...prev };
        if (next[sid] === PENDING_SAVED_AD_ID) delete next[sid];
        return next;
      });
    }
  }, []);

  return { isSaved, isPending, toggleSave };
}
