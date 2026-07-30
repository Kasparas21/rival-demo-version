import { describe, expect, it } from "vitest";

import type { DiscoveryFeedQuery } from "@/lib/discovery/types";

const DAY_MS = 86_400_000;

function datePresetStart(preset: DiscoveryFeedQuery["datePreset"], nowMs: number): number | null {
  if (preset === "all") return null;
  if (preset === "today") {
    const d = new Date(nowMs);
    d.setUTCHours(0, 0, 0, 0);
    return d.getTime();
  }
  const days =
    preset === "3d"
      ? 3
      : preset === "4d"
        ? 4
        : preset === "7d"
          ? 7
          : preset === "30d"
            ? 30
            : 90;
  return nowMs - days * DAY_MS;
}

describe("discovery whats new date windows", () => {
  const now = Date.parse("2026-07-30T15:00:00.000Z");

  it("starts today at UTC midnight", () => {
    expect(datePresetStart("today", now)).toBe(Date.parse("2026-07-30T00:00:00.000Z"));
  });

  it("covers rolling 3d and 4d windows", () => {
    expect(datePresetStart("3d", now)).toBe(now - 3 * DAY_MS);
    expect(datePresetStart("4d", now)).toBe(now - 4 * DAY_MS);
  });
});
