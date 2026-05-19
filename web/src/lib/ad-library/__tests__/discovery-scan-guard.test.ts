import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearFreshDiscoveryScan,
  isDiscoveryScanInProgress,
  isFreshDiscoveryScan,
  markDiscoveryScanInProgress,
  markFreshDiscoveryScan,
  shouldUseAdsLibraryCacheOnly,
} from "../discovery-scan-guard";

const domain = "example.com";

function makeSessionStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
    clear: () => map.clear(),
  };
}

describe("discovery-scan-guard", () => {
  beforeEach(() => {
    vi.stubGlobal("window", { sessionStorage: makeSessionStorage() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("marks in-progress then fresh after completion", () => {
    markDiscoveryScanInProgress(domain);
    expect(isDiscoveryScanInProgress(domain)).toBe(true);
    expect(shouldUseAdsLibraryCacheOnly(domain)).toBe(true);

    markFreshDiscoveryScan(domain);
    expect(isDiscoveryScanInProgress(domain)).toBe(false);
    expect(isFreshDiscoveryScan(domain)).toBe(true);
    expect(shouldUseAdsLibraryCacheOnly(domain)).toBe(true);
  });

  it("clears fresh flag on demand", () => {
    markFreshDiscoveryScan(domain);
    expect(isFreshDiscoveryScan(domain)).toBe(true);
    clearFreshDiscoveryScan(domain);
    expect(isFreshDiscoveryScan(domain)).toBe(false);
    expect(shouldUseAdsLibraryCacheOnly(domain)).toBe(false);
  });
});
