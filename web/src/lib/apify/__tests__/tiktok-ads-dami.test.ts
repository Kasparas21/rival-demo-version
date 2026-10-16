import { afterEach, describe, expect, it, vi } from "vitest";

const runApifyActor = vi.fn();
vi.mock("@/lib/apify/client", () => ({
  runApifyActor: (...args: unknown[]) => runApifyActor(...args),
}));

import {
  buildDamiTikTokInput,
  damiTikTokRowToLegacyItem,
  resolveTikTokAdsActor,
  scrapeTikTokAdsLibrary,
} from "@/lib/apify/tiktok-ads";
import { stableAdKeyForTikTok } from "@/lib/ad-library/stable-ad-keys";
import { tiktokApifyItemToCard } from "@/lib/ad-library/normalize";
import damiItems from "./fixtures/tiktok-dami-items.json";
import srItems from "./fixtures/tiktok-sr-items.json";

/** OLAPLEX, INC. (US-registered, UK ads), 2026-10-16: 3 dami_studio ads + a "no results" row; 2 s-r ads + 2 from another advertiser. */
const OLAPLEX_LIBRARY_URL =
  "https://library.tiktok.com/ads?region=all&adv_name=OLAPLEX%2C%20INC.&adv_biz_ids=6969624333144556289&query_type=1";
const OLAPLEX = { brandName: "Olaplex", brandDomain: "olaplex.com", savedTiktok: OLAPLEX_LIBRARY_URL, maxAds: 50 };

afterEach(() => {
  runApifyActor.mockReset();
  vi.unstubAllEnvs();
});

describe("resolveTikTokAdsActor", () => {
  it("uses dami_studio unless TIKTOK_ACTOR_MODE switches back to s-r", () => {
    expect(resolveTikTokAdsActor(undefined)).toBe("dami");
    expect(resolveTikTokAdsActor("SR")).toBe("sr");
    expect(resolveTikTokAdsActor("typo")).toBe("dami");
  });
});

describe("buildDamiTikTokInput", () => {
  const dates = { startDate: "2026-10-13", endDate: "2026-10-16", limit: 100 };

  it("searches a saved business id through a library link, without ad details", () => {
    const input = buildDamiTikTokInput({
      target: { search: "OLAPLEX, INC.", advBizId: "6969624333144556289" },
      region: "all",
      ...dates,
    });
    expect(input.adLibraryUrls).toEqual([
      "https://library.tiktok.com/ads?region=all&adv_name=OLAPLEX%2C%20INC.&adv_biz_ids=6969624333144556289&query_type=1",
    ]);
    expect(input).toMatchObject({ adStatus: "all", dateFrom: "2026-10-13", dateTo: "2026-10-16", includeAdDetails: false });
    expect(input).not.toHaveProperty("countries");
  });

  it("searches by advertiser name, in a covered country only", () => {
    const input = buildDamiTikTokInput({ target: { search: "Gymshark" }, region: "lt", ...dates });
    expect(input).toMatchObject({ advertiserNames: ["Gymshark"], countries: ["LT"] });
    expect(buildDamiTikTokInput({ target: { search: "Gymshark" }, region: "US", ...dates })).not.toHaveProperty("countries");
  });
});

describe("dami_studio rows become the same cards as s-r rows", () => {
  it("keys by the TikTok ad id and keeps dates, copy and media", () => {
    const card = tiktokApifyItemToCard(damiTikTokRowToLegacyItem(damiItems[0] as Record<string, unknown>), 0, {
      brandName: "Olaplex",
    });
    expect(card).not.toBeNull();
    expect(stableAdKeyForTikTok(card!)).toBe(damiItems[0]!.adId);
    expect(card!.advertiser).toBe("OLAPLEX, INC.");
    expect(card!.videoUrl).toBeTruthy();
    expect(card!.img).toBeTruthy();
    expect(card!.flightStartMs).toBe(Date.parse(String(damiItems[0]!.firstShownDate).slice(0, 10)));
    expect(card!.flightEndMs).toBe(Date.parse(String(damiItems[0]!.lastShownDate).slice(0, 10)));
  });
});

describe("scrapeTikTokAdsLibrary", () => {
  it("runs dami_studio at 256MB and drops its diagnostic rows", async () => {
    runApifyActor.mockResolvedValue({ items: damiItems });
    const ads = await scrapeTikTokAdsLibrary(OLAPLEX);
    const [actorId, input, options] = runApifyActor.mock.calls[0]!;
    expect(actorId).toBe("dami_studio/tiktok-ads-scraper");
    expect(input).toHaveProperty("adLibraryUrls");
    expect(options).toMatchObject({ memoryMbytes: 256 });
    expect(ads).toHaveLength(3);
  });

  it("keeps only the competitor's ads from a business-id search", async () => {
    vi.stubEnv("TIKTOK_ACTOR_MODE", "sr");
    runApifyActor.mockResolvedValue({ items: srItems });
    const ads = await scrapeTikTokAdsLibrary(OLAPLEX);
    expect(runApifyActor.mock.calls[0]![0]).toBe("s-r/tiktok-ads-library");
    expect(runApifyActor.mock.calls[0]![1]).toMatchObject({ adv_biz_ids: "6969624333144556289" });
    expect(ads.map((a) => a.advertiser)).toEqual(["OLAPLEX, INC.", "OLAPLEX, INC."]);
  });
});
