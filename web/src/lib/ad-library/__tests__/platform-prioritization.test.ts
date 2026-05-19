import { describe, expect, it } from "vitest";

import {
  computeNextScrapeAt,
  refreshIntervalDaysForClassification,
} from "@/lib/ad-library/platform-prioritization";

const NOW = Date.parse("2026-05-19T12:00:00.000Z");

describe("refreshIntervalDaysForClassification", () => {
  it("uses standard cadence for PRIMARY", () => {
    expect(refreshIntervalDaysForClassification("meta", "PRIMARY")).toBe(3);
    expect(refreshIntervalDaysForClassification("tiktok", "PRIMARY")).toBe(7);
    expect(refreshIntervalDaysForClassification("pinterest", "PRIMARY")).toBe(21);
  });

  it("doubles interval for MINIMAL", () => {
    expect(refreshIntervalDaysForClassification("meta", "MINIMAL")).toBe(6);
    expect(refreshIntervalDaysForClassification("tiktok", "MINIMAL")).toBe(14);
  });

  it("uses monthly probe for INACTIVE", () => {
    expect(refreshIntervalDaysForClassification("meta", "INACTIVE")).toBe(30);
  });
});

describe("computeNextScrapeAt", () => {
  it("schedules from interval", () => {
    const next = computeNextScrapeAt("meta", "PRIMARY", NOW);
    expect(Date.parse(next)).toBe(NOW + 3 * 86_400_000);
  });
});
