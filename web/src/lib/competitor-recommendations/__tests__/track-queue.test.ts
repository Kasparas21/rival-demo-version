import { describe, expect, it } from "vitest";

import {
  queueCompetitorsToTrack,
  queuedCompetitorSearchHref,
  takeNextQueuedCompetitor,
} from "@/lib/competitor-recommendations/track-queue";

function memoryStorage(): Storage {
  const m = new Map<string, string>();
  return {
    get length() {
      return m.size;
    },
    clear: () => m.clear(),
    getItem: (k) => m.get(k) ?? null,
    key: (i) => [...m.keys()][i] ?? null,
    removeItem: (k) => void m.delete(k),
    setItem: (k, v) => void m.set(k, v),
  };
}

describe("onboarding track queue", () => {
  it("hands out each picked site once, in order, with its place in the queue", () => {
    const s = memoryStorage();
    queueCompetitorsToTrack(["Vessi.com", "veja-store.com", "vessi.com"], s, 0);
    expect(takeNextQueuedCompetitor(s, 1)).toEqual({ domain: "vessi.com", position: 1, total: 2 });
    expect(takeNextQueuedCompetitor(s, 2)).toEqual({ domain: "veja-store.com", position: 2, total: 2 });
    expect(takeNextQueuedCompetitor(s, 3)).toBeNull();
  });

  it("drops a queue left from a setup abandoned a day ago, and clears on an empty pick", () => {
    const s = memoryStorage();
    queueCompetitorsToTrack(["vessi.com"], s, 0);
    expect(takeNextQueuedCompetitor(s, 25 * 60 * 60 * 1000)).toBeNull();
    queueCompetitorsToTrack(["vessi.com"], s, 0);
    queueCompetitorsToTrack([], s, 0);
    expect(takeNextQueuedCompetitor(s, 1)).toBeNull();
  });

  it("links to the normal search for the site", () => {
    const href = queuedCompetitorSearchHref({ domain: "vessi.com", position: 1, total: 3 });
    const params = new URL(href, "http://x").searchParams;
    expect(params.get("q")).toBe("vessi.com");
    expect(params.get("queue")).toBe("1/3");
    expect(JSON.parse(params.get("terms")!)).toEqual([{ value: "vessi.com", kind: "url" }]);
  });
});
