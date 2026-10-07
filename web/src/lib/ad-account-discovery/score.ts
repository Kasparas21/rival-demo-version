/**
 * Which ad accounts belong to a brand, decided from evidence in the ads themselves rather than names.
 *
 * Name search and social links found the organic profiles, not the accounts that pay for ads, so discovery
 * missed brands advertising from a differently named page (dantugydytojas.lt → "Papadent") and mixed in
 * resellers and partners (Rothy's next to Anthropologie and The Cut). Every Meta ad names the page that paid
 * for it and where it links; every Google advertiser's ad shows whose site it advertises. Those, plus the
 * brand website's own links to its pages, are the evidence used here. Pure functions: no network.
 */

export type AccountRole = "brand" | "country" | "possible" | "partner" | "other";

export type Evidence = { strength: "strong" | "medium" | "weak" | "against"; text: string };

/** Second-level labels under which a country domain registers names (brand.co.uk, brand.com.au). */
const SECOND_LEVEL = new Set(["co", "com", "org", "net", "ac", "gov", "edu", "ltd", "plc"]);

/** Hosts that mean "the ad doesn't link to a website" (lead forms, Messenger, WhatsApp, profile links). */
const NO_SITE_HOSTS = /(^|\.)(fb\.me|fb\.com|facebook\.com|instagram\.com|m\.me|wa\.me|whatsapp\.com|messenger\.com|linktr\.ee)$/;

export function hostOf(urlOrHost: string | null | undefined): string | null {
  const raw = (urlOrHost ?? "").trim().toLowerCase();
  if (!raw) return null;
  try {
    const host = new URL(/^[a-z]+:\/\//.test(raw) ? raw : `https://${raw}`).hostname;
    return host.replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}

/** The registrable domain: rothys.com, cannumo.co.uk, allbirds.com.au (offer.brand.lt → brand.lt). */
export function registrableDomain(host: string): string {
  const parts = host.split(".").filter(Boolean);
  if (parts.length <= 2) return parts.join(".");
  const sld = parts[parts.length - 2]!;
  const take = SECOND_LEVEL.has(sld) && parts[parts.length - 1]!.length === 2 ? 3 : 2;
  return parts.slice(-take).join(".");
}

/** The brand's name inside its domain: "cannumo" for cannumo.co.uk. */
export function domainLabel(host: string): string {
  return registrableDomain(host).split(".")[0] ?? host;
}

export type LinkMatch = "own" | "sister" | "elsewhere" | "no_site";

/**
 * How an ad's link relates to the brand: its own domain (or a subdomain), a sister domain with the same
 * name in another country (cannumo.co.uk for cannumo.lt), somewhere else, or no website at all.
 */
export function matchLink(linkHost: string | null, brandHost: string): LinkMatch {
  if (!linkHost || NO_SITE_HOSTS.test(linkHost)) return "no_site";
  const ownReg = registrableDomain(brandHost);
  const reg = registrableDomain(linkHost);
  if (reg === ownReg) return "own";
  if (domainLabel(linkHost) === domainLabel(brandHost)) return "sister";
  return "elsewhere";
}

/** Words that say what a business is, not who: they make "Dantų centras" match every "…centras". */
const GENERIC_WORDS = new Set([
  "uab", "mb", "ab", "inc", "ltd", "llc", "limited", "gmbh", "official", "shop", "store", "the", "and", "co",
  "clinic", "klinika", "odontologijos", "odontologija", "centras", "center", "centre", "dantu", "dantų",
  "implantologijos", "studija", "salon", "salonas", "group", "lietuva", "lt", "uk", "eu", "global",
]);

function nameTokens(s: string): string[] {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/['’`]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3 && !GENERIC_WORDS.has(t));
}

/** Whether a page or advertiser name carries the brand's distinctive name (not just "clinic"). */
export function nameMatchesBrand(name: string, brandName: string, brandHost: string): boolean {
  const label = domainLabel(brandHost).replace(/[^a-z0-9]/g, "");
  const compact = name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  if (label.length >= 4 && compact.includes(label)) return true;
  const brand = new Set([...nameTokens(brandName), ...nameTokens(label)]);
  return nameTokens(name).some((t) => brand.has(t));
}

/** A Facebook page link's identifier: the vanity name or numeric id ("rothys", "61552807384612"). */
export function facebookPageKey(url: string | null | undefined): string | null {
  const host = hostOf(url);
  if (!host || !/(^|\.)facebook\.com$/.test(host)) return null;
  try {
    const u = new URL(/^[a-z]+:\/\//i.test(url!) ? url! : `https://${url}`);
    const id = u.searchParams.get("id");
    if (id) return id.toLowerCase();
    const seg = u.pathname.split("/").filter(Boolean);
    const first = seg[0]?.toLowerCase();
    if (!first || ["pages", "profile.php", "people", "ads", "sharer", "tr", "policy.php", "dialog", "plugins"].includes(first)) {
      return first === "pages" ? (seg[seg.length - 1] ?? null)?.toLowerCase() ?? null : null;
    }
    return first;
  } catch {
    return null;
  }
}

export type MetaAdSample = {
  pageId: string;
  pageName: string;
  profileUri: string | null;
  pictureUrl?: string | null;
  linkHost: string | null;
  branded: boolean;
  /** Targeted countries when the ad's details were fetched. */
  countries?: string[];
};

export type MetaPageCandidate = {
  pageId: string;
  pageName: string;
  profileUri: string | null;
  pictureUrl: string | null;
  adsSeen: number;
  /** Ad link hosts and how many ads use each, most used first. */
  linkHosts: { host: string; ads: number }[];
  countries: string[];
  role: AccountRole;
  confidence: "high" | "medium" | "low";
  evidence: Evidence[];
  preselected: boolean;
};

export type BrandContext = {
  /** The domain the user entered (www stripped). */
  host: string;
  brandName: string;
  /** Facebook pages the brand's website links to (vanity names or ids). */
  websiteFacebookKeys: string[];
  /** ISO-2 market the user cares about, used to choose between country accounts. */
  market?: string | null;
};

const pct = (n: number, d: number) => (d > 0 ? n / d : 0);

/** Group Meta ad samples by the page that paid for them and decide each page's role, with reasons. */
export function scoreMetaPages(samples: MetaAdSample[], ctx: BrandContext): MetaPageCandidate[] {
  const byPage = new Map<string, MetaAdSample[]>();
  for (const s of samples) {
    if (!s.pageId) continue;
    byPage.set(s.pageId, [...(byPage.get(s.pageId) ?? []), s]);
  }
  const websiteKeys = new Set(ctx.websiteFacebookKeys.map((k) => k.toLowerCase()));

  const out: MetaPageCandidate[] = [];
  for (const [pageId, ads] of byPage) {
    const first = ads[0]!;
    const profileKey = facebookPageKey(first.profileUri);
    const websiteLinked = websiteKeys.has(pageId) || (profileKey != null && websiteKeys.has(profileKey));
    const counts = { own: 0, sister: 0, elsewhere: 0, no_site: 0 };
    const hosts = new Map<string, number>();
    for (const a of ads) {
      counts[matchLink(a.linkHost, ctx.host)] += 1;
      if (a.linkHost) hosts.set(a.linkHost, (hosts.get(a.linkHost) ?? 0) + 1);
    }
    const withSite = counts.own + counts.sister + counts.elsewhere;
    const ownShare = pct(counts.own, withSite);
    const sisterShare = pct(counts.sister, withSite);
    const brandedShare = pct(ads.filter((a) => a.branded).length, ads.length);
    const named = nameMatchesBrand(first.pageName, ctx.brandName, ctx.host);
    const sisterHost = [...hosts.keys()].find((h) => matchLink(h, ctx.host) === "sister") ?? null;

    const evidence: Evidence[] = [];
    if (websiteLinked) evidence.push({ strength: "strong", text: `${ctx.host} links to this page` });
    if (counts.own > 0) {
      evidence.push({ strength: ownShare >= 0.8 ? "strong" : "medium", text: `${counts.own} of ${ads.length} ads link to ${registrableDomain(ctx.host)}` });
    }
    if (counts.sister > 0 && sisterHost) {
      evidence.push({ strength: "medium", text: `${counts.sister} of ${ads.length} ads link to ${sisterHost}, the brand's site for another country` });
    }
    if (counts.no_site > 0) evidence.push({ strength: "weak", text: `${counts.no_site} of ${ads.length} ads use lead forms or messages (no website link)` });
    if (named) evidence.push({ strength: "weak", text: `Page name contains "${domainLabel(ctx.host)}"` });
    if (brandedShare >= 0.5) evidence.push({ strength: "weak", text: "Runs paid partnership (branded content) ads" });
    if (withSite > 0 && counts.elsewhere / withSite >= 0.5) {
      const top = [...hosts.entries()].filter(([h]) => matchLink(h, ctx.host) === "elsewhere").sort((a, b) => b[1] - a[1])[0];
      evidence.push({ strength: "against", text: `Most ads link to ${top?.[0] ?? "another site"}` });
    }

    let role: AccountRole;
    let confidence: MetaPageCandidate["confidence"];
    if (websiteLinked && (withSite === 0 || ownShare + sisterShare >= 0.5)) {
      role = "brand";
      confidence = "high";
    } else if (ownShare >= 0.8 && brandedShare < 0.5 && (named || counts.own >= 5)) {
      role = "brand";
      confidence = named ? "high" : "medium";
    } else if (sisterShare >= 0.8 && brandedShare < 0.5 && named) {
      role = "country";
      confidence = "high";
    } else if (ownShare + sisterShare >= 0.5) {
      // Links to the brand but isn't clearly the brand: partners, creators, affiliates, resellers.
      role = "partner";
      confidence = "medium";
    } else if (withSite === 0 && named) {
      // Lead forms only, a matching name, and no other link to the brand: the user decides.
      role = "possible";
      confidence = "low";
    } else {
      role = "other";
      confidence = "low";
    }

    const countries = [...new Set(ads.flatMap((a) => a.countries ?? []))];
    out.push({
      pageId,
      pageName: first.pageName,
      profileUri: first.profileUri,
      pictureUrl: first.pictureUrl ?? null,
      adsSeen: ads.length,
      linkHosts: [...hosts.entries()].sort((a, b) => b[1] - a[1]).map(([host, n]) => ({ host, ads: n })),
      countries,
      role,
      confidence,
      evidence,
      preselected: false,
    });
  }

  markPreselected(out, ctx, (c) => c.linkHosts.map((h) => h.host));
  const rank: Record<AccountRole, number> = { brand: 0, country: 1, possible: 2, partner: 3, other: 4 };
  return out.sort((a, b) => rank[a.role] - rank[b.role] || b.adsSeen - a.adsSeen);
}

/** Country of a host from its top-level domain (cannumo.co.uk → GB); null for .com and friends. */
export function hostCountry(host: string): string | null {
  const tld = host.split(".").pop() ?? "";
  if (tld.length !== 2) return null;
  return tld === "uk" ? "GB" : tld.toUpperCase();
}

/**
 * Pre-tick one account: a single high-confidence brand account; among several (country pages), the one
 * whose site or ads match the user's market, else the one the website links to, else the most active.
 */
function markPreselected<T extends { role: AccountRole; confidence: string; adsSeen: number; preselected: boolean; evidence: Evidence[]; countries?: string[] }>(
  list: T[],
  ctx: BrandContext,
  hostsOf: (c: T) => string[],
) {
  const own = list.filter((c) => (c.role === "brand" || c.role === "country") && c.confidence !== "low");
  if (own.length === 0) return;
  const market = ctx.market?.toUpperCase() ?? hostCountry(ctx.host);
  const inMarket = market
    ? own.filter((c) => c.countries?.includes(market) || hostsOf(c).some((h) => hostCountry(h) === market))
    : [];
  const websiteLinked = own.filter((c) => c.evidence.some((e) => e.text.includes("links to this page")));
  const pool = inMarket.length > 0 ? inMarket : websiteLinked.length > 0 ? websiteLinked : own;
  const pick = [...pool].sort((a, b) => (a.role === "brand" ? -1 : 0) - (b.role === "brand" ? -1 : 0) || b.adsSeen - a.adsSeen)[0];
  if (pick) pick.preselected = true;
}

export type GoogleAdvertiserSample = {
  advertiserId: string;
  advertiserName: string;
  /** Text read from one of the advertiser's ads (transcription or published copy). */
  adText: string | null;
};

export type GoogleAdvertiserCandidate = {
  advertiserId: string;
  advertiserName: string;
  adText: string | null;
  role: AccountRole;
  confidence: "high" | "medium" | "low";
  evidence: Evidence[];
  preselected: boolean;
};

/** The line of an ad that says the most: its headline rather than the advertiser name shown above it. */
export function adHeadline(text: string): string {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const line = lines.find((l) => l.length >= 16) ?? lines[0] ?? "";
  return line.length > 70 ? `${line.slice(0, 69)}…` : line;
}

/**
 * Google's domain lookup is loose (it returned agencies running Manychat and Aritzia ads for rothys.com), so
 * each advertiser counts only if its ad shows the brand.
 */
export function scoreGoogleAdvertisers(samples: GoogleAdvertiserSample[], ctx: BrandContext): GoogleAdvertiserCandidate[] {
  const seen = new Set<string>();
  const out: GoogleAdvertiserCandidate[] = [];
  for (const s of samples) {
    if (!s.advertiserId || seen.has(s.advertiserId)) continue;
    seen.add(s.advertiserId);
    const text = s.adText?.trim() || null;
    const adShowsBrand = text != null && nameMatchesBrand(text, ctx.brandName, ctx.host);
    const advertiserNamed = nameMatchesBrand(s.advertiserName, ctx.brandName, ctx.host);
    const evidence: Evidence[] = [{ strength: "medium", text: `Google lists this advertiser for ${ctx.host}` }];
    let role: AccountRole;
    let confidence: GoogleAdvertiserCandidate["confidence"];
    if (adShowsBrand) {
      evidence.push({ strength: "strong", text: `Its ad reads "${adHeadline(text!)}"` });
      role = "brand";
      confidence = "high";
    } else if (text == null) {
      evidence.push({ strength: "weak", text: "Its ad couldn't be read" });
      role = advertiserNamed ? "brand" : "possible";
      confidence = advertiserNamed ? "medium" : "low";
    } else {
      evidence.push({ strength: "against", text: `Its ad is for something else: "${adHeadline(text)}"` });
      role = "other";
      confidence = "low";
    }
    out.push({ advertiserId: s.advertiserId, advertiserName: s.advertiserName, adText: text, role, confidence, evidence, preselected: false });
  }
  // A third party bidding on the brand ("Rothy's Official Website" from AYENA SHAMOON LLC) shows the brand
  // too; when the advertiser name doesn't carry the brand and another brand account exists, it's a partner.
  const brandAccounts = out.filter((c) => c.role === "brand");
  if (brandAccounts.length > 1) {
    for (const c of brandAccounts) {
      if (!nameMatchesBrand(c.advertiserName, ctx.brandName, ctx.host) && brandAccounts.some((o) => o !== c && nameMatchesBrand(o.advertiserName, ctx.brandName, ctx.host))) {
        c.role = "partner";
        c.confidence = "medium";
        c.evidence.push({ strength: "against", text: "Another advertiser carries the brand's name; this one may be a reseller bidding on it" });
      }
    }
  }
  const market = ctx.market?.toUpperCase() ?? hostCountry(ctx.host);
  const brands = out.filter((c) => c.role === "brand" && c.confidence !== "low");
  const marketWord = market === "GB" ? /\buk\b|united kingdom/i : market ? new RegExp(`\\b${market}\\b`, "i") : null;
  const pick = (marketWord && brands.find((c) => c.adText && marketWord.test(c.adText))) ?? brands[0];
  if (pick) pick.preselected = true;
  const rank: Record<AccountRole, number> = { brand: 0, country: 1, possible: 2, partner: 3, other: 4 };
  return out.sort((a, b) => rank[a.role] - rank[b.role]);
}
