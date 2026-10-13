import { afterEach, describe, expect, it, vi } from "vitest";

const runApifyActor = vi.fn();
vi.mock("@/lib/apify/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/apify/client")>()),
  runApifyActor: (...args: unknown[]) => runApifyActor(...args),
}));

import { flattenApifyDatasetRecord } from "@/lib/apify/client";
import {
  buildCraftGoogleAdsInput,
  craftItemToGoogleRecord,
  googleAdsMemoryKey,
  isLikelyGoogleAdRow,
  resolveGoogleAdsActor,
  scrapeGoogleAdsTransparency,
} from "@/lib/apify/google-ads";
import { googleItemToRow, normalizeGoogleApiItem } from "@/lib/ad-library/normalize";
import { stableAdKeyForGoogleRow } from "@/lib/ad-library/stable-ad-keys";
import craftItems from "./fixtures/google-craft-items.json";
import craftKnownItems from "./fixtures/google-craft-known-items.json";
import lurkapiItems from "./fixtures/google-lurkapi-items.json";

/** Moklinika / Dentaplanas text, image and video creatives from both actors, 2026-10-13. */
const ADVERTISER_URL = "https://adstransparency.google.com/advertiser/AR14113145574106595329";

afterEach(() => {
  runApifyActor.mockReset();
  vi.unstubAllEnvs();
});

describe("resolveGoogleAdsActor", () => {
  it("uses automation_craft for dated refreshes and lurkapi for full sweeps", () => {
    expect(resolveGoogleAdsActor({ dated: true })).toBe("craft");
    expect(resolveGoogleAdsActor({ dated: false })).toBe("lurkapi");
  });

  it("lets GOOGLE_ACTOR_MODE force one actor", () => {
    expect(resolveGoogleAdsActor({ dated: true }, "lurkapi")).toBe("lurkapi");
    expect(resolveGoogleAdsActor({ dated: false }, "CRAFT")).toBe("craft");
    expect(resolveGoogleAdsActor({ dated: true }, "typo")).toBe("craft");
  });
});

describe("buildCraftGoogleAdsInput", () => {
  it("maps region, window and memory, and decodes copy", () => {
    const input = buildCraftGoogleAdsInput({
      urls: [ADVERTISER_URL],
      limit: 1000,
      region: "lt",
      startDate: "2026-10-10",
      endDate: "2026-10-13",
      memoryKey: googleAdsMemoryKey("c1"),
    });
    expect(input).toMatchObject({
      advertisers: [ADVERTISER_URL],
      region: "LT",
      maxTotal: 1000,
      decodeCreatives: true,
      lastShownAfter: "2026-10-10",
      lastShownBefore: "2026-10-13",
      memoryName: "rival-google-c1",
      emitKnown: true,
    });
  });

  it("searches every region for `anywhere` and skips window and memory when not given", () => {
    const input = buildCraftGoogleAdsInput({ urls: [ADVERTISER_URL], limit: 50, region: "anywhere" });
    expect(input.region).toBe("ANYWHERE");
    expect(input).not.toHaveProperty("lastShownAfter");
    expect(input).not.toHaveProperty("memoryName");
  });
});

function lurkapiRow(item: unknown) {
  const flat = flattenApifyDatasetRecord(item as Record<string, unknown>);
  expect(isLikelyGoogleAdRow(flat)).toBe(true);
  return googleItemToRow(normalizeGoogleApiItem(flat), 0, { queryDomain: "dentaplanas.lt" });
}

function craftRow(item: unknown) {
  return googleItemToRow(normalizeGoogleApiItem(craftItemToGoogleRecord(item as Record<string, unknown>)), 0, {
    queryDomain: "dentaplanas.lt",
  });
}

describe("automation_craft items normalize like lurkapi items", () => {
  it("lands on the same stored ad, with the same dates, format and links", () => {
    craftItems.forEach((craft, i) => {
      const fromCraft = craftRow(craft);
      const fromLurkapi = lurkapiRow(lurkapiItems[i]);
      expect(stableAdKeyForGoogleRow(fromCraft)).toBe(stableAdKeyForGoogleRow(fromLurkapi));
      expect(fromCraft).toMatchObject({
        type: fromLurkapi.type,
        adUrl: fromLurkapi.adUrl,
        format: fromLurkapi.format,
        firstShown: fromLurkapi.firstShown,
        lastShown: fromLurkapi.lastShown,
      });
    });
  });

  it("keeps the YouTube id for video creatives, which keys them", () => {
    const video = craftRow(craftItems[2]);
    expect(video.type).toBe("youtube");
    expect(video.type === "youtube" && video.youtubeVideoId).toBeTruthy();
  });

  it("decodes copy, targeting and per-region stats lurkapi left empty", () => {
    const text = craftRow(craftItems[0]);
    expect(lurkapiRow(lurkapiItems[0]).type === "google" && lurkapiRow(lurkapiItems[0]).headline).toBeFalsy();
    expect(text.type === "google" && text.headline).toBeTruthy();
    expect(text.libraryTargetingSummary).toBeTruthy();
    expect(text.regionStats?.length).toBeGreaterThan(0);
  });

  it("flags creatives re-delivered from memory, which carry no copy", () => {
    const record = craftItemToGoogleRecord(craftKnownItems[0] as Record<string, unknown>);
    expect(record.knownCreative).toBe(true);
    expect(record).not.toHaveProperty("headline");
    expect(record).not.toHaveProperty("targeting");
    expect(record.lastShown).toBe(craftItemToGoogleRecord(craftItems[0] as Record<string, unknown>).lastShown);
  });
});

describe("scrapeGoogleAdsTransparency actor routing", () => {
  const summary = { type: "run-summary", stopReason: "complete", warnings: [] };

  it("runs a dated refresh on automation_craft at 256MB with memory", async () => {
    runApifyActor.mockResolvedValue({ items: [...craftItems, ...craftKnownItems, summary] });
    const items = await scrapeGoogleAdsTransparency({
      startUrls: [ADVERTISER_URL],
      resultsLimit: 1000,
      region: "anywhere",
      startDate: "2026-10-10",
      endDate: "2026-10-13",
      memoryKey: googleAdsMemoryKey("c1"),
    });
    const [actorId, input, options] = runApifyActor.mock.calls[0]!;
    expect(actorId).toBe("automation_craft/google-ads-transparency-scraper");
    expect(input).toMatchObject({ memoryName: "rival-google-c1", lastShownAfter: "2026-10-10" });
    expect(options).toMatchObject({ memoryMbytes: 256, maxItems: 501 });
    expect(items).toHaveLength(4);
    expect(items.filter((i) => i.knownCreative)).toHaveLength(1);
  });

  it("keeps lurkapi for a full sweep", async () => {
    runApifyActor.mockResolvedValue({ items: lurkapiItems });
    await scrapeGoogleAdsTransparency({ startUrls: [ADVERTISER_URL], resultsLimit: 500, region: "anywhere" });
    const [actorId, input] = runApifyActor.mock.calls[0]!;
    expect(actorId).toBe("lurkapi/google-ads-scraper");
    expect(input).not.toHaveProperty("startDate");
  });

  it("passes the window to lurkapi when GOOGLE_ACTOR_MODE forces it", async () => {
    vi.stubEnv("GOOGLE_ACTOR_MODE", "lurkapi");
    runApifyActor.mockResolvedValue({ items: lurkapiItems });
    await scrapeGoogleAdsTransparency({
      startUrls: [ADVERTISER_URL],
      resultsLimit: 500,
      startDate: "2026-10-10",
      endDate: "2026-10-13",
      memoryKey: googleAdsMemoryKey("c1"),
    });
    const [actorId, input] = runApifyActor.mock.calls[0]!;
    expect(actorId).toBe("lurkapi/google-ads-scraper");
    expect(input).toMatchObject({ startDate: "2026-10-10", endDate: "2026-10-13" });
  });

  it("treats an empty window as a quiet stretch, but an unfinished run as a failure", async () => {
    runApifyActor.mockResolvedValue({ items: [summary] });
    await expect(
      scrapeGoogleAdsTransparency({ startUrls: [ADVERTISER_URL], resultsLimit: 50, startDate: "2026-10-10", endDate: "2026-10-13" }),
    ).resolves.toEqual([]);

    runApifyActor.mockResolvedValue({ items: [{ ...summary, stopReason: "timeout" }] });
    await expect(
      scrapeGoogleAdsTransparency({ startUrls: [ADVERTISER_URL], resultsLimit: 50, startDate: "2026-10-10", endDate: "2026-10-13" }),
    ).rejects.toThrow(/stopped early/);
  });
});
