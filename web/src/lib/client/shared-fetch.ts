/**
 * GET requests shared across the page: callers asking for the same URL at the same time (layout, sidebar,
 * tabs, banners — and React's dev double effects) get one network request, and a response is reused for
 * a couple of seconds. Each caller gets its own Response copy, so `.json()` can be read independently.
 * Call `invalidateSharedFetch()` after a write to the same endpoint.
 */

const REUSE_MS = 2000;

type Entry = { promise: Promise<{ status: number; statusText: string; headers: [string, string][]; body: string }>; at: number };

const entries = new Map<string, Entry>();

function toResponse(snapshot: { status: number; statusText: string; headers: [string, string][]; body: string }): Response {
  return new Response(snapshot.status === 204 ? null : snapshot.body, {
    status: snapshot.status,
    statusText: snapshot.statusText,
    headers: snapshot.headers,
  });
}

export function sharedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const hit = entries.get(url);
  if (hit && now - hit.at < REUSE_MS) return hit.promise.then(toResponse);

  const promise = fetch(url, { credentials: "include", cache: "no-store" }).then(async (res) => ({
    status: res.status,
    statusText: res.statusText,
    headers: [...res.headers.entries()],
    body: await res.text(),
  }));
  const entry: Entry = { promise, at: now };
  entries.set(url, entry);
  /** Failed requests aren't reused. */
  promise.catch(() => {
    if (entries.get(url) === entry) entries.delete(url);
  });
  return promise.then(toResponse);
}

/** Drop reused responses for URLs starting with `prefix` (e.g. after PATCH /api/account/brands). */
export function invalidateSharedFetch(prefix: string): void {
  for (const key of [...entries.keys()]) {
    if (key.startsWith(prefix)) entries.delete(key);
  }
}
