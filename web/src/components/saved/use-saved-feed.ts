"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { DEFAULT_SAVED_TOOLBAR, type SavedFeedTab, type SavedToolbarState } from "@/components/saved/saved-types";
import { SAVED_ITEMS_CHANGED_EVENT } from "@/lib/saved-items/saved-items-events";
import type { SavedCompetitorChip, SavedFeedItem, SavedFeedResult, SavedTypeCounts } from "@/lib/saved/types";

function buildSavedFeedUrl(
  brandId: string,
  toolbar: SavedToolbarState,
  offset: number,
  search: string,
): string {
  const params = new URLSearchParams();
  params.set("brandId", brandId);
  params.set("offset", String(offset));
  params.set("limit", "24");
  params.set("sort", toolbar.sort);
  params.set("type", toolbar.itemType);
  params.set("format", toolbar.format);
  params.set("date", toolbar.datePreset);
  if (toolbar.competitorId) params.set("competitorId", toolbar.competitorId);
  if (search.trim()) params.set("q", search.trim());
  if (toolbar.selectedPlatforms.size > 0) {
    params.set("platforms", [...toolbar.selectedPlatforms].join(","));
  }
  return `/api/saved/feed?${params.toString()}`;
}

const EMPTY_TYPE_COUNTS: SavedTypeCounts = {
  ads: 0,
  emails: 0,
  organic: 0,
  landings: 0,
  total: 0,
};

export function useSavedFeed(brandId: string | null) {
  const enabled = Boolean(brandId && brandId !== "default");

  const [tab, setTab] = useState<SavedFeedTab>("all");
  const [toolbar, setToolbar] = useState<SavedToolbarState>(DEFAULT_SAVED_TOOLBAR);
  const [searchDebounced, setSearchDebounced] = useState("");

  const [items, setItems] = useState<SavedFeedItem[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [competitors, setCompetitors] = useState<SavedCompetitorChip[]>([]);
  const [typeCounts, setTypeCounts] = useState<SavedTypeCounts>(EMPTY_TYPE_COUNTS);
  const [platformCounts, setPlatformCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  const toolbarRef = useRef(toolbar);
  toolbarRef.current = toolbar;

  useEffect(() => {
    const t = window.setTimeout(() => setSearchDebounced(toolbar.search), 300);
    return () => window.clearTimeout(t);
  }, [toolbar.search]);

  const fetchKey = useMemo(() => {
    if (!enabled || !brandId) return "";
    return JSON.stringify({
      brandId,
      toolbar: {
        ...toolbar,
        selectedPlatforms: [...toolbar.selectedPlatforms].sort(),
      },
      search: searchDebounced,
      revision,
    });
  }, [brandId, enabled, revision, searchDebounced, toolbar]);

  const loadPage = useCallback(
    async (pageOffset: number, append: boolean) => {
      if (!brandId || !enabled) return;
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);
      try {
        const res = await fetch(buildSavedFeedUrl(brandId, toolbarRef.current, pageOffset, searchDebounced), {
          credentials: "include",
        });
        const json = (await res.json()) as SavedFeedResult | { error?: string };
        if (!res.ok || !("items" in json)) {
          throw new Error(("error" in json && json.error) || "Failed to load saved items");
        }
        setItems((prev) => (append ? [...prev, ...json.items] : json.items));
        setTotal(json.total);
        setHasMore(json.has_more);
        setOffset(pageOffset + json.items.length);
        setCompetitors(json.competitors);
        setTypeCounts(json.type_counts);
        setPlatformCounts(json.platform_counts);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load saved items");
        if (!append) setItems([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [brandId, enabled, searchDebounced],
  );

  useEffect(() => {
    if (!fetchKey) return;
    void loadPage(0, false);
  }, [fetchKey, loadPage]);

  useEffect(() => {
    const onChanged = () => setRevision((n) => n + 1);
    window.addEventListener(SAVED_ITEMS_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(SAVED_ITEMS_CHANGED_EVENT, onChanged);
  }, []);

  const selectTab = useCallback((next: SavedFeedTab) => {
    setTab(next);
    setToolbar((prev) => ({
      ...prev,
      itemType: next === "all" ? "all" : next,
    }));
  }, []);

  const patchToolbar = useCallback((patch: Partial<SavedToolbarState>) => {
    setToolbar((prev) => {
      const next = { ...prev, ...patch };
      if (patch.itemType !== undefined) {
        setTab(patch.itemType === "all" ? "all" : patch.itemType);
      }
      return next;
    });
  }, []);

  const loadMore = useCallback(() => {
    if (!hasMore || loading || loadingMore) return;
    void loadPage(offset, true);
  }, [hasMore, loadPage, loading, loadingMore, offset]);

  const refresh = useCallback(() => setRevision((n) => n + 1), []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    setTotal((t) => Math.max(0, t - 1));
    setTypeCounts((c) => {
      const item = items.find((i) => i.id === id);
      if (!item) return c;
      const key =
        item.item_type === "ad"
          ? "ads"
          : item.item_type === "email"
            ? "emails"
            : item.item_type === "organic"
              ? "organic"
              : "landings";
      return { ...c, [key]: Math.max(0, c[key] - 1), total: Math.max(0, c.total - 1) };
    });
  }, [items]);

  return {
    tab,
    selectTab,
    toolbar,
    patchToolbar,
    items,
    total,
    competitors,
    typeCounts,
    platformCounts,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    refresh,
    removeItem,
  };
}
