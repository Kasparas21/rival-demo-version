import { describe, expect, it } from "vitest";

import fx from "./fixtures/meta-samples-2026-10-07.json";
import {
  matchLink,
  registrableDomain,
  scoreGoogleAdvertisers,
  scoreMetaPages,
  type MetaAdSample,
} from "@/lib/ad-account-discovery/score";

/** Real Ad Library results captured in the live test on 2026-10-07. */
const samples = fx as Record<string, MetaAdSample[]>;

const summary = (list: ReturnType<typeof scoreMetaPages>) =>
  list.filter((c) => c.role !== "other").map((c) => `${c.preselected ? "x" : "-"} ${c.role} ${c.pageName}`);

describe("domains", () => {
  it("knows country second-level domains and subdomains", () => {
    expect(registrableDomain("cannumo.co.uk")).toBe("cannumo.co.uk");
    expect(registrableDomain("allbirds.com.au")).toBe("allbirds.com.au");
    expect(registrableDomain("offer.sypsenosakademija.lt")).toBe("sypsenosakademija.lt");
    expect(matchLink("offer.sypsenosakademija.lt", "sypsenosakademija.lt")).toBe("own");
    expect(matchLink("cannumo.co.uk", "cannumo.lt")).toBe("sister");
    expect(matchLink("fb.me", "dantucentras.lt")).toBe("no_site");
    expect(matchLink("anthropologie.com", "rothys.com")).toBe("elsewhere");
  });
});

describe("scoreMetaPages on real Ad Library results", () => {
  it("Rothy's: own page, partners apart, resellers out (the website has no Facebook link)", () => {
    const out = scoreMetaPages(samples.rothys!, { host: "rothys.com", brandName: "Rothy's", websiteFacebookKeys: [] });
    expect(summary(out)).toEqual(["x brand Rothy's", "- partner The Cut", "- partner Air Mail"]);
    expect(out.find((c) => c.pageName === "Anthropologie")?.role).toBe("other");
  });

  it("Cannumo: LT and UK pages, the one for the entered site ticked", () => {
    const lt = scoreMetaPages(samples.cannumo!, { host: "cannumo.lt", brandName: "Cannumo", websiteFacebookKeys: ["cannumolt"] });
    expect(summary(lt)).toEqual(["x brand Cannumo", "- country Cannumo UK"]);
    const uk = scoreMetaPages(samples.cannumo!, { host: "cannumo.co.uk", brandName: "Cannumo", websiteFacebookKeys: ["cannumouk"] });
    expect(summary(uk)).toEqual(["x brand Cannumo UK", "- country Cannumo"]);
  });

  it("Dantų centras: the page the website links to, out of 20 clinics a generic name search returns", () => {
    const out = scoreMetaPages(samples.dantucentras!, {
      host: "dantucentras.lt",
      brandName: "Dantų centras",
      websiteFacebookKeys: ["dantucentras"],
    });
    expect(summary(out)).toEqual(["x brand Dantų centras"]);
    expect(out.length).toBeGreaterThan(15);
  });

  it("dantugydytojas.lt: a differently named page with lead-form ads, found through the website link", () => {
    const out = scoreMetaPages(samples.papadent!, {
      host: "dantugydytojas.lt",
      brandName: "Dantų gydytojas",
      websiteFacebookKeys: ["papadentklinika"],
    });
    expect(summary(out)).toEqual(["x brand Odontologijos klinika PAPADENT"]);
    expect(out[0]!.countries).toEqual(["LV"]);
  });

  it("Allbirds: main page plus country pages to choose from; a look-alike stays out", () => {
    const out = scoreMetaPages(samples.allbirds!, { host: "allbirds.com", brandName: "Allbirds", websiteFacebookKeys: ["weareallbirds"] });
    expect(summary(out)).toEqual([
      "x brand Allbirds",
      "- country Allbirds Australia",
      "- country Allbirds ME",
      "- possible Allbirds Philippines",
      "- possible Allbirds Thailand",
    ]);
    expect(out.find((c) => c.pageName === "Elvi Outlet")?.role).toBe("other");
  });

  it("ticks the country page for the user's market", () => {
    const out = scoreMetaPages(samples.allbirds!, {
      host: "allbirds.com",
      brandName: "Allbirds",
      websiteFacebookKeys: ["weareallbirds"],
      market: "AU",
    });
    expect(out.find((c) => c.preselected)?.pageName).toBe("Allbirds Australia");
  });
});

describe("scoreGoogleAdvertisers", () => {
  /** Advertisers Google's domain lookup returned in the live test, with the text read from one ad each. */
  const rothys = [
    { advertiserId: "AR05686255499805196289", advertiserName: "Rothy's Inc.", adText: "Rothy's\nRothy's Must-Have Mary Janes - New Rothy's Fa..." },
    { advertiserId: "AR02574894054286295041", advertiserName: "Silveredge Technologies Private Limited", adText: "Manychat\nManage Chats With Manychat - Build Your First Automation" },
    { advertiserId: "AR15979785279170936833", advertiserName: "上海玩色化妆品有限公司", adText: "Aritzia\nAritzia Official Site - aritzia.com" },
    { advertiserId: "AR13133553908590837761", advertiserName: "AYENA SHAMOON LLC", adText: "Rothy's\nRothy's Official Website - Washable Shoes & Bags" },
    { advertiserId: "AR05667774135271424001", advertiserName: "BLUE POINT ADVERTISING LIMITED", adText: "zgallerie.com\nZ Gallerie® Official Site" },
  ];

  it("keeps the brand, flags a third party bidding on it, drops agencies' other clients", () => {
    const out = scoreGoogleAdvertisers(rothys, { host: "rothys.com", brandName: "Rothy's", websiteFacebookKeys: [] });
    expect(out.map((c) => `${c.preselected ? "x" : "-"} ${c.role} ${c.advertiserName}`)).toEqual([
      "x brand Rothy's Inc.",
      "- partner AYENA SHAMOON LLC",
      "- other Silveredge Technologies Private Limited",
      "- other 上海玩色化妆品有限公司",
      "- other BLUE POINT ADVERTISING LIMITED",
    ]);
  });

  it("offers both accounts of a company with a different legal name, ticking the market's", () => {
    const oktofors = [
      { advertiserId: "AR11867219592055095297", advertiserName: "UAB Oktofors", adText: "Cannumo\nGėris by Cannumo - natūralus fermentuotas gėrimas" },
      { advertiserId: "AR09426396223268454401", advertiserName: "UAB Oktofors", adText: "Cannumo\nCannumo Uk - All Natural Gut Health" },
    ];
    const out = scoreGoogleAdvertisers(oktofors, { host: "cannumo.co.uk", brandName: "Cannumo", websiteFacebookKeys: [] });
    expect(out.map((c) => `${c.preselected ? "x" : "-"} ${c.role} ${c.advertiserId}`)).toEqual([
      "- brand AR11867219592055095297",
      "x brand AR09426396223268454401",
    ]);
    // Same advertiser name twice: the evidence shows each ad's headline so the user can tell them apart.
    expect(out[1]!.evidence.map((e) => e.text)).toContain('Its ad reads "Cannumo Uk - All Natural Gut Health"');
  });
});
