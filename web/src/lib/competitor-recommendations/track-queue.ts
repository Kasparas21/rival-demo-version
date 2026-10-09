/**
 * Competitors picked in onboarding, tracked one after another once setup finishes: each goes through the
 * normal search (find their ad accounts, confirm, scan), and the next starts when one lands.
 */

const KEY = "rival.track_queue.v1";
/** A queue left from an abandoned setup is dropped rather than resumed days later. */
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

type StoredQueue = { domains: string[]; total: number; savedAt: number };

export type QueuedCompetitor = { domain: string; /** 1-based */ position: number; total: number };

function read(storage: Storage, now: number): StoredQueue | null {
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return null;
    const q = JSON.parse(raw) as StoredQueue;
    if (!Array.isArray(q.domains) || typeof q.total !== "number" || now - q.savedAt > MAX_AGE_MS) {
      storage.removeItem(KEY);
      return null;
    }
    return q;
  } catch {
    return null;
  }
}

/** Replace the queue with these sites (deduplicated, in order). An empty list clears it. */
export function queueCompetitorsToTrack(domains: string[], storage: Storage = localStorage, now = Date.now()): void {
  const unique = [...new Set(domains.map((d) => d.trim().toLowerCase()).filter(Boolean))];
  try {
    if (unique.length === 0) storage.removeItem(KEY);
    else storage.setItem(KEY, JSON.stringify({ domains: unique, total: unique.length, savedAt: now } satisfies StoredQueue));
  } catch {
    /* storage full or blocked: they can still track from Find competitor */
  }
}

/** Take the next site to track, or null when there's none. */
export function takeNextQueuedCompetitor(storage: Storage = localStorage, now = Date.now()): QueuedCompetitor | null {
  const q = read(storage, now);
  if (!q || q.domains.length === 0) return null;
  const [domain, ...rest] = q.domains;
  try {
    if (rest.length === 0) storage.removeItem(KEY);
    else storage.setItem(KEY, JSON.stringify({ ...q, domains: rest }));
  } catch {
    /* ignore */
  }
  return { domain: domain!, position: q.total - rest.length, total: q.total };
}

/** The search page for one queued competitor, carrying its place in the queue. */
export function queuedCompetitorSearchHref(next: QueuedCompetitor): string {
  const params = new URLSearchParams({
    q: next.domain,
    terms: JSON.stringify([{ value: next.domain, kind: "url" }]),
    queue: `${next.position}/${next.total}`,
  });
  return `/dashboard/searching?${params.toString()}`;
}
