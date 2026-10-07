import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fetchHydratedAdsLibraryConditional } from "@/lib/ad-library/conditional-hydrate-fetch";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset().mockImplementation(async () => new Response(JSON.stringify({ ok: true, status: "fresh" }), { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("fetchHydratedAdsLibraryConditional", () => {
  it("shares one request between identical simultaneous calls", async () => {
    const [a, b] = await Promise.all([
      fetchHydratedAdsLibraryConditional("allbirds.com"),
      fetchHydratedAdsLibraryConditional("allbirds.com"),
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(a).toEqual({ kind: "fresh" });
    expect(b).toEqual({ kind: "fresh" });
  });

  it("sends again once the first request has finished", async () => {
    await fetchHydratedAdsLibraryConditional("allbirds.com");
    await fetchHydratedAdsLibraryConditional("allbirds.com");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("an aborted caller doesn't cancel the request for the others", async () => {
    const ac = new AbortController();
    const aborted = fetchHydratedAdsLibraryConditional("allbirds.com", { signal: ac.signal });
    const other = fetchHydratedAdsLibraryConditional("allbirds.com");
    ac.abort();
    expect(await aborted).toEqual({ kind: "miss" });
    expect(await other).toEqual({ kind: "fresh" });
  });
});
