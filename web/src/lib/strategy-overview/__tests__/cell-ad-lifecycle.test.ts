import { describe, expect, it } from "vitest";

import { resolveCellAdLifecycle, sortCellAds } from "@/lib/strategy-overview/cell-ad-lifecycle";

describe("resolveCellAdLifecycle", () => {
  const now = Date.parse("2026-05-20T12:00:00.000Z");

  it("marks Meta video as running when endedAt is recent", () => {
    const lc = resolveCellAdLifecycle(
      {
        platform: "meta",
        first_seen_at: "2026-05-01T00:00:00.000Z",
        last_seen_at: "2026-05-19T00:00:00.000Z",
        is_active: true,
        raw_payload: { endedAt: Math.floor(Date.parse("2026-05-19T00:00:00.000Z") / 1000) },
      },
      now
    );
    expect(lc.isRunning).toBe(true);
    expect(lc.runtimeDays).toBeGreaterThan(0);
  });

  it("marks ended Meta ad inactive when endedAt is old", () => {
    const lc = resolveCellAdLifecycle(
      {
        platform: "meta",
        first_seen_at: "2026-04-01T00:00:00.000Z",
        last_seen_at: "2026-04-10T00:00:00.000Z",
        is_active: false,
        raw_payload: { endedAt: Math.floor(Date.parse("2026-04-10T00:00:00.000Z") / 1000) },
      },
      now
    );
    expect(lc.isRunning).toBe(false);
    expect(lc.endedDaysAgo).not.toBeNull();
  });
});

describe("sortCellAds", () => {
  it("puts active ads first by default", () => {
    const rows = [
      { ad: { id: "a" }, lifecycle: { isRunning: false, sortRuntimeMs: 5, runtimeDays: 5, endedDaysAgo: 2, statusLabel: "" } },
      { ad: { id: "b" }, lifecycle: { isRunning: true, sortRuntimeMs: 1, runtimeDays: 1, endedDaysAgo: null, statusLabel: "" } },
    ];
    const sorted = sortCellAds(rows, "active_first");
    expect(sorted[0]?.ad.id).toBe("b");
  });
});
