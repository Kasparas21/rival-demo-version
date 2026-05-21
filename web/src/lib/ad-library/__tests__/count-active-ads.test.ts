import { describe, expect, it } from "vitest";

import {
  computeGoogleAdRunDays,
  countActiveGoogleRowsWithLifecycle,
  isGoogleAdActiveFromScrapeRow,
  isGoogleAdRowActive,
  isMetaAdActive,
  isSnapchatAdActive,
  isTikTokAdActive,
  utcTodayYmd,
} from "@/lib/ad-library/count-active-ads";
import { classifyByActiveCount, computePlatformTracking } from "@/lib/ad-library/platform-prioritization";

const NOW = Date.parse("2026-05-19T12:00:00.000Z");
const SCRAPE = Date.parse("2026-05-19T10:00:00.000Z");
const TODAY = "2026-05-19";
const YESTERDAY = "2026-05-18";

describe("isMetaAdActive", () => {
  it("treats open-ended ads as active", () => {
    expect(isMetaAdActive({}, SCRAPE, NOW)).toBe(true);
  });

  it("treats endedAt before scrape day as inactive", () => {
    const endedSec = Math.floor(Date.parse("2026-05-10T00:00:00.000Z") / 1000);
    expect(isMetaAdActive({ endedAt: endedSec }, SCRAPE, NOW)).toBe(false);
  });

  it("treats endedAt on scrape day as active", () => {
    const endedSec = Math.floor(Date.parse("2026-05-19T08:00:00.000Z") / 1000);
    expect(isMetaAdActive({ endedAt: endedSec }, SCRAPE, NOW)).toBe(true);
  });

  it("treats isActive false as inactive regardless of endedAt", () => {
    const endedSec = Math.floor(Date.parse("2026-05-19T08:00:00.000Z") / 1000);
    expect(isMetaAdActive({ isActive: false, endedAt: endedSec }, SCRAPE, NOW)).toBe(false);
  });
});

describe("isGoogleAdActiveFromScrapeRow", () => {
  it("treats ad as active when last_seen is within scrape recency even if lastShown is past", () => {
    const lastScraped = "2026-05-19T10:00:00.000Z";
    const lastSeen = "2026-05-19T09:00:00.000Z";
    expect(
      isGoogleAdActiveFromScrapeRow(
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
        lastSeen,
        lastScraped,
        null,
        NOW
      )
    ).toBe(true);
  });
});

describe("countActiveGoogleRowsWithLifecycle", () => {
  it("counts rows marked running in library lifecycle", () => {
    const rows = [
      {
        type: "google" as const,
        id: "g:AR1:CR1",
        title: "a",
        url: "",
        desc: "",
        img: null,
        adUrl: "",
        lastShown: YESTERDAY,
      },
      {
        type: "google" as const,
        id: "g:AR2:CR2",
        title: "b",
        url: "",
        desc: "",
        img: null,
        adUrl: "",
        lastShown: YESTERDAY,
      },
    ];
    const lookup = (platform: string, id: string) =>
      id === "g:AR1:CR1" ? { isRunning: true } : { isRunning: false };
    expect(countActiveGoogleRowsWithLifecycle(rows, lookup, NOW)).toBe(1);
  });
});

describe("isGoogleAdRowActive", () => {
  it("active when visibility window end (lastShown) is today or later", () => {
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
          id: "2",
          title: "t",
          url: "",
          desc: "",
          img: null,
          adUrl: "",
          lastShown: "2026-06-01",
        },
        NOW
      )
    ).toBe(true);
    expect(
      isGoogleAdRowActive(
        {
          type: "google",
          id: "3",
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

describe("computeGoogleAdRunDays", () => {
  it("counts UTC calendar days from firstShown through lastShown when ended", () => {
    expect(
      computeGoogleAdRunDays(
        {
          type: "google",
          id: "1",
          title: "t",
          url: "",
          desc: "",
          img: null,
          adUrl: "",
          firstShown: "2024-03-11",
          lastShown: YESTERDAY,
        },
        NOW
      )
    ).toBe(798);
  });

  it("counts through today when visibility window end is today or later", () => {
    expect(
      computeGoogleAdRunDays(
        {
          type: "google",
          id: "2",
          title: "t",
          url: "",
          desc: "",
          img: null,
          adUrl: "",
          firstShown: "2024-03-11",
          lastShown: TODAY,
        },
        NOW
      )
    ).toBe(799);
  });

  it("parses first/last from shownSummary when ISO fields are absent", () => {
    expect(
      computeGoogleAdRunDays(
        {
          type: "google",
          id: "3",
          title: "t",
          url: "",
          desc: "",
          img: null,
          adUrl: "https://example.com",
          shownSummary: "Shown 2024-03-11 -> 2026-05-19",
        },
        NOW
      )
    ).toBe(799);
  });
});

describe("isMetaAdActive sentinel", () => {
  it("treats endedAt 0 as still running", () => {
    expect(isMetaAdActive({ endedAt: 0 }, SCRAPE, NOW)).toBe(true);
  });
});

describe("isMetaAdActive isActive flag", () => {
  it("treats isActive true with old endedAt as active", () => {
    const endedSec = Math.floor((NOW - 8 * 24 * 60 * 60 * 1000) / 1000);
    expect(isMetaAdActive({ isActive: true, endedAt: endedSec }, SCRAPE, NOW)).toBe(true);
  });

  it("treats isActive false as inactive even with endedAt on scrape day", () => {
    const endedSec = Math.floor(Date.parse("2026-05-19T08:00:00.000Z") / 1000);
    expect(isMetaAdActive({ isActive: false, endedAt: endedSec }, SCRAPE, NOW)).toBe(false);
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
