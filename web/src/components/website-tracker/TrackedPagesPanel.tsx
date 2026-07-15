"use client";

import { Camera, Loader2, Radar, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { CacheRevalidatingDot } from "@/components/competitor/data-freshness-badge";
import { COMPETITOR_PAGE_SHELL, COMPETITOR_PAGE_X } from "@/components/dashboard/competitor/competitor-page-layout";
import { FeatureSectionHeader } from "@/components/dashboard/feature-section-header";
import { hostKeyFromUrl } from "@/lib/landing-pages/blocked-inheritance";
import { useSavedLandingPages } from "@/lib/saved-landing-pages/use-saved-landing-pages";
import { useScrapeKeyedCache } from "@/lib/cache/use-scrape-keyed-cache";

import { DeleteTrackedPageDialog } from "./DeleteTrackedPageDialog";
import { PageDetailDrawer } from "./PageDetailDrawer";
import { TrackedPageRowCard } from "./TrackedPageRow";
import { TrackedPagesSkeleton } from "./website-tracker-skeletons";
import { isAdLandingCandidate, type TrackedPageRow } from "./types";

type PagesResponse = {
  ok: boolean;
  pages?: TrackedPageRow[];
  error?: string;
};

type Props = {
  competitorId: string;
  competitorLabel: string;
  cacheDomainNorm: string;
  lastScrapedAt?: string | null;
  fetchEnabled?: boolean;
};

export function TrackedPagesPanel({
  competitorId,
  competitorLabel,
  cacheDomainNorm,
  lastScrapedAt,
  fetchEnabled = true,
}: Props) {
  const [detailPage, setDetailPage] = useState<TrackedPageRow | null>(null);
  const [capturingPageId, setCapturingPageId] = useState<string | null>(null);
  const [removingPageId, setRemovingPageId] = useState<string | null>(null);
  const [capturingAll, setCapturingAll] = useState(false);
  const [activatingPageId, setActivatingPageId] = useState<string | null>(null);
  const [activatingAll, setActivatingAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [removedPageIds, setRemovedPageIds] = useState<Set<string>>(() => new Set());
  const [pendingDelete, setPendingDelete] = useState<{
    pageId: string;
    label: string;
    url: string;
  } | null>(null);

  const stamp = lastScrapedAt ?? "none";
  const pagesCacheKey = `${cacheDomainNorm}:tracked-pages:${competitorId}:${stamp}`;

  const fetchPages = useCallback(async (): Promise<PagesResponse> => {
    const res = await fetch(`/api/competitor/${encodeURIComponent(competitorId)}/landing-pages`);
    const json = (await res.json()) as PagesResponse;
    if (!res.ok || !json.ok) {
      throw new Error(json.error ?? `Failed (${res.status})`);
    }
    return json;
  }, [competitorId]);

  const pagesCache = useScrapeKeyedCache<PagesResponse>({
    cacheKey: pagesCacheKey,
    fetcher: fetchPages,
    enabled: fetchEnabled && Boolean(competitorId),
  });

  const pages = (pagesCache.data?.pages ?? []).filter((p) => !removedPageIds.has(p.id));

  const pageIds = useMemo(() => pages.map((p) => p.id), [pages]);
  const {
    isSaved: isPageSaved,
    toggleSave: togglePageSave,
    savedMap: savedPagesMap,
  } = useSavedLandingPages(competitorId, pageIds);

  const filteredPages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return pages;
    return pages.filter(
      (page) =>
        page.url.toLowerCase().includes(q) ||
        page.label.toLowerCase().includes(q) ||
        page.url.replace(/^https?:\/\//i, "").toLowerCase().includes(q),
    );
  }, [pages, searchQuery]);

  const pendingCount = useMemo(
    () => pages.filter((p) => p.is_active && !p.latestSnapshot).length,
    [pages],
  );

  const inactiveAdCandidates = useMemo(() => pages.filter(isAdLandingCandidate), [pages]);

  const blockedHosts = useMemo(() => {
    const hosts = new Set<string>();
    for (const page of pages) {
      if (page.latestSnapshot?.status !== "blocked") continue;
      const host = hostKeyFromUrl(page.url);
      if (host) hosts.add(host);
    }
    return hosts;
  }, [pages]);

  const isPageHostBlocked = useCallback(
    (page: TrackedPageRow) => {
      const host = hostKeyFromUrl(page.url);
      return host ? blockedHosts.has(host) : false;
    },
    [blockedHosts],
  );

  const activatableCandidates = useMemo(
    () => inactiveAdCandidates.filter((page) => !isPageHostBlocked(page)),
    [inactiveAdCandidates, isPageHostBlocked],
  );

  const handleRefresh = useCallback(() => {
    setRemovedPageIds(new Set());
    void pagesCache.refetch();
  }, [pagesCache]);

  useEffect(() => {
    if (!pendingDelete || removingPageId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPendingDelete(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pendingDelete, removingPageId]);

  const confirmDeletePage = useCallback(async () => {
    if (!pendingDelete) return;
    const { pageId } = pendingDelete;
    setRemovingPageId(pageId);
    try {
      const res = await fetch(
        `/api/competitor/${encodeURIComponent(competitorId)}/landing-pages/${encodeURIComponent(pageId)}`,
        { method: "DELETE" },
      );
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? `Failed (${res.status})`);
      }
      setRemovedPageIds((prev) => new Set(prev).add(pageId));
      if (detailPage?.id === pageId) {
        setDetailPage(null);
      }
      setPendingDelete(null);
      toast.success("Page removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete page");
    } finally {
      setRemovingPageId(null);
    }
  }, [competitorId, detailPage?.id, pendingDelete]);

  const runCapture = useCallback(
    async (pageId?: string): Promise<boolean> => {
      if (pageId) setCapturingPageId(pageId);
      else setCapturingAll(true);
      try {
        const res = await fetch(
          `/api/competitor/${encodeURIComponent(competitorId)}/landing-pages/scrape-now`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(pageId ? { pageId } : {}),
          },
        );
        const data = (await res.json()) as {
          ok?: boolean;
          error?: string;
          succeeded?: number;
          processed?: number;
          failed?: number;
          results?: Array<{ url: string; ok: boolean; error?: string }>;
        };

        const succeeded = data.succeeded ?? 0;
        const processed = data.processed ?? 0;

        if (!res.ok) {
          throw new Error(data.error ?? `Request failed (${res.status})`);
        }

        if (succeeded === 0) {
          const message =
            data.error ?? "Could not capture this page. It may be blocking automated access.";
          throw new Error(message);
        }

        if (succeeded < processed) {
          toast.warning(`Captured ${succeeded} of ${processed} pages. Some failed — see details below.`);
          const failed = (data.results ?? []).filter((r) => !r.ok);
          if (failed.length > 0) {
            console.warn("[tracked-pages] capture failures", failed);
          }
        } else {
          toast.success(
            pageId ? "Screenshot captured" : `Captured ${succeeded} of ${processed} pages`,
          );
        }
        await pagesCache.refetch();
        return true;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Capture failed");
        return false;
      } finally {
        setCapturingPageId(null);
        setCapturingAll(false);
      }
    },
    [competitorId, pagesCache],
  );

  const requestDeletePage = useCallback((page: TrackedPageRow) => {
    setPendingDelete({ pageId: page.id, label: page.label, url: page.url });
  }, []);

  const activateSpying = useCallback(
    async (pageId: string) => {
      setActivatingPageId(pageId);
      try {
        const res = await fetch(
          `/api/competitor/${encodeURIComponent(competitorId)}/landing-pages/${encodeURIComponent(pageId)}/activate`,
          { method: "POST" },
        );
        const data = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok || !data.ok) {
          throw new Error(data.error ?? `Failed (${res.status})`);
        }
        toast.success("Spying activated — first screenshot queued");
        await pagesCache.refetch();
        void runCapture(pageId);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not activate spying");
      } finally {
        setActivatingPageId(null);
      }
    },
    [competitorId, pagesCache, runCapture],
  );

  const activateAllSpying = useCallback(async () => {
    if (inactiveAdCandidates.length === 0) return;
    setActivatingAll(true);
    try {
      const res = await fetch(
        `/api/competitor/${encodeURIComponent(competitorId)}/landing-pages/activate-all`,
        { method: "POST" },
      );
      const data = (await res.json()) as { ok?: boolean; error?: string; activated?: number };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? `Failed (${res.status})`);
      }
      const count = data.activated ?? activatableCandidates.length;
      if (count === 0) {
        toast.message("All ad URLs are already being tracked");
        return;
      }
      toast.success(`Spying started on ${count} URL${count === 1 ? "" : "s"}`);
      await pagesCache.refetch();
      void runCapture();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not track all URLs");
    } finally {
      setActivatingAll(false);
    }
  }, [activatableCandidates.length, competitorId, inactiveAdCandidates.length, pagesCache, runCapture]);

  return (
    <div className={`${COMPETITOR_PAGE_SHELL} ${COMPETITOR_PAGE_X}`}>
      <FeatureSectionHeader
        overline="Website tracking"
        title="Tracked pages"
        description={`Monitor ${competitorLabel}'s homepage automatically. Ad landing pages from scraped ads appear below — activate spying to track changes every 3 days.`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <CacheRevalidatingDot show={pagesCache.isValidating} />
            {activatableCandidates.length > 0 ? (
              <button
                type="button"
                onClick={() => void activateAllSpying()}
                disabled={activatingAll || capturingAll || Boolean(capturingPageId) || Boolean(activatingPageId)}
                className="inline-flex items-center gap-1 rounded-lg bg-[color:var(--rival-primary)] px-2.5 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-60"
              >
                {activatingAll ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Radar className="h-3.5 w-3.5" />
                )}
                Start tracking all of the urls
              </button>
            ) : null}
            {pendingCount > 0 ? (
              <button
                type="button"
                onClick={() => void runCapture()}
                disabled={capturingAll || Boolean(capturingPageId)}
                className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {capturingAll ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Camera className="h-3.5 w-3.5" />
                )}
                Capture all
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleRefresh}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
          </div>
        }
      />

      {pagesCache.loading && !pagesCache.data ? <TrackedPagesSkeleton rows={3} /> : null}

      {pages.length > 0 && !(pagesCache.loading && !pagesCache.data) ? (
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search URLs to spy on…"
          className="mb-4 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px] text-slate-900 outline-none ring-[color:var(--rival-accent-blue)]/35 placeholder:text-slate-400 focus:ring-2"
        />
      ) : null}

      {pagesCache.error ? (
        <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
          {pagesCache.error.message}
        </p>
      ) : null}

      {!(pagesCache.loading && !pagesCache.data) && !pagesCache.loading && pages.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
          No tracked pages yet. The homepage is added when you save a competitor; ad landing pages appear here after ads are scraped.
        </p>
      ) : null}

      {!(pagesCache.loading && !pagesCache.data) && !pagesCache.loading && pages.length > 0 && filteredPages.length === 0 ? (
        <p className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-8 text-center text-sm text-slate-500">
          No URLs match your search.
        </p>
      ) : null}

      {!(pagesCache.loading && !pagesCache.data) && filteredPages.length > 0 ? (
        <div className="space-y-3">
          {filteredPages.map((page) => (
            <TrackedPageRowCard
              key={page.id}
              page={page}
              hostBlocked={isPageHostBlocked(page)}
              capturing={capturingPageId === page.id || capturingAll}
              activating={activatingAll || activatingPageId === page.id}
              removing={removingPageId === page.id}
              onOpenDetail={page.is_active ? () => setDetailPage(page) : undefined}
              onCaptureNow={page.is_active ? () => void runCapture(page.id) : undefined}
              onActivateSpying={isAdLandingCandidate(page) ? () => void activateSpying(page.id) : undefined}
              onRemove={() => requestDeletePage(page)}
              isSaved={isPageSaved(page.id) || Boolean(savedPagesMap[page.id])}
              onToggleSave={() => void togglePageSave(page.id)}
            />
          ))}
        </div>
      ) : null}

      <PageDetailDrawer
        competitorId={competitorId}
        pageId={detailPage?.id ?? null}
        seedPage={detailPage}
        onClose={() => setDetailPage(null)}
        onUpdated={handleRefresh}
        onCaptureNow={(id) => runCapture(id)}
        onDelete={detailPage ? () => requestDeletePage(detailPage) : undefined}
        deleting={Boolean(detailPage && removingPageId === detailPage.id)}
        capturing={Boolean(detailPage && (capturingPageId === detailPage.id || capturingAll))}
      />

      {pendingDelete ? (
        <DeleteTrackedPageDialog
          label={pendingDelete.label}
          url={pendingDelete.url}
          deleting={removingPageId === pendingDelete.pageId}
          onDismiss={() => {
            if (removingPageId) return;
            setPendingDelete(null);
          }}
          onConfirm={() => void confirmDeletePage()}
        />
      ) : null}
    </div>
  );
}
