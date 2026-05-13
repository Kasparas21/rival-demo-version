"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type SavedMap = Record<string, string>;

export type LibraryItemRef = { platform: string; libraryItemId: string };

export function isAdSaved(savedMap: SavedMap, scrapedAdId: string): boolean {
  return Boolean(scrapedAdId && savedMap[scrapedAdId]);
}

export function useSavedAdsStatus(competitorId: string, libraryItems: LibraryItemRef[]) {
  const [savedMap, setSavedMap] = useState<SavedMap>({});
  const [resolvedToScraped, setResolvedToScraped] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const lastKeyRef = useRef("");

  const dedupedItems = useMemo(() => {
    const m = new Map<string, LibraryItemRef>();
    for (const it of libraryItems) {
      const pl = it.platform.trim().toLowerCase();
      const lid = it.libraryItemId.trim();
      if (!pl || !lid) continue;
      m.set(`${pl}:${lid}`, { platform: pl, libraryItemId: lid });
    }
    return [...m.values()];
  }, [libraryItems]);

  useEffect(() => {
    const cid = competitorId.trim();
    if (!cid || dedupedItems.length === 0) {
      setSavedMap({});
      setResolvedToScraped({});
      lastKeyRef.current = "";
      return;
    }

    const queryKey = `${cid}|${dedupedItems.map((i) => `${i.platform}:${i.libraryItemId}`).sort().join(",")}`;
    if (queryKey === lastKeyRef.current) return;
    lastKeyRef.current = queryKey;

    let cancelled = false;
    setLoading(true);
    void fetch("/api/saved-ads/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        competitorId: cid,
        libraryItems: dedupedItems,
      }),
    })
      .then((r) => r.json())
      .then(
        (res: { ok?: boolean; savedMap?: SavedMap; resolvedToScraped?: Record<string, string> }) => {
          if (cancelled) return;
          if (res.ok) {
            setSavedMap(res.savedMap ?? {});
            setResolvedToScraped(res.resolvedToScraped ?? {});
          }
          setLoading(false);
        },
        () => {
          if (!cancelled) setLoading(false);
        },
      );

    return () => {
      cancelled = true;
    };
  }, [competitorId, dedupedItems]);

  const scrapedIdForCard = useCallback(
    (platform: string, libraryItemId: string) => {
      const key = `${platform.trim().toLowerCase()}:${libraryItemId.trim()}`;
      return resolvedToScraped[key];
    },
    [resolvedToScraped],
  );

  const saveAd = useCallback(
    async (args: { scrapedAdId?: string; platform?: string; libraryItemId?: string; notes?: string | null }) => {
      const cid = competitorId.trim();
      if (!cid) return null;
      const res = await fetch("/api/saved-ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          competitorId: cid,
          scrapedAdId: args.scrapedAdId,
          platform: args.platform,
          libraryItemId: args.libraryItemId,
          notes: args.notes,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; savedAd?: { id: string; source_scraped_ad_id: string | null } };
      if (json.ok && json.savedAd?.source_scraped_ad_id) {
        setSavedMap((prev) => ({ ...prev, [json.savedAd!.source_scraped_ad_id!]: json.savedAd!.id }));
        return json.savedAd.id;
      }
      return null;
    },
    [competitorId],
  );

  const unsaveAd = useCallback(async (scrapedAdId: string) => {
    const savedAdId = savedMap[scrapedAdId];
    if (!savedAdId) return false;
    const res = await fetch(`/api/saved-ads/${savedAdId}`, { method: "DELETE", credentials: "include" });
    const json = (await res.json()) as { ok?: boolean };
    if (json.ok) {
      setSavedMap((prev) => {
        const next = { ...prev };
        delete next[scrapedAdId];
        return next;
      });
      return true;
    }
    return false;
  }, [savedMap]);

  const toggleSave = useCallback(
    async (platform: string, libraryItemId: string, notes?: string | null) => {
      let sid = scrapedIdForCard(platform, libraryItemId);
      if (!sid) {
        const cid = competitorId.trim();
        if (!cid) return;
        const res = await fetch("/api/saved-ads/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            competitorId: cid,
            libraryItems: [{ platform, libraryItemId }],
          }),
        });
        const json = (await res.json()) as { ok?: boolean; resolvedToScraped?: Record<string, string> };
        if (!json.ok || !json.resolvedToScraped) return;
        const key = `${platform.trim().toLowerCase()}:${libraryItemId.trim()}`;
        sid = json.resolvedToScraped[key];
        if (sid) setResolvedToScraped((prev) => ({ ...prev, ...json.resolvedToScraped }));
      }

      if (!sid) return;

      if (savedMap[sid]) {
        await unsaveAd(sid);
        return;
      }
      await saveAd({ scrapedAdId: sid, notes: notes ?? undefined });
    },
    [competitorId, scrapedIdForCard, savedMap, saveAd, unsaveAd],
  );

  return { savedMap, resolvedToScraped, loading, scrapedIdForCard, saveAd, unsaveAd, toggleSave };
}
