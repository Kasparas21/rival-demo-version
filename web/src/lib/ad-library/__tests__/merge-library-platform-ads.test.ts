/**
 * Merge tests: 10 existing + 10 incoming with 8 overlap + 2 new stable ids => 12 unique rows per platform.
 */
import { describe, expect, it } from "vitest";

import type { GoogleAdRow } from "@/lib/ad-library/normalize";
import {
  mergeGoogleAdRows,
  mergeLinkedInAdCards,
  mergeMetaAdCards,
  mergeMicrosoftAdCards,
  mergePinterestAdCards,
  mergeSnapchatAdCards,
  mergeTikTokAdCards,
} from "@/lib/ad-library/merge-library-platform-ads";

function metaCard(i: number) {
  return {
    id: `m${i}`,
    headline: `h${i}`,
    desc: "d",
    cta: "c",
    subtext: "",
    img: "",
    isVideo: false,
    adLibraryUrl: `https://www.facebook.com/ads/library/?id=m${i}`,
    pageName: "P",
  };
}

function googleRow(i: number): GoogleAdRow {
  const adUrl = `https://adstransparency.google.com/advertiser/AR${i}/creative/CR${i}`;
  return {
    type: "google",
    id: `g:${i}:${i}`,
    title: `t${i}`,
    url: "x.com",
    desc: "d",
    img: null,
    adUrl,
  };
}

function liCard(i: number) {
  return {
    id: `li${i}`,
    headline: "h",
    desc: "d",
    url: "u",
    img: "",
    advertiser: "a",
    adUrl: `https://www.linkedin.com/ad-library/detail/li${i}`,
  };
}

function ttCard(i: number) {
  return {
    id: `tt${i}`,
    headline: "h",
    desc: "d",
    url: "u",
    img: "",
    advertiser: "a",
    adUrl: `https://library.tiktok.com/ads/detail/tt${i}`,
  };
}

function msCard(i: number) {
  return {
    id: `ms${i}`,
    headline: "h",
    desc: "d",
    url: "u",
    img: "",
    advertiser: "a",
    adUrl: `https://ads.microsoft.com/x/ms${i}`,
  };
}

function pinCard(i: number) {
  return {
    id: `pin${i}`,
    headline: "h",
    desc: "d",
    url: "u",
    img: "",
    advertiser: "a",
    adUrl: `https://www.pinterest.com/pin/pin${i}/`,
  };
}

function snapCard(i: number) {
  return {
    id: `snap${i}`,
    headline: "h",
    desc: "d",
    url: "u",
    img: "",
    advertiser: "a",
    adUrl: `https://www.snapchat.com/ads/snap${i}`,
  };
}

describe("merge-library-platform-ads", () => {
  const opts = { maxItems: 10_000 };

  it("merges Meta: 10 + 10 with 2 new ids => 12", () => {
    const a = Array.from({ length: 10 }, (_, i) => metaCard(i));
    const b = Array.from({ length: 8 }, (_, i) => metaCard(i)).concat([metaCard(10), metaCard(11)]);
    expect(mergeMetaAdCards(a, b, opts)).toHaveLength(12);
  });

  it("merges Google: 10 + 10 with 2 new ids => 12", () => {
    const a = Array.from({ length: 10 }, (_, i) => googleRow(i));
    const b = Array.from({ length: 8 }, (_, i) => googleRow(i)).concat([googleRow(10), googleRow(11)]);
    expect(mergeGoogleAdRows(a, b, opts)).toHaveLength(12);
  });

  it("Google stable key is unchanged when row order changes", () => {
    const r1 = googleRow(1);
    const r2 = googleRow(2);
    const merged = mergeGoogleAdRows([r1, r2], [r2, r1], opts);
    expect(merged).toHaveLength(2);
  });

  it("merges LinkedIn: 10 + 10 => 12", () => {
    const a = Array.from({ length: 10 }, (_, i) => liCard(i));
    const b = Array.from({ length: 8 }, (_, i) => liCard(i)).concat([liCard(10), liCard(11)]);
    expect(mergeLinkedInAdCards(a, b, opts)).toHaveLength(12);
  });

  it("merges TikTok: 10 + 10 => 12", () => {
    const a = Array.from({ length: 10 }, (_, i) => ttCard(i));
    const b = Array.from({ length: 8 }, (_, i) => ttCard(i)).concat([ttCard(10), ttCard(11)]);
    expect(mergeTikTokAdCards(a, b, opts)).toHaveLength(12);
  });

  it("merges Microsoft: 10 + 10 => 12", () => {
    const a = Array.from({ length: 10 }, (_, i) => msCard(i));
    const b = Array.from({ length: 8 }, (_, i) => msCard(i)).concat([msCard(10), msCard(11)]);
    expect(mergeMicrosoftAdCards(a, b, opts)).toHaveLength(12);
  });

  it("merges Pinterest: 10 + 10 => 12", () => {
    const a = Array.from({ length: 10 }, (_, i) => pinCard(i));
    const b = Array.from({ length: 8 }, (_, i) => pinCard(i)).concat([pinCard(10), pinCard(11)]);
    expect(mergePinterestAdCards(a, b, opts)).toHaveLength(12);
  });

  it("merges Snapchat: 10 + 10 => 12", () => {
    const a = Array.from({ length: 10 }, (_, i) => snapCard(i));
    const b = Array.from({ length: 8 }, (_, i) => snapCard(i)).concat([snapCard(10), snapCard(11)]);
    expect(mergeSnapchatAdCards(a, b, opts)).toHaveLength(12);
  });

  it("preserves still-running Meta when an ACTIVE-sweep card merges over a historical end_date", () => {
    const historical = { ...metaCard(0), endedAt: Math.floor(Date.parse("2024-01-01T00:00:00.000Z") / 1000) };
    const active = { ...metaCard(0), isActive: true as const, endedAt: undefined };
    const merged = mergeMetaAdCards([historical], [active], opts);
    expect(merged).toHaveLength(1);
    expect(merged[0].endedAt).toBeUndefined();
    expect(merged[0].isActive).toBe(true);
  });

  it("keeps prior lifecycle when incoming card has no lifecycle info (no resurrection)", () => {
    const endedSec = Math.floor(Date.parse("2024-01-01T00:00:00.000Z") / 1000);
    const killed = { ...metaCard(0), isActive: false as const, endedAt: endedSec };
    const bare = { ...metaCard(0), isActive: undefined, endedAt: undefined };
    const merged = mergeMetaAdCards([killed], [bare], opts);
    expect(merged).toHaveLength(1);
    expect(merged[0].isActive).toBe(false);
    expect(merged[0].endedAt).toBe(endedSec);
  });

  it("stamps librarySeenAtMs on incoming ads so newest sort can surface fresh scrapes", () => {
    const nowMs = Date.parse("2026-07-03T12:00:00.000Z");
    const existing = [metaCard(1)];
    const brandNew = metaCard(99);
    const merged = mergeMetaAdCards(existing, [brandNew], { nowMs, maxItems: 50 });
    const fresh = merged.find((c) => c.id === "m99");
    expect(fresh?.librarySeenAtMs).toBe(nowMs);
    expect(merged[0]?.id).toBe("m99");
  });

  it("flips a previously active card when incoming reports isActive false", () => {
    const active = { ...metaCard(0), isActive: true as const };
    const endedSec = Math.floor(Date.parse("2026-07-01T00:00:00.000Z") / 1000);
    const flipped = { ...metaCard(0), isActive: false as const, endedAt: endedSec };
    const merged = mergeMetaAdCards([active], [flipped], opts);
    expect(merged).toHaveLength(1);
    expect(merged[0].isActive).toBe(false);
    expect(merged[0].endedAt).toBe(endedSec);
  });

  it("clears stale endedAt when merging incoming isActive true", () => {
    const historical = { ...metaCard(0), endedAt: Math.floor(Date.parse("2024-01-01T00:00:00.000Z") / 1000) };
    const active = {
      ...metaCard(0),
      isActive: true as const,
      endedAt: Math.floor(Date.parse("2024-06-01T00:00:00.000Z") / 1000),
    };
    const merged = mergeMetaAdCards([historical], [active], opts);
    expect(merged).toHaveLength(1);
    expect(merged[0].isActive).toBe(true);
    expect(merged[0].endedAt).toBeUndefined();
  });

  it("orders Meta by scrape recency: incoming rows rank above stale-only keys", () => {
    const nowMs = 1_700_000_000_000;
    const staleOnly = metaCard(8);
    const existing = [...Array.from({ length: 8 }, (_, i) => metaCard(i)), staleOnly, metaCard(9)];
    const incoming = [metaCard(10), metaCard(11)];
    const merged = mergeMetaAdCards(existing, incoming, { maxItems: 100, nowMs });
    const idxStale = merged.findIndex((c) => c.id === "m8");
    const idxNew = merged.findIndex((c) => c.id === "m10");
    expect(idxNew).toBeLessThan(idxStale);
  });

  it("preserves non-empty Meta img when merging sparse incoming row", () => {
    const withImg = { ...metaCard(0), img: "https://cdn.example.com/a.jpg" };
    const sparse = { ...metaCard(0), img: "" };
    const merged = mergeMetaAdCards([withImg], [sparse], opts);
    expect(merged[0]?.img).toBe("https://cdn.example.com/a.jpg");
  });

  it("preserves non-empty TikTok img when merging sparse incoming row", () => {
    const withImg = { ...ttCard(0), img: "https://p16-sign.tiktokcdn.com/a.jpg" };
    const sparse = { ...ttCard(0), img: "" };
    const merged = mergeTikTokAdCards([withImg], [sparse], opts);
    expect(merged[0]?.img).toBe("https://p16-sign.tiktokcdn.com/a.jpg");
  });
});

describe("mergeGoogleAdRows with creatives re-delivered from memory", () => {
  const adUrl = "https://adstransparency.google.com/advertiser/AR1/creative/CR1";
  const stored: GoogleAdRow = {
    type: "google",
    id: "g:AR1:CR1",
    title: "Dental implants in Vilnius",
    url: "dentaplanas.lt",
    desc: "Search / text · Implants from 990 € · Shown 2026-02-05 → 2026-10-10",
    img: "https://tpc.googlesyndication.com/simgad/1",
    creativeCopy: "Implants from 990 €",
    shownSummary: "2026-02-05 – 2026-10-10",
    adUrl,
    format: "TEXT",
    firstShown: "2026-02-05",
    lastShown: "2026-10-10",
    headline: "Dental implants in Vilnius",
    description: "Implants from 990 €",
    libraryTargetingSummary: "{\"hasTargeting\":true}",
  };
  /** What googleItemToRow makes of a copy-less known creative. */
  const known: GoogleAdRow = {
    type: "google",
    id: "g:AR1:CR1",
    title: "UAB Dentaplanas — dentaplanas.lt",
    url: "dentaplanas.lt",
    desc: "Search / text · Shown 2026-02-05 → 2026-10-13",
    img: null,
    creativeCopy: null,
    shownSummary: "2026-02-05 – 2026-10-13",
    adUrl,
    format: "TEXT",
    firstShown: "2026-02-05",
    lastShown: "2026-10-13",
    lastShownLabel: "Oct 13, 2026",
    previewUrl: null,
    headline: null,
    description: null,
    libraryTargetingSummary: null,
    lifecycleOnly: true,
  };

  it("moves the shown dates forward without blanking the stored copy", () => {
    const [merged] = mergeGoogleAdRows([stored], [known]);
    expect(merged).toMatchObject({
      title: "Dental implants in Vilnius",
      headline: "Dental implants in Vilnius",
      creativeCopy: "Implants from 990 €",
      img: stored.img,
      libraryTargetingSummary: stored.libraryTargetingSummary,
      lastShown: "2026-10-13",
      lastShownLabel: "Oct 13, 2026",
      shownSummary: "2026-02-05 – 2026-10-13",
      desc: "Search / text · Implants from 990 € · Shown 2026-02-05 → 2026-10-13",
    });
    expect(merged).not.toHaveProperty("lifecycleOnly");
  });

  it("stores a known creative with no prior row as-is, without the flag", () => {
    const [merged] = mergeGoogleAdRows([], [known]);
    expect(merged.lastShown).toBe("2026-10-13");
    expect(merged).not.toHaveProperty("lifecycleOnly");
  });
});

describe("mergeGoogleAdRows with known video creatives", () => {
  const adUrl = "https://adstransparency.google.com/advertiser/AR1/creative/CR9";
  const storedVideo: GoogleAdRow = {
    type: "youtube",
    id: "yt:ffh1coj6anc",
    title: "Smile again",
    channel: "Dentaplanas",
    views: "Updated 2026-10-10",
    thumbnail: "https://i.ytimg.com/vi/ffh1Coj6anc/hqdefault.jpg",
    youtubeVideoId: "ffh1Coj6anc",
    adUrl,
    format: "VIDEO",
    firstShown: "2026-09-01",
    lastShown: "2026-10-10",
  };
  /** Re-delivered from memory: no YouTube id, so it keys as `yt:AR1:CR9`. */
  const knownVideo: GoogleAdRow = {
    type: "youtube",
    id: "yt:AR1:CR9",
    title: "Dentaplanas — dentaplanas.lt",
    channel: "Dentaplanas",
    views: "Updated 2026-10-13",
    thumbnail: "",
    youtubeVideoId: null,
    adUrl,
    format: "VIDEO",
    firstShown: "2026-09-01",
    lastShown: "2026-10-13",
    lifecycleOnly: true,
  };

  it("updates the stored video found by creative instead of adding a duplicate", () => {
    const merged = mergeGoogleAdRows([storedVideo], [knownVideo]);
    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({ youtubeVideoId: "ffh1Coj6anc", title: "Smile again", lastShown: "2026-10-13" });
  });

  it("skips a known video it can't match rather than storing it under a second key", () => {
    expect(mergeGoogleAdRows([], [knownVideo])).toHaveLength(0);
  });
});
