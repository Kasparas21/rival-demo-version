"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

export type SavedMap = Record<string, string>;

import { invalidateSavedAdsCaches } from "@/lib/cache/cache-invalidator";
import { emitSavedItemsChanged } from "@/lib/saved-items/saved-items-events";

/** Placeholder row id while POST /api/saved-ads is in flight — UI treats as saved */
export const PENDING_SAVED_AD_ID = "__pending__";

export type LibraryItemRef = { platform: string; libraryItemId: string };

/** Stable default for optional scraped id lists (`[]` default would be a fresh array each render). */
const EMPTY_SCRAPED_IDS: readonly string[] = [];

type SavedAdsCheckResult = {
  savedMap: SavedMap;
  resolvedToScraped: Record<string, string>;
  libraryLifecycle: Record<string, { isRunning: boolean; archivedCreativeUrl?: string }>;
  libraryPreviewUrls: Record<string, string>;
  winnerScrapedAdIds: string[];
  winnerLibraryKeys: string[];
};

/** In-memory cache keyed by {@link buildSavedAdsCheckQueryKey} — survives re-renders within the session. */
const savedAdsCheckSessionCache = new Map<string, SavedAdsCheckResult>();

export function buildSavedAdsCheckQueryKey(
  competitorId: string,
  libraryItems: readonly LibraryItemRef[],
  scrapedAdIds: readonly string[] = EMPTY_SCRAPED_IDS,
): string {
  const cid = competitorId.trim();
  const libKeys = new Set<string>();
  for (const it of libraryItems) {
    const pl = it.platform.trim().toLowerCase();
    const lid = it.libraryItemId.trim();
    if (!pl || !lid) continue;
    libKeys.add(`${pl}:${lid}`);
  }
  const scrapedKeys = new Set<string>();
  for (const id of scrapedAdIds) {
    const u = id.trim();
    if (u) scrapedKeys.add(u);
  }
  return `${cid}|lib:${[...libKeys].sort().join(",")}|s:${[...scrapedKeys].sort().join(",")}`;
}

export function isAdSaved(savedMap: SavedMap, scrapedAdId: string): boolean {
  return Boolean(scrapedAdId && savedMap[scrapedAdId]);
}

/** True when any library id alias resolves to a scraped id marked saved. */
export function isLibraryItemSaved(
  savedMap: SavedMap,
  resolvedToScraped: Record<string, string>,
  platform: string,
  libraryItemId: string,
  alternateIds: readonly string[] = [],
): boolean {
  const pl = platform.trim().toLowerCase();
  for (const rawId of [libraryItemId, ...alternateIds]) {
    const id = rawId.trim();
    if (!id) continue;
    const sid = resolvedToScraped[`${pl}:${id}`];
    if (sid && savedMap[sid]) return true;
  }
  return false;
}

export function useSavedAdsStatus(
  competitorId: string,
  libraryItems: LibraryItemRef[],
  scrapedAdIds: readonly string[] | undefined = undefined,
  cacheDomainNorm?: string | null
) {
  const checkQueryKey = useMemo(
    () => buildSavedAdsCheckQueryKey(competitorId, libraryItems, scrapedAdIds ?? EMPTY_SCRAPED_IDS),
    [competitorId, libraryItems, scrapedAdIds],
  );

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

  const dedupedScrapedIds = useMemo(() => {
    const source = scrapedAdIds ?? EMPTY_SCRAPED_IDS;
    const m = new Map<string, string>();
    for (const id of source) {
      const u = id.trim();
      if (u) m.set(u, u);
    }
    return [...m.values()];
  }, [scrapedAdIds]);

  const dedupedItemsRef = useRef(dedupedItems);
  const dedupedScrapedIdsRef = useRef(dedupedScrapedIds);
  dedupedItemsRef.current = dedupedItems;
  dedupedScrapedIdsRef.current = dedupedScrapedIds;

  const emptyCheckQueryKey = useMemo(
    () => buildSavedAdsCheckQueryKey(competitorId, [], []),
    [competitorId],
  );

  const [savedMap, setSavedMap] = useState<SavedMap>({});
  const [resolvedToScraped, setResolvedToScraped] = useState<Record<string, string>>({});
  const [libraryLifecycle, setLibraryLifecycle] = useState<
    Record<string, { isRunning: boolean; archivedCreativeUrl?: string }>
  >({});
  const [libraryPreviewUrls, setLibraryPreviewUrls] = useState<Record<string, string>>({});
  const [winnerScrapedAdIds, setWinnerScrapedAdIds] = useState<string[]>([]);
  const [winnerLibraryKeys, setWinnerLibraryKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);

  const savedMapRef = useRef<SavedMap>({});
  const saveAbortByScrapedRef = useRef(new Map<string, AbortController>());
  /** Last query key we successfully fetched — prevents re-fetch loops on parent re-renders. */
  const lastFetchedKeyRef = useRef("");
  const inFlightKeyRef = useRef<string | null>(null);

  savedMapRef.current = savedMap;

  const applyCheckResult = useCallback((res: SavedAdsCheckResult) => {
    setSavedMap(res.savedMap);
    setResolvedToScraped(res.resolvedToScraped);
    setLibraryLifecycle(res.libraryLifecycle);
    setLibraryPreviewUrls(res.libraryPreviewUrls);
    setWinnerScrapedAdIds(res.winnerScrapedAdIds);
    setWinnerLibraryKeys(res.winnerLibraryKeys);
  }, []);

  useEffect(() => {
    lastFetchedKeyRef.current = "";
    inFlightKeyRef.current = null;
    setSavedMap({});
    setResolvedToScraped({});
    setLibraryLifecycle({});
    setLibraryPreviewUrls({});
    setWinnerScrapedAdIds([]);
    setWinnerLibraryKeys([]);
  }, [competitorId]);

  useLayoutEffect(() => {
    const cached = savedAdsCheckSessionCache.get(checkQueryKey);
    if (cached) {
      applyCheckResult(cached);
      lastFetchedKeyRef.current = checkQueryKey;
      setLoading(false);
    }
  }, [checkQueryKey, applyCheckResult]);

  useEffect(() => {
    const cid = competitorId.trim();

    if (!cid || checkQueryKey === emptyCheckQueryKey) {
      setSavedMap((prev) => (Object.keys(prev).length === 0 ? prev : {}));
      setResolvedToScraped((prev) => (Object.keys(prev).length === 0 ? prev : {}));
      setLibraryLifecycle((prev) => (Object.keys(prev).length === 0 ? prev : {}));
      setLibraryPreviewUrls((prev) => (Object.keys(prev).length === 0 ? prev : {}));
      setWinnerScrapedAdIds((prev) => (prev.length === 0 ? prev : []));
      setWinnerLibraryKeys((prev) => (prev.length === 0 ? prev : []));
      lastFetchedKeyRef.current = "";
      inFlightKeyRef.current = null;
      return;
    }

    if (checkQueryKey === lastFetchedKeyRef.current) return;
    if (checkQueryKey === inFlightKeyRef.current) return;

    const sessionHit = savedAdsCheckSessionCache.get(checkQueryKey);
    if (sessionHit) {
      applyCheckResult(sessionHit);
      lastFetchedKeyRef.current = checkQueryKey;
      setLoading(false);
      return;
    }

    inFlightKeyRef.current = checkQueryKey;
    let cancelled = false;
    setLoading(true);

    void fetch("/api/saved-ads/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        competitorId: cid,
        libraryItems: dedupedItemsRef.current,
        scrapedAdIds: dedupedScrapedIdsRef.current,
      }),
    })
      .then((r) => r.json())
      .then(
        (res: {
          ok?: boolean;
          savedMap?: SavedMap;
          resolvedToScraped?: Record<string, string>;
          libraryLifecycle?: Record<string, { isRunning: boolean; archivedCreativeUrl?: string }>;
          libraryPreviewUrls?: Record<string, string>;
          winnerScrapedAdIds?: string[];
          winnerLibraryKeys?: string[];
        }) => {
          if (cancelled) return;
          if (res.ok) {
            const payload: SavedAdsCheckResult = {
              savedMap: res.savedMap ?? {},
              resolvedToScraped: res.resolvedToScraped ?? {},
              libraryLifecycle: res.libraryLifecycle ?? {},
              libraryPreviewUrls: res.libraryPreviewUrls ?? {},
              winnerScrapedAdIds: res.winnerScrapedAdIds ?? [],
              winnerLibraryKeys: res.winnerLibraryKeys ?? [],
            };
            savedAdsCheckSessionCache.set(checkQueryKey, payload);
            applyCheckResult(payload);
            lastFetchedKeyRef.current = checkQueryKey;
          }
          setLoading(false);
          if (inFlightKeyRef.current === checkQueryKey) {
            inFlightKeyRef.current = null;
          }
        },
        () => {
          if (!cancelled) setLoading(false);
          if (inFlightKeyRef.current === checkQueryKey) {
            inFlightKeyRef.current = null;
          }
        },
      );

    return () => {
      cancelled = true;
    };
  }, [checkQueryKey, emptyCheckQueryKey, competitorId, refreshToken, applyCheckResult]);

  const refreshLibraryMappings = useCallback(() => {
    savedAdsCheckSessionCache.delete(
      buildSavedAdsCheckQueryKey(competitorId, libraryItems, scrapedAdIds ?? EMPTY_SCRAPED_IDS),
    );
    lastFetchedKeyRef.current = "";
    inFlightKeyRef.current = null;
    setRefreshToken((n) => n + 1);
  }, [competitorId, libraryItems, scrapedAdIds]);

  const previewUrlForCard = useCallback(
    (platform: string, libraryItemId: string, alternateIds: string[] = []) => {
      const pl = platform.trim().toLowerCase();
      for (const rawId of [libraryItemId, ...alternateIds]) {
        const id = rawId.trim();
        if (!id) continue;
        const url = libraryPreviewUrls[`${pl}:${id}`];
        if (url) return url;
      }
      return undefined;
    },
    [libraryPreviewUrls],
  );

  const scrapedIdForCard = useCallback(
    (platform: string, libraryItemId: string, alternateIds: string[] = []) => {
      const pl = platform.trim().toLowerCase();
      for (const rawId of [libraryItemId, ...alternateIds]) {
        const id = rawId.trim();
        if (!id) continue;
        const hit = resolvedToScraped[`${pl}:${id}`];
        if (hit) return hit;
      }
      return undefined;
    },
    [resolvedToScraped],
  );

  const winnerScrapedIdSet = useMemo(() => new Set(winnerScrapedAdIds), [winnerScrapedAdIds]);
  const winnerLibraryKeySet = useMemo(() => new Set(winnerLibraryKeys), [winnerLibraryKeys]);

  const isCreativeTestWinnerForCard = useCallback(
    (platform: string, libraryItemId: string, alternateIds: string[] = []) => {
      const pl = platform.trim().toLowerCase();
      for (const rawId of [libraryItemId, ...alternateIds]) {
        const id = rawId.trim();
        if (!id) continue;
        if (winnerLibraryKeySet.has(`${pl}:${id}`)) return true;
      }
      const sid = (() => {
        for (const rawId of [libraryItemId, ...alternateIds]) {
          const id = rawId.trim();
          if (!id) continue;
          const hit = resolvedToScraped[`${pl}:${id}`];
          if (hit) return hit;
        }
        return undefined;
      })();
      return Boolean(sid && winnerScrapedIdSet.has(sid));
    },
    [winnerLibraryKeySet, winnerScrapedIdSet, resolvedToScraped],
  );

  const libraryRunStatusForCard = useCallback(
    (platform: string, libraryItemId: string, alternateIds: string[] = []) => {
      const pl = platform.trim().toLowerCase();
      for (const rawId of [libraryItemId, ...alternateIds]) {
        const id = rawId.trim();
        if (!id) continue;
        const hit = libraryLifecycle[`${pl}:${id}`];
        if (hit) return hit;
      }
      return undefined;
    },
    [libraryLifecycle],
  );

  const patchSessionSavedMap = useCallback(
    (mutator: (prev: SavedMap) => SavedMap) => {
      setSavedMap((prev) => {
        const next = mutator(prev);
        const cached = savedAdsCheckSessionCache.get(checkQueryKey);
        if (cached) {
          savedAdsCheckSessionCache.set(checkQueryKey, { ...cached, savedMap: next });
        }
        return next;
      });
    },
    [checkQueryKey],
  );

  const bumpSavedAdsListCache = useCallback(() => {
    emitSavedItemsChanged();
    const dom = cacheDomainNorm?.trim().toLowerCase();
    const cid = competitorId.trim();
    if (!dom || !cid) return;
    invalidateSavedAdsCaches(dom, cid);
  }, [cacheDomainNorm, competitorId]);

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
        bumpSavedAdsListCache();
        patchSessionSavedMap((prev) => ({ ...prev, [sid]: id }));
      }
      return id;
    },
    [postSaveAd, bumpSavedAdsListCache, patchSessionSavedMap],
  );

  const unsaveAd = useCallback(async (scrapedAdId: string) => {
    const savedAdId = savedMapRef.current[scrapedAdId];
    if (!savedAdId || savedAdId === PENDING_SAVED_AD_ID) return false;
    const res = await fetch(`/api/saved-ads/${savedAdId}`, { method: "DELETE", credentials: "include" });
    const json = (await res.json()) as { ok?: boolean };
    if (json.ok) {
      bumpSavedAdsListCache();
      patchSessionSavedMap((prev) => {
        const next = { ...prev };
        delete next[scrapedAdId];
        return next;
      });
      return true;
    }
    return false;
  }, [bumpSavedAdsListCache, patchSessionSavedMap]);

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
          patchSessionSavedMap((prev) => {
            const next = { ...prev };
            delete next[sid];
            return next;
          });
          return;
        }

        const savedAdId = current;
        patchSessionSavedMap((prev) => {
          const next = { ...prev };
          delete next[sid];
          return next;
        });
        void (async () => {
          try {
            const res = await fetch(`/api/saved-ads/${savedAdId}`, { method: "DELETE", credentials: "include" });
            const json = (await res.json()) as { ok?: boolean };
            if (!json.ok) {
              patchSessionSavedMap((prev) => ({ ...prev, [sid]: savedAdId }));
            } else {
              bumpSavedAdsListCache();
            }
          } catch {
            patchSessionSavedMap((prev) => ({ ...prev, [sid]: savedAdId }));
          }
        })();
        return;
      }

      patchSessionSavedMap((prev) => ({ ...prev, [sid]: PENDING_SAVED_AD_ID }));
      const ac = new AbortController();
      saveAbortByScrapedRef.current.set(sid, ac);

      void (async () => {
        try {
          const id = await postSaveAd({ scrapedAdId: sid, notes, signal: ac.signal });
          if (ac.signal.aborted) return;
          if (id) {
            bumpSavedAdsListCache();
            patchSessionSavedMap((prev) => ({ ...prev, [sid]: id }));
          } else {
            patchSessionSavedMap((prev) => {
              const next = { ...prev };
              if (next[sid] === PENDING_SAVED_AD_ID) delete next[sid];
              return next;
            });
          }
        } catch {
          if (ac.signal.aborted) return;
          patchSessionSavedMap((prev) => {
            const next = { ...prev };
            if (next[sid] === PENDING_SAVED_AD_ID) delete next[sid];
            return next;
          });
        } finally {
          saveAbortByScrapedRef.current.delete(sid);
        }
      })();
    },
    [competitorId, scrapedIdForCard, postSaveAd, bumpSavedAdsListCache, patchSessionSavedMap],
  );

  return {
    savedMap,
    resolvedToScraped,
    libraryLifecycle,
    libraryPreviewUrls,
    loading,
    scrapedIdForCard,
    previewUrlForCard,
    libraryRunStatusForCard,
    isCreativeTestWinnerForCard,
    saveAd,
    unsaveAd,
    toggleSave,
    refreshLibraryMappings,
  };
}
