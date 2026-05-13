"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type SavedMap = Record<string, string>;

/** Placeholder row id while POST /api/saved-ads is in flight — UI treats as saved */
export const PENDING_SAVED_AD_ID = "__pending__";

export type LibraryItemRef = { platform: string; libraryItemId: string };

export function isAdSaved(savedMap: SavedMap, scrapedAdId: string): boolean {
  return Boolean(scrapedAdId && savedMap[scrapedAdId]);
}

export function useSavedAdsStatus(competitorId: string, libraryItems: LibraryItemRef[]) {
  const [savedMap, setSavedMap] = useState<SavedMap>({});
  const [resolvedToScraped, setResolvedToScraped] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const lastKeyRef = useRef("");
  const savedMapRef = useRef<SavedMap>({});
  const saveAbortByScrapedRef = useRef(new Map<string, AbortController>());

  savedMapRef.current = savedMap;

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

  const postSaveAd = useCallback(
    async (args: {
      scrapedAdId?: string;
      platform?: string;
      libraryItemId?: string;
      notes?: string | null;
      signal?: AbortSignal;
    }) => {
      const cid = competitorId.trim();
      if (!cid) return null;
      const res = await fetch("/api/saved-ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        signal: args.signal,
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
        return json.savedAd.id;
      }
      return null;
    },
    [competitorId],
  );

  const saveAd = useCallback(
    async (args: { scrapedAdId?: string; platform?: string; libraryItemId?: string; notes?: string | null }) => {
      const id = await postSaveAd({ ...args });
      const sid = args.scrapedAdId?.trim();
      if (id && sid) {
        setSavedMap((prev) => ({ ...prev, [sid]: id }));
      }
      return id;
    },
    [postSaveAd],
  );

  const unsaveAd = useCallback(async (scrapedAdId: string) => {
    const savedAdId = savedMapRef.current[scrapedAdId];
    if (!savedAdId || savedAdId === PENDING_SAVED_AD_ID) return false;
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
  }, []);

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

      const current = savedMapRef.current[sid];

      if (current) {
        if (current === PENDING_SAVED_AD_ID) {
          saveAbortByScrapedRef.current.get(sid)?.abort();
          saveAbortByScrapedRef.current.delete(sid);
          setSavedMap((prev) => {
            const next = { ...prev };
            delete next[sid];
            return next;
          });
          return;
        }

        const savedAdId = current;
        setSavedMap((prev) => {
          const next = { ...prev };
          delete next[sid];
          return next;
        });
        void (async () => {
          try {
            const res = await fetch(`/api/saved-ads/${savedAdId}`, { method: "DELETE", credentials: "include" });
            const json = (await res.json()) as { ok?: boolean };
            if (!json.ok) {
              setSavedMap((prev) => ({ ...prev, [sid]: savedAdId }));
            }
          } catch {
            setSavedMap((prev) => ({ ...prev, [sid]: savedAdId }));
          }
        })();
        return;
      }

      setSavedMap((prev) => ({ ...prev, [sid]: PENDING_SAVED_AD_ID }));
      const ac = new AbortController();
      saveAbortByScrapedRef.current.set(sid, ac);

      void (async () => {
        try {
          const id = await postSaveAd({ scrapedAdId: sid, notes, signal: ac.signal });
          if (ac.signal.aborted) return;
          if (id) {
            setSavedMap((prev) => ({ ...prev, [sid]: id }));
          } else {
            setSavedMap((prev) => {
              const next = { ...prev };
              if (next[sid] === PENDING_SAVED_AD_ID) delete next[sid];
              return next;
            });
          }
        } catch {
          if (ac.signal.aborted) return;
          setSavedMap((prev) => {
            const next = { ...prev };
            if (next[sid] === PENDING_SAVED_AD_ID) delete next[sid];
            return next;
          });
        } finally {
          saveAbortByScrapedRef.current.delete(sid);
        }
      })();
    },
    [competitorId, scrapedIdForCard, postSaveAd],
  );

  return { savedMap, resolvedToScraped, loading, scrapedIdForCard, saveAd, unsaveAd, toggleSave };
}
