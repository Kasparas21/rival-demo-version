import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { checkSavedAdsBatched } from "@/lib/saved-ads/batched-check";

const fetchMock = vi.fn();

function sentBodies(): Array<{ competitorId: string; libraryItems: unknown[]; scrapedAdIds: string[] }> {
  return fetchMock.mock.calls.map((c) => JSON.parse((c[1] as RequestInit).body as string));
}

beforeEach(() => {
  fetchMock.mockReset().mockImplementation(async () => new Response(JSON.stringify({ ok: true, savedMap: {} }), { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("checkSavedAdsBatched", () => {
  it("merges simultaneous checks for one competitor into one request", async () => {
    const results = await Promise.all([
      checkSavedAdsBatched({ competitorId: "c1", libraryItems: [{ platform: "meta", libraryItemId: "1" }] }),
      checkSavedAdsBatched({ competitorId: "c1", libraryItems: [{ platform: "meta", libraryItemId: "1" }, { platform: "google", libraryItemId: "2" }] }),
      checkSavedAdsBatched({ competitorId: "c1", scrapedAdIds: ["s1"] }),
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(sentBodies()[0]).toEqual({
      competitorId: "c1",
      libraryItems: [
        { platform: "meta", libraryItemId: "1" },
        { platform: "google", libraryItemId: "2" },
      ],
      scrapedAdIds: ["s1"],
    });
    expect(results).toEqual([{ ok: true, savedMap: {} }, { ok: true, savedMap: {} }, { ok: true, savedMap: {} }]);
    expect(results[0]).not.toBe(results[1]);
  });

  it("keeps competitors separate", async () => {
    await Promise.all([
      checkSavedAdsBatched({ competitorId: "c1", scrapedAdIds: ["a"] }),
      checkSavedAdsBatched({ competitorId: "c2", scrapedAdIds: ["b"] }),
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("splits a batch that would pass the item cap", async () => {
    const many = (prefix: string) => Array.from({ length: 100 }, (_, i) => `${prefix}${i}`);
    await Promise.all([
      checkSavedAdsBatched({ competitorId: "c1", scrapedAdIds: many("a") }),
      checkSavedAdsBatched({ competitorId: "c1", scrapedAdIds: many("b") }),
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(sentBodies().map((b) => b.scrapedAdIds.length)).toEqual([100, 100]);
  });

  it("rejects every waiter when the request fails", async () => {
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    const a = checkSavedAdsBatched({ competitorId: "c1", scrapedAdIds: ["a"] });
    const b = checkSavedAdsBatched({ competitorId: "c1", scrapedAdIds: ["b"] });
    await expect(a).rejects.toThrow("offline");
    await expect(b).rejects.toThrow("offline");
  });
});
