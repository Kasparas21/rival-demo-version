/**
 * POST /api/saved-ads/check, merged across callers. The competitor page mounts several sections that each
 * check their own ads for the same competitor at the same moment; requests made within one short window are
 * sent as one call (up to MAX_ITEMS ads), and every caller gets the merged result — all maps are keyed by id,
 * so extra entries for other sections' ads are harmless.
 */

const BATCH_WINDOW_MS = 25;
/** Keeps the server's `.in(...)` lookups well under URL length limits. */
const MAX_ITEMS = 150;

export type SavedAdsCheckRequest = {
  competitorId: string;
  libraryItems?: Array<{ platform: string; libraryItemId: string }>;
  scrapedAdIds?: string[];
};

type Pending = {
  competitorId: string;
  libraryItems: Map<string, { platform: string; libraryItemId: string }>;
  scrapedAdIds: Set<string>;
  waiters: Array<{ resolve: (v: unknown) => void; reject: (e: unknown) => void }>;
  timer: ReturnType<typeof setTimeout>;
};

const pendingByCompetitor = new Map<string, Pending>();

function size(p: Pending): number {
  return p.libraryItems.size + p.scrapedAdIds.size;
}

function flush(p: Pending): void {
  if (pendingByCompetitor.get(p.competitorId) === p) pendingByCompetitor.delete(p.competitorId);
  clearTimeout(p.timer);
  const body = JSON.stringify({
    competitorId: p.competitorId,
    libraryItems: [...p.libraryItems.values()],
    scrapedAdIds: [...p.scrapedAdIds],
  });
  fetch("/api/saved-ads/check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body,
  })
    .then((r) => r.json())
    .then(
      (json: unknown) => p.waiters.forEach((w) => w.resolve(structuredClone(json))),
      (e) => p.waiters.forEach((w) => w.reject(e)),
    );
}

export function checkSavedAdsBatched<T = unknown>(req: SavedAdsCheckRequest): Promise<T> {
  const competitorId = req.competitorId.trim();
  const items = req.libraryItems ?? [];
  const scraped = req.scrapedAdIds ?? [];

  let pending = pendingByCompetitor.get(competitorId);
  if (pending && size(pending) + items.length + scraped.length > MAX_ITEMS) {
    flush(pending);
    pending = undefined;
  }
  if (!pending) {
    const created: Pending = {
      competitorId,
      libraryItems: new Map(),
      scrapedAdIds: new Set(),
      waiters: [],
      timer: setTimeout(() => flush(created), BATCH_WINDOW_MS),
    };
    pending = created;
    pendingByCompetitor.set(competitorId, pending);
  }

  for (const item of items) pending.libraryItems.set(`${item.platform}:${item.libraryItemId}`, item);
  for (const id of scraped) pending.scrapedAdIds.add(id);

  const target = pending;
  return new Promise<T>((resolve, reject) => {
    target.waiters.push({ resolve: resolve as (v: unknown) => void, reject });
  });
}
