import Firecrawl from "@mendable/firecrawl-js";
import type { Document, ScrapeOptions, SearchResultWeb } from "@mendable/firecrawl-js";
import {
  extractDomain,
  extractLinksFromContent,
  landingUrlVariants,
  normalizeSocialUrlCandidate,
  parseSocialLinks,
  toFullUrl,
} from "@/lib/discovery";
import {
  dedupeAndLabelSocialProfiles,
  dedupeOnePerSocialNetwork,
  socialProfileDedupeKey,
  type SocialProfileChip,
} from "@/lib/onboarding/social-profile-utils";
import type { PlatformIdentifier } from "@/components/manual-identifiers-form";

export type BrandPreviewSocial = SocialProfileChip;

const TIMEOUT_MS = 42_000;
const MAX_ENRICH_DOMAINS = 8;

/** Firecrawl v2 `/search` — keep aggregators/social portals out of *competitor* results */
const V2_SEARCH_EXCLUDE_COMPETITOR: string[] = [
  "google.com",
  "youtube.com",
  "facebook.com",
  "instagram.com",
  "twitter.com",
  "x.com",
  "tiktok.com",
  "linkedin.com",
  "pinterest.com",
  "reddit.com",
  "medium.com",
  "quora.com",
  "wikipedia.org",
  "amazon.com",
  "ebay.com",
  "crunchbase.com",
  "g2.com",
  "capterra.com",
  "trustpilot.com",
  "yelp.com",
  "bing.com",
];

function webHitUrl(hit: SearchResultWeb | Document): string | undefined {
  const h = hit as SearchResultWeb & { url?: string };
  if (typeof h.url === "string") return h.url;
  const m = hit as Document;
  const u = m.metadata?.sourceURL ?? m.metadata?.url;
  return typeof u === "string" ? u : undefined;
}

function webHitTitle(hit: SearchResultWeb | Document): string | undefined {
  const h = hit as SearchResultWeb & { title?: string };
  if (typeof h.title === "string") return h.title;
  const m = hit as Document;
  const t = m.metadata?.title ?? m.metadata?.ogTitle;
  return typeof t === "string" ? t : undefined;
}

function webHitDescription(hit: SearchResultWeb | Document): string | undefined {
  const h = hit as SearchResultWeb & { description?: string };
  if (typeof h.description === "string") return h.description;
  const m = hit as Document;
  const d = m.metadata?.description ?? m.metadata?.ogDescription;
  return typeof d === "string" ? d : undefined;
}

/** Snippet shown under competitor domains — avoids messy PDF placeholders */
export function cleanCompetitorSnippet(raw: string | undefined, maxLen = 112): string | undefined {
  if (!raw?.trim()) return undefined;
  let t = raw.replace(/\s+/g, " ").trim();
  t = t.replace(/^\[\s*PDF\s*\]\s*/gi, "");
  t = t.replace(/\(\s*PDF\s*\)/gi, "");
  t = t.replace(/\bPDF\b/gi, "");
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen).trim()}…`;
}

function inferMarketLocationQueryHint(domain: string): string | undefined {
  const d = domain.replace(/^www\./, "").toLowerCase();
  if (d.endsWith(".co.uk") || d.endsWith(".uk")) return "United Kingdom";
  if (d.endsWith(".com.au")) return "Australia";
  const tld = d.split(".").pop() ?? "";
  const LOC: Record<string, string> = {
    lt: "Lithuania",
    lv: "Latvia",
    ee: "Estonia",
    pl: "Poland",
    de: "Germany",
    fr: "France",
    es: "Spain",
    it: "Italy",
    nl: "Netherlands",
    be: "Belgium",
    at: "Austria",
    ie: "Ireland",
    se: "Sweden",
    no: "Norway",
    dk: "Denmark",
    fi: "Finland",
    jp: "Japan",
    kr: "South Korea",
    in: "India",
    br: "Brazil",
    mx: "Mexico",
    au: "Australia",
    nz: "New Zealand",
    ca: "Canada",
    uk: "United Kingdom",
    us: "United States",
  };
  return LOC[tld];
}

/** Suggested Meta / ad-library regions keyed off ccTLD + sensible defaults */
export function suggestedAdRegionsForDomain(domain: string): Array<{ code: string; label: string }> {
  const d = domain.replace(/^www\./, "").toLowerCase();
  const primary =
    inferPrimaryRegionCodeFromDomain(d) ??
    ({ code: "WORLD", label: "Worldwide / mixed" } as const);

  const pool: Array<{ code: string; label: string }> = [
    primary,
    { code: "US", label: "United States" },
    { code: "GB", label: "United Kingdom" },
    { code: "DE", label: "Germany" },
    { code: "FR", label: "France" },
    { code: "LT", label: "Lithuania" },
    { code: "PL", label: "Poland" },
    { code: "WORLD", label: "Worldwide / mixed" },
  ];

  const seen = new Set<string>();
  const out: Array<{ code: string; label: string }> = [];
  for (const r of pool) {
    if (seen.has(r.code)) continue;
    seen.add(r.code);
    out.push(r);
  }
  return out.slice(0, 8);
}

function inferPrimaryRegionCodeFromDomain(d: string): { code: string; label: string } | null {
  if (d.endsWith(".co.uk") || d.endsWith(".uk")) return { code: "GB", label: "United Kingdom" };
  if (d.endsWith(".com.au")) return { code: "AU", label: "Australia" };
  const labels = d.split(".");
  const tld = labels[labels.length - 1] ?? "";
  const MAP: Record<string, { code: string; label: string }> = {
    lt: { code: "LT", label: "Lithuania" },
    lv: { code: "LV", label: "Latvia" },
    ee: { code: "EE", label: "Estonia" },
    pl: { code: "PL", label: "Poland" },
    de: { code: "DE", label: "Germany" },
    fr: { code: "FR", label: "France" },
    es: { code: "ES", label: "Spain" },
    it: { code: "IT", label: "Italy" },
    nl: { code: "NL", label: "Netherlands" },
    jp: { code: "JP", label: "Japan" },
    br: { code: "BR", label: "Brazil" },
    in: { code: "IN", label: "India" },
    ca: { code: "CA", label: "Canada" },
    au: { code: "AU", label: "Australia" },
    us: { code: "US", label: "United States" },
  };
  return MAP[tld] ?? null;
}

/** Pre-dedupe row from homepage links + meta ids (deduped & handles added in `dedupeAndLabelSocialProfiles`) */
type SocialHrefRow = { label: string; href: string };

export type BrandPreviewFromSite = {
  resolvedUrl: string;
  domain: string;
  brandName: string;
  description: string | null;
  logoUrl: string | null;
  /** Short excerpt from main content */
  contextSnippet: string | null;
  socials: BrandPreviewSocial[];
  discoveredIds: Partial<PlatformIdentifier>;
};

export function createFirecrawlClient(): InstanceType<typeof Firecrawl> | null {
  const apiKey = process.env.FIRECRAWL_API_KEY?.trim();
  if (!apiKey) return null;
  return new Firecrawl({ apiKey, timeoutMs: TIMEOUT_MS });
}

function markdownSnippet(markdown: string | undefined, maxLen: number): string | null {
  if (!markdown?.trim()) return null;
  const t = markdown.replace(/\s+/g, " ").trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen).trim()}…`;
}

/** Pull footer/header socials that only appear as raw `<a href>`. */
function extractHrefUrlsFromHtml(html: string | undefined): string[] {
  if (!html?.trim()) return [];
  const out: string[] = [];
  const re = /\bhref\s*=\s*["']([^"'\\]+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const v = m[1]?.trim();
    if (!v) continue;
    const low = v.toLowerCase();
    if (
      low.startsWith("javascript:") ||
      low.startsWith("mailto:") ||
      low.startsWith("tel:") ||
      low.startsWith("data:") ||
      low === "#" ||
      low.startsWith("#")
    ) {
      continue;
    }
    out.push(v);
  }
  return out;
}

function absolutizePotentialUrl(raw: string, pageUrl: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  try {
    if (/^https?:\/\//i.test(t)) return normalizeSocialUrlCandidate(t);
    if (t.startsWith("//")) return normalizeSocialUrlCandidate(`https:${t}`);
    if (t.startsWith("/")) return normalizeSocialUrlCandidate(new URL(t, pageUrl).toString());
    if (/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}\//i.test(t))
      return normalizeSocialUrlCandidate(`https://${t}`);
  } catch {
    return null;
  }
  return null;
}

function collectLinkCandidates(doc: Document, pageUrl: string): string[] {
  const md = doc.markdown ?? "";
  const html = doc.rawHtml || doc.html || "";
  const raw: string[] = [
    ...(doc.links ?? []),
    ...extractLinksFromContent(md),
    ...extractHrefUrlsFromHtml(html),
  ];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of raw) {
    const abs = absolutizePotentialUrl(r, pageUrl);
    if (!abs) continue;
    const key = abs.split("#")[0].toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(abs);
  }
  return out;
}

function documentToBrandPreview(
  doc: Document,
  resolvedUrl: string,
  linkCandidates: string[]
): Omit<BrandPreviewFromSite, "socials"> {
  const domain = extractDomain(resolvedUrl);
  const meta = doc.metadata ?? {};
  const ogTitle =
    typeof meta.ogTitle === "string" && meta.ogTitle.trim() ? meta.ogTitle.trim() : null;
  const ogDesc =
    typeof meta.description === "string" && meta.description.trim()
      ? meta.description.trim()
      : typeof meta.ogDescription === "string" && meta.ogDescription.trim()
        ? meta.ogDescription.trim()
        : null;

  const firstSeg = domain.split(".")[0] ?? "";
  const brandName =
    ogTitle ??
    (typeof meta.title === "string" && meta.title.trim()
      ? String(meta.title).replace(/\s*[|\u2014-].*$/, "").trim()
      : null) ??
    (firstSeg
      ? firstSeg.charAt(0).toUpperCase() + firstSeg.slice(1).toLowerCase()
      : domain);

  const logoRaw =
    (typeof meta.ogImage === "string" ? meta.ogImage : undefined) ??
    (typeof meta.favicon === "string" ? meta.favicon : undefined) ??
    (meta as { logo?: string }).logo;
  let logoUrl: string | null = null;
  if (typeof logoRaw === "string" && logoRaw.trim()) {
    const u = logoRaw.trim();
    if (/^https?:\/\//i.test(u)) logoUrl = u;
    else if (u.startsWith("//")) logoUrl = `https:${u}`;
    else if (u.startsWith("/"))
      try {
        logoUrl = new URL(u, resolvedUrl).toString();
      } catch {
        logoUrl = null;
      }
  }

  const links = linkCandidates;
  const discoveredIds = parseSocialLinks(links);
  discoveredIds.google = domain;

  return {
    resolvedUrl,
    domain,
    brandName,
    description: ogDesc ?? markdownSnippet(doc.markdown, 220),
    logoUrl,
    contextSnippet: markdownSnippet(doc.markdown, 480),
    discoveredIds,
  };
}

function socialUrlsFromLinks(links: string[]): SocialHrefRow[] {
  const seen = new Set<string>();
  const out: SocialHrefRow[] = [];

  const push = (label: string, href: string) => {
    try {
      const canon = normalizeSocialUrlCandidate(href);
      const key = socialProfileDedupeKey(canon);
      if (seen.has(key)) return;
      seen.add(key);
      out.push({ label, href: canon });
    } catch {
      /* skip */
    }
  };

  for (const raw of links) {
    const canon = normalizeSocialUrlCandidate(raw.trim());
    const u = canon.toLowerCase();
    let label: string | null = null;

    if (/linkedin\.com\/(company|school|showcase|in)\b/i.test(u)) label = "LinkedIn";
    else if (/twitter\.com\//i.test(u) || /\bx\.com\//i.test(u)) label = "X / Twitter";
    else if (/instagram\.com\//i.test(u)) label = "Instagram";
    else if (/(youtube\.com\/|youtu\.be\/)/i.test(u)) label = "YouTube";
    else if (/tiktok\.com\/@?/i.test(u)) label = "TikTok";
    else if (/pinterest\.com\//i.test(u) && !/\/pin\//i.test(u)) label = "Pinterest";
    else if (/snapchat\.com\/add\//i.test(u)) label = "Snapchat";
    else if (
      /facebook\.com|\/\/fb\.com|\.fb\.com\/|fb\.me\//i.test(u) ||
      /^https?:\/\/(?:m|web|www|business)\.facebook\.com\//i.test(u)
    ) {
      if (
        /facebook\.com\/(login|dialog|recover|checkpoint|privacy|policy|plugins|share\.php|sharer(?:\?|$)|gaming|watch|marketplace|groups\/discover)/i.test(
          u
        ) ||
        /\bfb\.com\/tr\b/i.test(u)
      )
        continue;
      label = "Facebook";
    }

    if (!label) continue;
    push(label, canon);
    if (out.length >= 10) break;
  }
  return out;
}

/** Turn parseSocialLinks / discovered ids into clickable profile URLs */
function socialLinksFromDiscoveredIds(ids: Partial<PlatformIdentifier>): SocialHrefRow[] {
  const seen = new Set<string>();
  const out: SocialHrefRow[] = [];
  const push = (label: string, href: string) => {
    try {
      const canon = normalizeSocialUrlCandidate(href);
      const key = socialProfileDedupeKey(canon);
      if (seen.has(key)) return;
      seen.add(key);
      out.push({ label, href: canon });
    } catch {
      /* skip */
    }
  };

  const xRaw = ids.x?.trim();
  if (xRaw) {
    const h = xRaw.replace(/^@+/, "").split(/[\s/]/)[0];
    if (h && !["intent", "search", "home", "explore"].includes(h.toLowerCase()))
      push("X / Twitter", `https://x.com/${encodeURIComponent(h)}`);
  }

  const li = ids.linkedin?.trim();
  if (li) {
    if (/^https?:\/\//i.test(li)) push("LinkedIn", li);
    else push("LinkedIn", `https://www.linkedin.com/company/${encodeURIComponent(li)}`);
  }

  const yt = ids.youtube?.trim();
  if (yt) {
    if (/^UC[\w-]{10,}$/i.test(yt)) push("YouTube", `https://www.youtube.com/channel/${yt}`);
    else if (/^[@]?[a-z0-9._-]{2,50}$/i.test(yt)) {
      const slug = yt.startsWith("@") ? yt.slice(1) : yt;
      push("YouTube", `https://www.youtube.com/@${encodeURIComponent(slug)}`);
    }
  }

  const tt = ids.tiktok?.trim();
  if (tt) {
    const slug = tt.replace(/^@+/, "").split(/[\s/?#]/)[0];
    if (slug) push("TikTok", `https://www.tiktok.com/@${encodeURIComponent(slug)}`);
  }

  const pin = ids.pinterest?.trim();
  if (pin && /^https?:\/\//i.test(pin)) push("Pinterest", pin);

  const sc = ids.snapchat?.trim();
  if (sc) {
    const slug = sc.replace(/^@+/, "").split(/[\s/?#]/)[0];
    if (slug) push("Snapchat", `https://www.snapchat.com/add/${encodeURIComponent(slug)}`);
  }

  const metaDigits = ids.meta?.replace(/\D/g, "") ?? "";
  if (metaDigits.length >= 10 && metaDigits.length <= 22)
    push("Facebook", `https://www.facebook.com/profile.php?id=${metaDigits}`);

  return out.slice(0, 8);
}

function mergeSocialLists(a: SocialHrefRow[], b: SocialHrefRow[]): SocialHrefRow[] {
  const seen = new Set<string>();
  const out: SocialHrefRow[] = [];
  for (const list of [a, b]) {
    for (const item of list) {
      try {
        const k = socialProfileDedupeKey(normalizeSocialUrlCandidate(item.href));
        if (seen.has(k)) continue;
        seen.add(k);
        out.push(item);
      } catch {
        /* skip */
      }
    }
  }
  return out.slice(0, 10);
}


async function scrapeHomepageSocialHints(
  app: InstanceType<typeof Firecrawl>,
  domain: string
): Promise<BrandPreviewSocial[]> {
  const normalized = domain.replace(/^www\./, "").toLowerCase();
  const httpsUrl = `https://${normalized}`;
  const formats: ScrapeOptions["formats"] = [
    { type: "markdown" },
    { type: "links" },
    { type: "rawHtml" },
  ];
  try {
    const doc = await app.scrape(httpsUrl, {
      formats,
      onlyMainContent: false,
      fastMode: true,
      timeout: 18_000,
    });
    const links = collectLinkCandidates(doc, httpsUrl);
    return dedupeOnePerSocialNetwork(
      dedupeAndLabelSocialProfiles(
        mergeSocialLists(socialUrlsFromLinks(links), socialLinksFromDiscoveredIds(parseSocialLinks(links))),
        16,
      ),
      8,
    );
  } catch {
    return [];
  }
}

export async function scrapeBrandPreview(
  landingInput: string
): Promise<{ ok: true; data: BrandPreviewFromSite } | { ok: false; error: string }> {
  const app = createFirecrawlClient();
  const url = toFullUrl(landingInput);
  if (!app) {
    return { ok: false, error: "FIRECRAWL_API_KEY is not configured" };
  }

  const baseFormats: ScrapeOptions["formats"] = [
    { type: "markdown" },
    { type: "links" },
    { type: "rawHtml" },
  ];
  const attempts: ScrapeOptions[] = [
    { formats: baseFormats, onlyMainContent: false, fastMode: true, timeout: 20_000 },
    { formats: baseFormats, onlyMainContent: false, fastMode: false, timeout: 26_000, waitFor: 1200 },
    {
      formats: baseFormats,
      onlyMainContent: false,
      fastMode: false,
      timeout: 30_000,
      waitFor: 2200,
      proxy: "stealth",
    },
  ];

  for (const variant of landingUrlVariants(url)) {
    for (const opts of attempts) {
      try {
        const doc = await app.scrape(variant, opts);
        const mdLen = doc.markdown?.trim().length ?? 0;
        const linkCount = doc.links?.length ?? 0;
        const hasMeta =
          Boolean(doc.metadata?.ogTitle) ||
          Boolean(doc.metadata?.ogImage) ||
          Boolean(doc.metadata?.description) ||
          Boolean(doc.metadata?.title);
        if (mdLen > 40 || linkCount > 0 || hasMeta) {
          const links = collectLinkCandidates(doc, variant);
          const core = documentToBrandPreview(doc, variant, links);
          const socials = dedupeOnePerSocialNetwork(
            dedupeAndLabelSocialProfiles(
              mergeSocialLists(socialUrlsFromLinks(links), socialLinksFromDiscoveredIds(core.discoveredIds)),
              16,
            ),
            8,
          );
          return { ok: true, data: { ...core, socials } };
        }
      } catch {
        /* next */
      }
    }
  }

  return { ok: false, error: "We couldn’t read that homepage. You can still continue." };
}

export type OnboardingCompetitorSuggestion = {
  domain: string;
  title?: string;
  snippet?: string;
  kind: "direct" | "indirect";
};

export async function searchCompetitorCandidates(args: {
  domain: string;
  brandLabel: string;
  limitTotal?: number;
}): Promise<
  { ok: true; suggestions: OnboardingCompetitorSuggestion[] } | {
    ok: false;
    error: string;
  }
> {
  const app = createFirecrawlClient();
  const { domain, brandLabel } = args;
  const limitTotal = Math.min(args.limitTotal ?? 10, 12);
  if (!app) return { ok: false, error: "FIRECRAWL_API_KEY is not configured" };

  const base = domain.replace(/^www\./, "").toLowerCase();
  const location = inferMarketLocationQueryHint(domain);
  const baseSeg = base.split(".")[0] ?? base;
  const escaped =
    brandLabel.replace(/"/g, "").trim() || (baseSeg.length > 0 ? baseSeg : base);

  /** Firecrawl JS `search()` → HTTP `POST /v2/search` — phrase queries work better than noisy “top site” SERP */
  const queries = [
    `${escaped} competitors similar brands online retail`,
    `"${escaped}" alternative stores shopping`,
    `companies like ${base} industry`,
  ];

  const merged: Array<SearchResultWeb | Document> = [];
  const seenUrl = new Set<string>();

  const pushHits = (web: Array<SearchResultWeb | Document | undefined>) => {
    for (const h of web) {
      if (!h) continue;
      const u = webHitUrl(h);
      if (!u) continue;
      if (/\.pdf(\?|$|[\s#])/i.test(u)) continue;
      const key = u.split("#")[0].toLowerCase();
      if (seenUrl.has(key)) continue;
      seenUrl.add(key);
      merged.push(h);
      if (merged.length >= 22) break;
    }
  };

  for (const q of queries) {
    try {
      const res = await app.search(q, {
        limit: 8,
        sources: ["web"],
        excludeDomains: V2_SEARCH_EXCLUDE_COMPETITOR,
        ...(location ? { location } : {}),
        timeout: 36_000,
      });
      pushHits(res.web ?? []);
    } catch {
      /* skip */
    }
    if (merged.length >= 22) break;
  }

  const suggestions: OnboardingCompetitorSuggestion[] = [];
  const seenDomains = new Set<string>();

  const pickSnippet = (desc: string | undefined, title: string | undefined): string | undefined => {
    const d = cleanCompetitorSnippet(desc);
    const t = cleanCompetitorSnippet(title);
    if (d && (!t || (d.length > t.length && d.length >= 24))) return d;
    return t;
  };

  const addDomain = (
    host: string,
    title: string | undefined,
    snippetText: string | undefined,
    kind: "direct" | "indirect"
  ) => {
    const d = host.replace(/^www\./, "").toLowerCase();
    if (!d.includes(".")) return;
    if (!/^[a-z0-9.-]+$/i.test(d)) return;
    if (d === base) return;
    if (seenDomains.has(d)) return;
    seenDomains.add(d);
    const ttl = title?.replace(/\s+/g, " ").trim();
    const sn = pickSnippet(snippetText, ttl);
    suggestions.push({
      domain: d,
      ...(ttl && ttl.length <= 180 ? { title: ttl } : {}),
      ...(sn ? { snippet: sn } : {}),
      kind,
    });
  };

  for (const h of merged) {
    if (suggestions.length >= limitTotal) break;
    const urlStr = webHitUrl(h);
    if (!urlStr) continue;
    try {
      const u = new URL(urlStr);
      if (!["http:", "https:"].includes(u.protocol)) continue;
      if (/\.pdf(\?|$|[\s#])/i.test(u.pathname)) continue;
      const extracted = extractDomain(u.toString());
      if (!extracted) continue;
      const lt = webHitTitle(h);
      const desc = webHitDescription(h);
      const t = `${lt ?? ""} ${desc ?? ""} ${urlStr}`.toLowerCase();
      const indirect =
        /\balternative\b|\bvs\b|\bversus\b|\bcompare\b|\bsimilar to\b|\blike\b|\bsites?\s+like\b|\btop\s+(?:\d+|ten|sites)\b|\bbest\b.*\balternatives?\b/i.test(
          t
        );
      const snippetSource =
        desc && desc.trim().length >= 20 ? desc : lt && lt.length >= 20 ? lt : desc ?? lt;
      addDomain(extracted, lt, snippetSource, indirect ? "indirect" : "direct");
    } catch {
      /* skip bad URL */
    }
  }

  return { ok: true, suggestions };
}

export type CompetitorOnboardingEnrichment = {
  socials: BrandPreviewSocial[];
  suggestedRegions: Array<{ code: string; label: string }>;
};

/** After users pick competitors — homepage scrape only (same profiles rule as onboarding brand step) */
export async function enrichCompetitorDomainsForAds(
  domains: string[]
): Promise<
  | { ok: true; byDomain: Record<string, CompetitorOnboardingEnrichment> }
  | { ok: false; error: string }
> {
  const app = createFirecrawlClient();
  if (!app) return { ok: false, error: "FIRECRAWL_API_KEY is not configured" };
  const uniq = [...new Set(domains.map((d) => normalizedHost(d)).filter(Boolean))].slice(0, MAX_ENRICH_DOMAINS);

  const byDomain: Record<string, CompetitorOnboardingEnrichment> = {};
  for (const domain of uniq) {
    const regions = suggestedAdRegionsForDomain(domain);
    try {
      const socials = await scrapeHomepageSocialHints(app, domain);
      byDomain[domain] = {
        socials,
        suggestedRegions: regions,
      };
    } catch {
      byDomain[domain] = { socials: [], suggestedRegions: regions };
    }
  }
  return { ok: true, byDomain };
}

function normalizedHost(d: string): string {
  return d.replace(/^www\./, "").toLowerCase().trim();
}
