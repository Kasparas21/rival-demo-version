import { describe, expect, it } from "vitest";

import {
  computeNextScrapeAt,
  computePlatformTracking,
  reclassifyPlatform,
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

describe("reclassifyPlatform after inactive probe", () => {
  it("promotes INACTIVE when activity appears", () => {
    expect(reclassifyPlatform("INACTIVE", 0)).toBe("INACTIVE");
    expect(reclassifyPlatform("INACTIVE", 3)).toBe("MINIMAL");
    expect(reclassifyPlatform("INACTIVE", 25)).toBe("SECONDARY");
    expect(reclassifyPlatform("INACTIVE", 55)).toBe("PRIMARY");
  });
});

describe("computePlatformTracking", () => {
  it("applies high-coverage top-3 demotion when 5+ platforms have 30+ ads", () => {
    const result = computePlatformTracking({
      meta: 100,
      google: 90,
      tiktok: 80,
      pinterest: 70,
      linkedin: 60,
      snapchat: 40,
    });
    expect(result.highCoverageApplied).toBe(true);
    const demoted = result.platforms.filter((p) => p.highCoverageDemoted);
    expect(demoted.length).toBe(3);
    const activeTop3 = result.platforms.filter((p) => !p.highCoverageDemoted && p.classification !== "INACTIVE");
    expect(activeTop3).toHaveLength(3);
    expect(activeTop3.map((p) => p.platform).sort()).toEqual(["google", "meta", "tiktok"]);
  });

  it("does not demote when fewer than 5 high-coverage platforms", () => {
    const result = computePlatformTracking({
      meta: 100,
      google: 90,
      tiktok: 10,
      pinterest: 5,
      linkedin: 0,
      snapchat: 0,
    });
    expect(result.highCoverageApplied).toBe(false);
    expect(result.platforms.every((p) => !p.highCoverageDemoted)).toBe(true);
  });
});
