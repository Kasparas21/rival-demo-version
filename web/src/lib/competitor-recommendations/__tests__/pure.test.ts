import { describe, expect, it } from "vitest";

import { isNeverCompetitor, mapsCandidates, mergeCandidates } from "@/lib/competitor-recommendations/candidates";
import { extractJson } from "@/lib/competitor-recommendations/llm-json";
import { normalizeProfile } from "@/lib/competitor-recommendations/profile";
import { groupFor, rankCandidates, sizeRatio } from "@/lib/competitor-recommendations/rank";
import { htmlToSiteText } from "@/lib/competitor-recommendations/site-text";
import type { BrandProfile, SizeSignals, VerifiedCandidate } from "@/lib/competitor-recommendations/types";

const online: BrandProfile = {
  domain: "allbirds.com",
  brandName: "Allbirds",
  offering: "Sustainable shoes",
  category: "sustainable sneakers",
  customer: "adults",
  priceTier: "mid",
  businessType: "ecommerce",
  country: "US",
  city: null,
  language: "en",
  searchQueries: [],
  localSearchTerm: null,
};
const local: BrandProfile = { ...online, businessType: "local", city: "Kaunas", country: "LT" };
const size = (s: Partial<SizeSignals>): SizeSignals => ({ trancoRank: null, metaAds: null, reviewsCount: null, ...s });

describe("normalizeProfile", () => {
  it("keeps valid fields, defaults the rest, and drops city/maps term for non-local businesses", () => {
    const p = normalizeProfile(
      { brandName: "Rothy's", businessType: "ecommerce", country: "us", city: "San Francisco", priceTier: "fancy", searchQueries: ["a", "", 3, "b", "c", "d", "e"] },
      "rothys.com",
    );
    expect(p).toMatchObject({ brandName: "Rothy's", businessType: "ecommerce", country: "US", city: null, priceTier: "unknown" });
    expect(p.searchQueries).toEqual(["a", "b", "c", "d"]);
    expect(normalizeProfile({ businessType: "local", city: "Vilnius, Panevėžys, Kupiškis" }, "x.lt").city).toBe("Vilnius");
    expect(normalizeProfile(null, "x.com")).toMatchObject({ brandName: "x.com", businessType: "other", language: "en" });
  });
});

describe("candidates", () => {
  it("never treats marketplaces, social or media sites as competitors", () => {
    for (const d of ["amazon.com", "amazon.co.uk", "zalando.de", "facebook.com", "nytimes.com", "pigu.lt"]) expect(isNeverCompetitor(d)).toBe(true);
    for (const d of ["rothys.com", "vivobarefoot.com", "dantucentras.lt"]) expect(isNeverCompetitor(d)).toBe(false);
  });

  it("merges sources per domain and drops the user's own site", () => {
    const merged = mergeCandidates("allbirds.com", [
      mapsCandidates([{ name: "Veja Store", website: "https://www.veja-store.com/en/", category: "Shoe store", reviewsCount: 40, rating: 4.5, address: "Paris" }]),
      [
        { domain: "veja-store.com", name: "Veja", sources: ["web"], hint: "listed in best sneakers" },
        { domain: "allbirds.com", name: "Allbirds", sources: ["knowledge"], hint: null },
        { domain: "amazon.com", name: "Amazon", sources: ["web"], hint: null },
      ],
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({ domain: "veja-store.com", name: "Veja Store", sources: ["maps", "web"], reviewsCount: 40 });
  });
});

describe("ranking", () => {
  it("compares local businesses by Maps reviews and online ones by Tranco rank", () => {
    expect(sizeRatio(local, size({ reviewsCount: 95 }), size({ reviewsCount: 395 }))).toBe(4);
    expect(sizeRatio(online, size({ trancoRank: 70_000 }), size({ trancoRank: 35_000 }))).toBe(2);
    expect(sizeRatio(online, size({}), size({}))).toBeNull();
    expect(sizeRatio(online, size({ trancoRank: 60_000 }), size({}))).toBeLessThan(0.5); // unranked = smaller
    expect(sizeRatio(online, size({ trancoRank: 1_600_000, metaAds: 8 }), size({ metaAds: 18 }))).toBe(2); // tail rank: compare ads
  });

  it("puts a direct competitor a step bigger that advertises first", () => {
    const base = { sources: ["web"] as const, hint: null, evidence: [], edge: null, rejectReason: null };
    const verified: VerifiedCandidate[] = [
      { ...base, sources: ["web"], domain: "peer.com", name: "Peer", isDirect: true, relevance: 90 },
      { ...base, sources: ["web"], domain: "ahead.com", name: "Ahead", isDirect: true, relevance: 85 },
      { ...base, sources: ["web"], domain: "giant.com", name: "Giant", isDirect: true, relevance: 85 },
      { ...base, sources: ["web"], domain: "loose.com", name: "Loose", isDirect: true, relevance: 40 },
      { ...base, sources: ["web"], domain: "retailer.com", name: "Retailer", isDirect: false, relevance: 70 },
    ];
    const sizes = new Map([
      ["peer.com", size({ trancoRank: 70_000, metaAds: 3 })],
      ["ahead.com", size({ trancoRank: 25_000, metaAds: 18 })],
      ["giant.com", size({ trancoRank: 2_000, metaAds: 20 })],
    ]);
    const ranked = rankCandidates(online, size({ trancoRank: 70_000, metaAds: 5 }), verified, sizes);
    expect(ranked.map((r) => [r.domain, r.group])).toEqual([
      ["ahead.com", "best_to_copy"],
      ["giant.com", "leader"],
      ["peer.com", "peer"],
    ]);
    expect(groupFor(0.3, 8)).toBe("smaller_sharp");
    expect(groupFor(0.3, 0)).toBe("peer");
  });
});

describe("helpers", () => {
  it("reads title, description, language and visible text from HTML", () => {
    const t = htmlToSiteText(
      `<html lang="lt"><head><title>Dantų centras &amp; Co</title><meta name="description" content="Implantai Kaune"><style>.x{}</style></head><body><script>var a=1</script><h1>Odontologija</h1></body></html>`,
      "https://dantucentras.lt/",
    );
    expect(t).toMatchObject({ title: "Dantų centras & Co", description: "Implantai Kaune", lang: "lt", text: "Odontologija" });
  });

  it("pulls JSON out of fenced or chatty model replies", () => {
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(extractJson('Here you go: {"a":[1,2]} hope it helps')).toEqual({ a: [1, 2] });
  });
});
