import { afterEach, describe, expect, it, vi } from "vitest";

const runApifyActor = vi.fn();
vi.mock("@/lib/apify/client", () => ({
  runApifyActor: (...args: unknown[]) => runApifyActor(...args),
  ApifyRunnerError: class extends Error {},
}));

import { buildJmlpMetaAdsInput, resolveMetaAdsActor, scrapeFacebookAds } from "@/lib/apify/facebook-ads";
import { facebookItemToMetaCard } from "@/lib/ad-library/normalize";
import curiousItems from "./fixtures/meta-curious-items.json";
import jmlpItems from "./fixtures/meta-jmlp-items.json";

/** Liquid Death — the fixtures are the same four ads (image, video, DCO, carousel) from both actors, 2026-10-13. */
const PAGE_ID = "2012750189007245";
const PAGE_URL = `https://www.facebook.com/ads/library/?view_all_page_id=${PAGE_ID}`;

afterEach(() => {
  runApifyActor.mockReset();
  vi.unstubAllEnvs();
});

describe("resolveMetaAdsActor", () => {
  it("keeps EU/EEA scrapes on curious_coder for EU reach and targeting", () => {
    expect(resolveMetaAdsActor("LT", "liquiddeath.com")).toBe("curious");
    expect(resolveMetaAdsActor("de")).toBe("curious");
    expect(resolveMetaAdsActor("NO")).toBe("curious");
  });

  it("sends every other market to jmlp", () => {
    expect(resolveMetaAdsActor("US", "dantucentras.lt")).toBe("jmlp");
    expect(resolveMetaAdsActor("GB")).toBe("jmlp");
    expect(resolveMetaAdsActor("CA")).toBe("jmlp");
  });

  it("decides all-country scrapes by the competitor's domain", () => {
    expect(resolveMetaAdsActor("ALL", "dantucentras.lt")).toBe("curious");
    expect(resolveMetaAdsActor("ALL", "https://www.zalando.de/")).toBe("curious");
    expect(resolveMetaAdsActor("ALL", "brand.eu")).toBe("curious");
    expect(resolveMetaAdsActor("ALL", "liquiddeath.com")).toBe("jmlp");
    expect(resolveMetaAdsActor("ALL", "brand.co.uk")).toBe("jmlp");
    expect(resolveMetaAdsActor("ALL")).toBe("jmlp");
  });

  it("lets META_ACTOR_MODE force one actor", () => {
    expect(resolveMetaAdsActor("US", null, "curious")).toBe("curious");
    expect(resolveMetaAdsActor("LT", null, "JMLP")).toBe("jmlp");
    expect(resolveMetaAdsActor("US", null, "by-market")).toBe("jmlp");
    expect(resolveMetaAdsActor("US", null, "typo")).toBe("jmlp");
  });
});

describe("buildJmlpMetaAdsInput", () => {
  it("writes the scrape country into page URLs and maps the status", () => {
    const input = buildJmlpMetaAdsInput({
      urls: [`${PAGE_URL}&country=ALL&active_status=active`],
      maxAds: 25,
      activeStatus: "ACTIVE",
      country: "US",
    });
    const [url] = input.adLibraryUrls as string[];
    expect(new URL(url!).searchParams.get("country")).toBe("US");
    expect(input).toMatchObject({ maxAds: 25, activeStatus: "active", country: "US" });
    expect(input).not.toHaveProperty("minDate");
    expect(input).not.toHaveProperty("maxDate");
  });

  it("leaves keyword search URLs, with their own dates, untouched", () => {
    const keyword =
      "https://www.facebook.com/ads/library/?q=liquid+death&country=CA&start_date%5Bmin%5D=2026-10-13";
    const input = buildJmlpMetaAdsInput({ urls: [keyword], maxAds: 30, activeStatus: "ALL", country: "US" });
    expect(input.adLibraryUrls).toEqual([keyword]);
    expect(input.activeStatus).toBe("all");
  });
});

describe("scrapeFacebookAds actor routing", () => {
  it("runs jmlp for a US scrape at 1GB, with no 10-ad minimum", async () => {
    runApifyActor.mockResolvedValue({ items: jmlpItems });
    const ads = await scrapeFacebookAds({
      ids: { metaPageUrl: PAGE_URL },
      brandName: "Liquid Death",
      countryCode: "US",
      maxAds: 3,
    });
    const [actorId, input, options] = runApifyActor.mock.calls[0]!;
    expect(actorId).toBe("jmlp/meta-ad-library-scraper");
    expect(input).toHaveProperty("adLibraryUrls");
    expect(input).not.toHaveProperty("scrapePageAds.period");
    expect(options).toMatchObject({ maxItems: 3, memoryMbytes: 1024 });
    expect(ads).toHaveLength(3);
  });

  it("keeps curious_coder for an all-country scrape of an EU-domain competitor", async () => {
    runApifyActor.mockResolvedValue({ items: curiousItems });
    await scrapeFacebookAds({
      ids: { metaPageUrl: PAGE_URL },
      brandName: "Dantų centras",
      brandDomain: "dantucentras.lt",
      countryCode: "ALL",
      maxAds: 3,
    });
    expect(runApifyActor.mock.calls[0]![0]).toBe("curious_coder/facebook-ads-library-scraper");
  });

  it("keeps curious_coder for an EU scrape", async () => {
    runApifyActor.mockResolvedValue({ items: curiousItems });
    await scrapeFacebookAds({
      ids: { metaPageUrl: PAGE_URL },
      brandName: "Liquid Death",
      countryCode: "LT",
      maxAds: 3,
    });
    const [actorId, input, options] = runApifyActor.mock.calls[0]!;
    expect(actorId).toBe("curious_coder/facebook-ads-library-scraper");
    expect(input).toMatchObject({ count: 10, scrapeAdDetails: true, "scrapePageAds.countryCode": "LT" });
    expect(options).toMatchObject({ maxItems: 10 });
  });
});

/** Meta serves the same file from a different CDN edge with a fresh signature per scraper run. */
function withoutCdnHosts(value: unknown): unknown {
  if (typeof value === "string" && /^https:\/\/[^/]*(fbcdn\.net|cdninstagram\.com)\//.test(value)) {
    return new URL(value).pathname;
  }
  if (Array.isArray(value)) return value.map(withoutCdnHosts);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, withoutCdnHosts(v)]));
  }
  return value;
}

/** Card fields to compare: everything but the raw snapshot and EU transparency, which jmlp doesn't return. */
function comparableCard(item: unknown, index: number): unknown {
  const card = { ...(facebookItemToMetaCard(item as never, index) as unknown as Record<string, unknown>) };
  delete card.snapshot;
  delete card.transparency_by_location;
  return withoutCdnHosts(card);
}

describe("jmlp items normalize like curious_coder items", () => {
  it("produces the same cards apart from EU transparency", () => {
    curiousItems.forEach((curious, i) => {
      expect(comparableCard(jmlpItems[i], i)).toEqual(comparableCard(curious, i));
    });
  });
});
