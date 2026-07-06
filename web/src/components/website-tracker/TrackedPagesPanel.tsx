"use client";

import { Camera, Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { CacheRevalidatingDot } from "@/components/competitor/data-freshness-badge";
import { COMPETITOR_PAGE_SHELL, COMPETITOR_PAGE_X } from "@/components/dashboard/competitor/competitor-page-layout";
import { FeatureSectionHeader } from "@/components/dashboard/feature-section-header";
import { useScrapeKeyedCache } from "@/lib/cache/use-scrape-keyed-cache";

import { ChangeCard } from "./ChangeCard";
import { DeleteTrackedPageDialog } from "./DeleteTrackedPageDialog";
import { PageDetailDrawer } from "./PageDetailDrawer";
import { TrackedPageRowCard } from "./TrackedPageRow";
import type { LandingPageChangeRow, TrackedPageRow } from "./types";

type PagesResponse = {
  ok: boolean;
  pages?: TrackedPageRow[];
  error?: string;
};

type ChangesResponse = {
  ok: boolean;
  changes?: Array<
    LandingPageChangeRow & {
      prev_screenshot_url?: string | null;
      prev_hero_screenshot_url?: string | null;
    }
  >;
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

  const changesCacheKey = `${cacheDomainNorm}:tracked-changes:${competitorId}:${stamp}`;
  const fetchChanges = useCallback(async (): Promise<ChangesResponse> => {
    const res = await fetch(`/api/competitor/${encodeURIComponent(competitorId)}/landing-pages/changes?limit=20`);
    const json = (await res.json()) as ChangesResponse;
    if (!res.ok || !json.ok) {
      throw new Error(json.error ?? `Failed (${res.status})`);
    }
    return json;
  }, [competitorId]);

  const changesCache = useScrapeKeyedCache<ChangesResponse>({
    cacheKey: changesCacheKey,
    fetcher: fetchChanges,
    enabled: fetchEnabled && Boolean(competitorId),
  });

  const pages = (pagesCache.data?.pages ?? []).filter((p) => !removedPageIds.has(p.id));
  const changes = changesCache.data?.changes ?? [];

  const pendingCount = useMemo(
    () => pages.filter((p) => !p.latestSnapshot).length,
    [pages],
  );

  const handleRefresh = useCallback(() => {
    setRemovedPageIds(new Set());
    void pagesCache.refetch();
    void changesCache.refetch();
  }, [changesCache, pagesCache]);

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
      void changesCache.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete page");
    } finally {
      setRemovingPageId(null);
    }
  }, [changesCache, competitorId, detailPage?.id, pendingDelete]);

  const requestDeletePage = useCallback((page: TrackedPageRow) => {
    setPendingDelete({ pageId: page.id, label: page.label, url: page.url });
  }, []);

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
        await changesCache.refetch();
        return true;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Capture failed");
        return false;
      } finally {
        setCapturingPageId(null);
        setCapturingAll(false);
      }
    },
    [changesCache, competitorId, pagesCache],
  );

  return (
    <div className={`${COMPETITOR_PAGE_SHELL} ${COMPETITOR_PAGE_X}`}>
      <FeatureSectionHeader
        overline="Website tracking"
        title="Tracked pages"
        description={`Monitor ${competitorLabel}'s homepage and ad landing pages for visual and copy changes every 3 days.`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <CacheRevalidatingDot show={pagesCache.isValidating || changesCache.isValidating} />
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

      {pagesCache.loading && !pagesCache.data ? (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : null}

      {pagesCache.error ? (
        <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
          {pagesCache.error.message}
        </p>
      ) : null}

      {!pagesCache.loading && pages.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
          No tracked pages yet. The homepage is added when you save a competitor; ad landing pages appear after ads are scraped.
        </p>
      ) : (
        <div className="space-y-3">
          {pages.map((page) => (
            <TrackedPageRowCard
              key={page.id}
              page={page}
              capturing={capturingPageId === page.id || capturingAll}
              removing={removingPageId === page.id}
              onOpenDetail={() => setDetailPage(page)}
              onCaptureNow={() => void runCapture(page.id)}
              onRemove={() => requestDeletePage(page)}
            />
          ))}
        </div>
      )}

      {changes.length > 0 ? (
        <div className="mt-8">
          <FeatureSectionHeader
            overline="Website tracking"
            title="Latest changes"
            description="Meaningful visual changes detected on tracked pages."
          />
          <div className="mt-3 space-y-3">
            {changes.map((change) => (
              <ChangeCard
                key={change.id}
                change={change}
                prevScreenshotUrl={change.prev_screenshot_url}
                prevHeroScreenshotUrl={change.prev_hero_screenshot_url}
              />
            ))}
          </div>
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
