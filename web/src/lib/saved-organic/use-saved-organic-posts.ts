"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { emitSavedItemsChanged } from "@/lib/saved-items/saved-items-events";

const PENDING_ID = "__pending__";

type SavedMap = Record<string, string>;

/**
 * Saved-status + toggle for organic posts.
 * Keyed by organic_posts.id → saved_organic_posts.id.
 */
export function useSavedOrganicPosts(competitorId: string, postIds: string[]) {
  const [savedMap, setSavedMap] = useState<SavedMap>({});

  const idsKey = useMemo(() => [...postIds].sort().join(","), [postIds]);

  useEffect(() => {
    const cid = competitorId.trim();
    if (!cid || !idsKey) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/saved-organic-posts/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ competitorId: cid, postIds: idsKey.split(",") }),
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
    (postId: string) => Boolean(savedMap[postId]),
    [savedMap],
  );

  const toggleSave = useCallback(
    async (postId: string) => {
      const existing = savedMap[postId];
      if (existing === PENDING_ID) return;

      if (existing) {
        setSavedMap((prev) => {
          const next = { ...prev };
          delete next[postId];
          return next;
        });
        const res = await fetch(`/api/saved-organic-posts/${existing}`, {
          method: "DELETE",
          credentials: "include",
        });
        const json = (await res.json()) as { ok?: boolean };
        if (!json.ok) {
          setSavedMap((prev) => ({ ...prev, [postId]: existing }));
          return;
        }
        emitSavedItemsChanged();
        return;
      }

      setSavedMap((prev) => ({ ...prev, [postId]: PENDING_ID }));
      const res = await fetch("/api/saved-organic-posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ organicPostId: postId }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        savedOrganicPost?: { id: string };
      };
      if (json.ok && json.savedOrganicPost?.id) {
        const savedId = json.savedOrganicPost.id;
        setSavedMap((prev) => ({ ...prev, [postId]: savedId }));
        emitSavedItemsChanged();
      } else {
        setSavedMap((prev) => {
          const next = { ...prev };
          delete next[postId];
          return next;
        });
      }
    },
    [savedMap],
  );

  return { savedMap, isSaved, toggleSave };
}
