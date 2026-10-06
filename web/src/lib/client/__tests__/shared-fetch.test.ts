import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { invalidateSharedFetch, sharedFetch } from "@/lib/client/shared-fetch";

const fetchMock = vi.fn();

beforeEach(() => {
  invalidateSharedFetch("");
  fetchMock.mockReset().mockImplementation(async () => new Response(JSON.stringify({ n: fetchMock.mock.calls.length }), { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("sharedFetch", () => {
  it("sends one request for simultaneous callers, each reading its own body", async () => {
    const [a, b, c] = await Promise.all([sharedFetch("/api/x"), sharedFetch("/api/x"), sharedFetch("/api/x")]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(await a.json()).toEqual({ n: 1 });
    expect(await b.json()).toEqual({ n: 1 });
    expect(c.ok).toBe(true);
  });

  it("keeps different URLs separate", async () => {
    await Promise.all([sharedFetch("/api/x"), sharedFetch("/api/y")]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("refetches after invalidation (writes)", async () => {
    await sharedFetch("/api/account/brands");
    invalidateSharedFetch("/api/");
    await sharedFetch("/api/account/brands");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("refetches once the reuse window has passed", async () => {
    vi.useFakeTimers();
    try {
      await sharedFetch("/api/x");
      vi.advanceTimersByTime(2500);
      await sharedFetch("/api/x");
      expect(fetchMock).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not reuse a failed request", async () => {
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    await expect(sharedFetch("/api/x")).rejects.toThrow("offline");
    await sharedFetch("/api/x");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
