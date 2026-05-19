import { describe, expect, it } from "vitest";

import {
  isGoogleAdRowActive,
  isMetaAdActive,
  isSnapchatAdActive,
  isTikTokAdActive,
  utcTodayYmd,
} from "@/lib/ad-library/count-active-ads";
import { classifyByActiveCount, computePlatformTracking } from "@/lib/ad-library/platform-prioritization";

const NOW = Date.parse("2026-05-19T12:00:00.000Z");
const TODAY = "2026-05-19";
const YESTERDAY = "2026-05-18";

describe("isMetaAdActive", () => {
  it("treats open-ended ads as active", () => {
    expect(isMetaAdActive({}, NOW)).toBe(true);
  });

  it("treats recently ended ads as active (48h grace)", () => {
    const endedSec = Math.floor((NOW - 24 * 60 * 60 * 1000) / 1000);
    expect(isMetaAdActive({ endedAt: endedSec }, NOW)).toBe(true);
  });

  it("treats ads ended 3+ days ago as inactive", () => {
    const endedSec = Math.floor((NOW - 4 * 24 * 60 * 60 * 1000) / 1000);
    expect(isMetaAdActive({ endedAt: endedSec }, NOW)).toBe(false);
  });
});

describe("isGoogleAdRowActive", () => {
  it("active only when lastShown is today", () => {
    expect(
      isGoogleAdRowActive(
        { type: "google", id: "1", title: "t", url: "", desc: "", img: null, adUrl: "", lastShown: TODAY },
        NOW
      )
    ).toBe(true);
    expect(
      isGoogleAdRowActive(
        {
          type: "google",
          id: "1",
          title: "t",
          url: "",
          desc: "",
          img: null,
          adUrl: "",
          lastShown: YESTERDAY,
        },
        NOW
      )
    ).toBe(false);
  });
});

describe("isTikTokAdActive", () => {
  it("uses 48h grace on flight end", () => {
    expect(isTikTokAdActive({ flightEndMs: NOW - 24 * 60 * 60 * 1000 }, NOW)).toBe(true);
    expect(isTikTokAdActive({ flightEndMs: NOW - 4 * 24 * 60 * 60 * 1000 }, NOW)).toBe(false);
  });
});

describe("isSnapchatAdActive", () => {
  it("requires ACTIVE status", () => {
    expect(isSnapchatAdActive({ status: "ACTIVE" })).toBe(true);
    expect(isSnapchatAdActive({ status: "PAUSED" })).toBe(false);
  });
});

describe("classifyByActiveCount", () => {
  it("maps thresholds", () => {
    expect(classifyByActiveCount(0)).toBe("INACTIVE");
    expect(classifyByActiveCount(5)).toBe("MINIMAL");
    expect(classifyByActiveCount(25)).toBe("SECONDARY");
    expect(classifyByActiveCount(60)).toBe("PRIMARY");
  });
});

describe("computePlatformTracking", () => {
  it("classifies each platform independently", () => {
    const result = computePlatformTracking({
      meta: 100,
      google: 90,
      tiktok: 80,
      pinterest: 70,
      linkedin: 60,
      snapchat: 40,
    });
    expect(result.highCoverageApplied).toBe(false);
    expect(result.platforms.every((p) => !p.highCoverageDemoted)).toBe(true);
    expect(result.platforms.filter((p) => p.classification === "PRIMARY")).toHaveLength(5);
  });
});

describe("utcTodayYmd", () => {
  it("returns UTC date string", () => {
    expect(utcTodayYmd(NOW)).toBe(TODAY);
  });
});
