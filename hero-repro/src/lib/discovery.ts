import type { PlatformIdentifier } from "@/components/manual-identifiers-form";

export type { PlatformIdentifier };

/** Platforms we can try to resolve via web search (not domain-based or merchant IDs). */
export const FALLBACK_SEARCH_KEYS: (keyof PlatformIdentifier)[] = [
  "meta",
  "x",
  "tiktok",
  "youtube",
  "linkedin",
  "pinterest",
  "snapchat",
  "reddit",
  "shopping",
  "microsoft",
];

/** Subreddits that are almost never the brand's official community */
const REDDIT_NOISE_SUBREDDITS = new Set(
  [
    "alphaandbetausers",
    "announcements",
    "all",
    "popular",
    "test",
    "testing",
    "help",
    "askreddit",
    "reddit",
    "modnews",
    "bugs",
    "changelog",
    "redditdev",
    "selfserve",
    "ads",
    "promoted",
  ].map((s) => s.toLowerCase())
);

/** Check if string looks like a URL or domain */
export function looksLikeUrl(query: string): boolean {
  const t = query.trim();
  return /^https?:\/\//i.test(t) || /^[a-z0-9][a-z0-9-]*\.[a-z]{2,}(\/|$)/i.test(t);
}

/** Normalize to full URL with https */
export function toFullUrl(value: string): string {
  const v = value.trim();
  if (!v) return v;
  if (!/^https?:\/\//i.test(v)) return `https://${v}`;
  return v.replace(/\/+$/, "");
}

/** `//x.com`, `/reddit.com/...`, or bare domains from search snippets */
export function normalizeSocialUrlCandidate(raw: string): string {
  let s = raw.trim().replace(/[),.;'"`]+$/, "");
  if (!s) return s;
  if (s.startsWith("//")) return "https:" + s;
  if (s.startsWith("/") && /^\/[^/]*[a-z0-9]\.[a-z]{2,}/i.test(s)) {
    s = "https://" + s.replace(/^\/+/, "");
  }
  if (!/^https?:\/\//i.test(s) && /^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}\//i.test(s)) {
    s = "https://" + s;
  }
  return s;
}

/** From "trycrush.ai crush brand" or "trycrush.ai+crush" pick the first domain/URL-like token */
export function firstUrlLikeSegment(query: string): string | null {
  const parts = query.split(/[\s,+;]+/).map((p) => p.trim()).filter(Boolean);
  for (const p of parts) {
    if (looksLikeUrl(p)) return p;
  }
  return null;
}

/** Original URL, site root, and www root — improves success when a path 404s or one host variant is blocked */
export function landingUrlVariants(url: string): string[] {
  try {
    const u = new URL(toFullUrl(url));
    const host = u.hostname.replace(/^www\./, "");
    const root = `${u.protocol}//${host}/`;
    const rootWww = `${u.protocol}//www.${host}/`;
    const full = u.href.split("#")[0];
    const set = new Set<string>([full, root]);
    if (!u.hostname.toLowerCase().startsWith("www.")) set.add(rootWww);
    return [...set];
  } catch {
    return [toFullUrl(url)];
  }
}

/** Extract domain from URL or return as-is if already domain-like */
export function extractDomain(url: string): string {
  try {
    const u = new URL(toFullUrl(url));
    return u.hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] || url;
  }
}

/** First label of domain: keika.ai → keika */
export function brandSlugFromDomain(domain: string): string {
  const d = domain.replace(/^www\./, "").split("/")[0] || domain;
  return d.split(".")[0] || d;
}

/** Strip zero-width / BOM so "empty" fields don't look discovered */
function cleanDiscoveredString(s: string): string {
  return s.replace(/[\u200B-\u200D\uFEFF]/g, "").trim();
}

/** Drop empty strings, trim, fix common discovery quirks (YouTube UC case) */
export function normalizeDiscoveredIds(
  ids: Partial<PlatformIdentifier>
): Partial<PlatformIdentifier> {
  const out: Partial<PlatformIdentifier> = {};
  for (const k of Object.keys(ids) as (keyof PlatformIdentifier)[]) {
    const v = ids[k];
    if (v == null || typeof v !== "string") continue;
    let t = cleanDiscoveredString(v);
    if (!t) continue;
    if (k === "youtube") {
      if (/^uc[\w-]{8,}$/i.test(t) && !t.startsWith("UC")) {
        t = "UC" + t.slice(2);
      }
    }
    out[k] = t;
  }
  return out;
}

/** Google hosted favicon — reliable fallback when CDN logos fail */
export function googleFaviconUrlForDomain(domain: string, size = 128): string {
  const d = domain.replace(/^www\./, "").split("/")[0] || domain;
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(d)}&sz=${size}`;
}

const TWITTER_PATH_SKIP = new Set(
  [
    "intent",
    "share",
    "home",
    "i",
    "search",
    "hashtag",
    "explore",
    "account",
    "settings",
    "login",
    "logout",
    "signup",
    "oauth",
    "compose",
    "messages",
    "notifications",
    "privacy",
    "tos",
    "teams",
    "help",
    "status",
    "lists",
    "topics",
    "who_to_follow",
    "following",
    "followers",
    "verified_followers",
    "i",
    "flow",
    "sw.js",
    "download",
  ].map((s) => s.toLowerCase())
);

function isFacebookHostname(host: string): boolean {
  const h = host.toLowerCase();
  return (
    h === "facebook.com" ||
    h.endsWith(".facebook.com") ||
    h === "fb.com" ||
    h === "fb.me"
  );
}

/** Try to read numeric page id from Facebook public HTML (og / JSON-LD / inline bootload data) */
export function extractFacebookPageIdFromHtml(html: string): string | null {
  if (!html || html.length < 100) return null;
  const patterns: RegExp[] = [
    /"pageID"\s*:\s*"(\d{10,22})"/i,
    /"pageID"\s*:\s*(\d{10,22})\b/,
    /"page_id"\s*:\s*"(\d{10,22})"/i,
    /"page_id"\s*:\s*(\d{10,22})\b/,
    /"pageid"\s*:\s*"(\d{10,22})"/i,
    /"profile_owner"\s*:\s*"?(\d{10,22})"?/i,
    /"actorID"\s*:\s*"(\d{10,22})"/i,
    /"delegate_page_id"\s*:\s*"(\d{10,22})"/i,
    /fb:\/\/page\/(\d{10,22})/i,
    /data-pageid="(\d{10,22})"/i,
    /"entity_id"\s*:\s*"(\d{10,22})"/i,
    /"pageId"\s*:\s*"(\d{10,22})"/i,
    /facebook\.com\/(\d{15,22})(?:\/|\?|"|'|$)/i,
    /profile\.php\?id=(\d{10,22})\b/i,
    /\/pages\/[^"']+\/(\d{10,22})(?:\/|"|'|\s)/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1] && /^(\d{10,22})$/.test(m[1])) return m[1];
  }
  return null;
}

/** Canonical facebook.com URL for scraping (desktop www) */
export function toFacebookWebUrl(href: string): string | null {
  try {
    const u = new URL(normalizeSocialUrlCandidate(href));
    if (!isFacebookHostname(u.hostname)) return null;
    const path = u.pathname.replace(/\/+$/, "") || "/";
    if (
      path === "/home" ||
      path.startsWith("/login") ||
      path.startsWith("/share") ||
      path.startsWith("/dialog") ||
      path.startsWith("/plugins")
    ) {
      return null;
    }
    return `https://www.facebook.com${u.pathname}${u.search}`;
  } catch {
    return null;
  }
}

export type SearchHit = { url: string; title?: string };

/** Extract platform identifiers from a list of URLs */
export function parseSocialLinks(urls: string[]): Partial<PlatformIdentifier> {
  return parseSocialLinksFromHits(urls.map((u) => ({ url: u })));
}

/** Parse from search hits (uses title for smarter Reddit picking later) */
export function parseSocialLinksFromHits(hits: SearchHit[]): Partial<PlatformIdentifier> {
  const result: Partial<PlatformIdentifier> = {};

  for (const { url: raw, title } of hits) {
    const url = normalizeSocialUrlCandidate(raw);
    const lower = url.toLowerCase();

    // Meta — profile.php?id=, numeric path, pages/slug/id (hostname-safe: m.facebook.com, etc.)
    let fbHost = false;
    try {
      fbHost = isFacebookHostname(new URL(normalizeSocialUrlCandidate(url)).hostname);
    } catch {
      fbHost = /facebook\.com|fb\.com|fb\.me/i.test(lower);
    }
    if (!result.meta && fbHost) {
      const idParam = url.match(/[?&](?:id|fbid)=(\d{10,22})\b/i);
      if (idParam?.[1]) {
        result.meta = idParam[1];
      } else {
        const pagesId = lower.match(/\/pages\/[^/]+\/(\d{10,22})(?:\/|\?|$)/);
        if (pagesId?.[1]) result.meta = pagesId[1];
        else {
          const pathNum = lower.match(/facebook\.com\/(\d{15,22})(?:\/|\?|#|$)/);
          if (pathNum?.[1]) result.meta = pathNum[1];
        }
      }
    }

    // X / Twitter — first path segment only (ignore /user/status/…); skip product paths
    if (!result.x && /(?:twitter\.com|x\.com)\//i.test(lower)) {
      const m = lower.match(
        /(?:twitter\.com|x\.com)\/([a-z0-9_]{1,30})(?:\/|\?|#|$)/i
      );
      const handle = m?.[1];
      const seg = handle?.toLowerCase();
      if (handle && seg && !TWITTER_PATH_SKIP.has(seg)) {
        result.x = `@${handle}`;
      }
    }

    // TikTok (@handle or /username without @ in URL)
    if (!result.tiktok && /tiktok\.com\//i.test(lower)) {
      const at = lower.match(/tiktok\.com\/@([a-z0-9_]{2,40})/i);
      if (at?.[1] && !at[1].includes(".")) result.tiktok = `@${at[1]}`;
      else {
        const bare = lower.match(/tiktok\.com\/([a-z0-9_.]{2,40})\/?(?:\?|#|$)/i);
        const skip = new Set([
          "explore", "discover", "foryou", "following", "live", "tag", "music",
          "trending", "business", "download", "legal", "safety",
        ]);
        const bareUser = bare?.[1];
        if (
          bareUser &&
          !bareUser.includes(".") &&
          !skip.has(bareUser.toLowerCase())
        ) {
          result.tiktok = `@${bareUser}`;
        }
      }
    }

    // YouTube — channel UC, /@handle, /c/slug, /user/slug
    if (!result.youtube && /youtube\.com|youtu\.be/i.test(lower)) {
      const ch = lower.match(/youtube\.com\/channel\/(UC[\w-]{20,30})\b/i);
      if (ch?.[1]) result.youtube = ch[1];
      else {
        const at = lower.match(/youtube\.com\/@([a-z0-9._-]{2,40})\b/i);
        if (at?.[1]) result.youtube = `@${at[1]}`;
        else {
          const cslug = lower.match(/youtube\.com\/(?:c|user)\/([a-z0-9._-]{2,50})\b/i);
          if (cslug?.[1]) result.youtube = `@${cslug[1]}`;
        }
      }
    }

    // LinkedIn
    if (!result.linkedin && /linkedin\.com\/company\//i.test(lower)) {
      const m = lower.match(/linkedin\.com\/company\/([^/?#]+)/i);
      if (m?.[1]) result.linkedin = `https://www.linkedin.com/company/${m[1]}`;
    }

    // Pinterest (not /pin/)
    if (!result.pinterest && /pinterest\.com\//i.test(lower) && !/\/pin\//i.test(lower)) {
      const m = lower.match(/pinterest\.com\/([^/?#]+)\/?$/i);
      if (m?.[1] && !["pin", "search", "ideas", "today", "business"].includes(m[1].toLowerCase())) {
        result.pinterest = `https://www.pinterest.com/${m[1]}`;
      }
    }

    // Snapchat
    if (!result.snapchat && /snapchat\.com\/add\//i.test(lower)) {
      const m = lower.match(/snapchat\.com\/add\/([a-z0-9._-]{2,40})/i);
      if (m?.[1]) result.snapchat = `@${m[1]}`;
    }

    // Google Merchant / Shopping — rare in URLs; titles sometimes cite "Merchant ID"
    if (!result.shopping) {
      const t = title || "";
      const idInTitle = t.match(
        /merchant\s*(?:center|id|account)?\s*[:\s#]*(\d{10,15})\b/i
      );
      if (idInTitle?.[1]) result.shopping = idInTitle[1];
      else {
        const qMid = url.match(/[?&](?:mid|merchant[_-]?id)=(\d{10,15})\b/i);
        if (qMid?.[1]) result.shopping = qMid[1];
        else if (/merchants\.google\./i.test(lower)) {
          const pathMid = lower.match(/\/(\d{10,15})(?:\/|\?|#|$)/);
          if (pathMid?.[1]) result.shopping = pathMid[1];
        }
      }
    }

    // Microsoft Advertising — advertiser id in query params or title/snippet
    if (!result.microsoft && /ads\.microsoft|microsoft\.com\/.*ad|adlibrary|transparency/i.test(lower)) {
      const t = title || "";
      const blob = `${t} ${url}`;
      const ms =
        blob.match(/[?&]advertiserId=(\d{4,20})\b/i) ??
        blob.match(/[?&]advertiser_id=(\d{4,20})\b/i) ??
        blob.match(/[?&]advertiser=(\d{4,20})\b/i) ??
        blob.match(/\badvertiser\s*id[:\s#]+(\d{4,20})\b/i);
      if (ms?.[1] && /^\d{4,20}$/.test(ms[1])) result.microsoft = ms[1];
    }

  }

  if (!result.microsoft) {
    const id = pickMicrosoftAdvertiserIdFromHits(hits);
    if (id) result.microsoft = id;
  }

  return result;
}

/** Numeric Microsoft Advertising advertiser id from search hit titles/URLs (EEA transparency). */
export function pickMicrosoftAdvertiserIdFromHits(hits: SearchHit[]): string | undefined {
  const patterns: RegExp[] = [
    /[?&]advertiserId=(\d{4,20})\b/i,
    /[?&]advertiser_id=(\d{4,20})\b/i,
    /[?&]AdvertiserId=(\d{4,20})\b/,
    /\badvertiser\s*id[:\s#]+(\d{4,20})\b/i,
    /\bMicrosoft\s+Advertising\s*[:(]?\s*(\d{6,})\b/i,
  ];
  for (const { title, url } of hits) {
    const blob = `${title || ""} ${url || ""}`;
    for (const re of patterns) {
      const m = blob.match(re);
      if (m?.[1] && /^\d{4,20}$/.test(m[1])) return m[1];
    }
  }
  return undefined;
}

/** Subreddit or /user/ name should relate to brand — blocks e.g. r/orangetheory for myfitnesspal.com */
export function redditNameMatchesBrand(
  subOrUser: string,
  brandSlug: string,
  domainKey: string,
  title: string
): boolean {
  const n = subOrUser.toLowerCase().replace(/[^a-z0-9]/g, "");
  const s = brandSlug.toLowerCase().replace(/[^a-z0-9]/g, "");
  const d = domainKey.replace(/^www\./, "").split(".")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
  const t = (title || "").toLowerCase();
  if (s.length < 3) return true;
  if (n.includes(s) || s.includes(n)) return true;
  if (d.length >= 3 && (n.includes(d) || t.includes(d))) return true;
  if (t.includes(s)) return true;
  if (s.length >= 4 && n.length >= 4) {
    for (let i = 0; i <= n.length - 4; i++) {
      const slice = n.slice(i, i + 4);
      if (s.includes(slice)) return true;
    }
  }
  return false;
}

/** Prefer subreddit/user that matches brand name; drop noise subs */
export function pickBestRedditHit(
  candidates: SearchHit[],
  brandSlug?: string,
  domainSlug?: string
): string | undefined {
  const slug = (brandSlug || "").toLowerCase();
  const dom = (domainSlug || "").toLowerCase();

  const score = (h: SearchHit): number => {
    const u = normalizeSocialUrlCandidate(h.url).toLowerCase();
    const t = (h.title || "").toLowerCase();
    const rm = u.match(/reddit\.com\/(r|user)\/([^/?#]+)/i);
    if (!rm) return -1;
    const kind = rm[1].toLowerCase();
    const name = rm[2].toLowerCase();
    if (REDDIT_NOISE_SUBREDDITS.has(name)) return -1;
    if (kind === "user" && ["reddit", "automoderator", "modnews", "redditads"].includes(name)) {
      return -1;
    }
    if (slug.length >= 3 && !redditNameMatchesBrand(name, slug, dom, t)) {
      return -1;
    }
    let s = 0;
    if (slug && (name === slug || name.includes(slug) || slug.includes(name))) s += 10;
    if (dom && (name === dom || name.includes(dom) || t.includes(dom))) s += 8;
    if (slug && t.includes(slug)) s += 5;
    if (t.includes("official")) s += 2;
    if (t.includes("reddit ads") || t.includes("reddit advertising") || t.includes("sponsored")) s += 3;
    if (t.includes("brand account") || t.includes("official account")) s += 2;
    if (kind === "user") {
      if (slug && name === slug) s += 9;
      else if (slug && (name.includes(slug) || slug.includes(name))) s += 6;
    }
    return s;
  };

  let bestUrl: string | undefined;
  let bestScore = -1;
  for (const h of candidates) {
    const sc = score(h);
    if (sc > bestScore) {
      bestScore = sc;
      const m = normalizeSocialUrlCandidate(h.url).match(/reddit\.com\/(r|user)\/([^/?#]+)/i);
      if (m) {
        bestUrl = `https://www.reddit.com/${m[1].toLowerCase() === "user" ? "user" : "r"}/${m[2]}`;
      }
    }
  }
  if (bestUrl && bestScore >= 0) return bestUrl;
  return undefined;
}

function redditPathName(redditUrl: string): string | undefined {
  const m = redditUrl.match(/reddit\.com\/(?:r|user)\/([^/?#]+)/i);
  return m?.[1]?.toLowerCase();
}

function titleForRedditHit(hits: SearchHit[], pathName: string): string {
  const low = pathName.toLowerCase();
  const hit = hits.find((h) => h.url.toLowerCase().includes(`/r/${low}`) || h.url.toLowerCase().includes(`/user/${low}`));
  return hit?.title ?? "";
}

/** Re-score Reddit when we have brand context (call after first pass) */
export function refineRedditWithBrand(
  current: Partial<PlatformIdentifier>,
  hits: SearchHit[],
  domain: string
): Partial<PlatformIdentifier> {
  const slug = brandSlugFromDomain(domain);
  const redditHits = hits.filter((h) => /reddit\.com\/(r|user)\//i.test(h.url));
  const domainKey = domain.replace(/^www\./, "").toLowerCase();
  const best = redditHits.length > 0 ? pickBestRedditHit(redditHits, slug, domainKey) : undefined;

  const plausible = (url: string | undefined): boolean => {
    if (!url) return false;
    const name = redditPathName(url);
    if (!name) return false;
    if (REDDIT_NOISE_SUBREDDITS.has(name)) return false;
    return redditNameMatchesBrand(name, slug, domainKey, titleForRedditHit(redditHits, name));
  };

  if (current.reddit && !plausible(current.reddit)) {
    const { reddit: _drop, ...rest } = current;
    if (best && plausible(best)) {
      return { ...rest, reddit: best };
    }
    return rest;
  }

  if (!current.reddit && best && plausible(best)) {
    return { ...current, reddit: best };
  }

  if (!current.reddit) return current;

  const curSub = current.reddit.match(/reddit\.com\/(?:r|user)\/([^/?]+)/i)?.[1]?.toLowerCase();
  if (curSub && REDDIT_NOISE_SUBREDDITS.has(curSub)) {
    if (best && plausible(best)) return { ...current, reddit: best };
    const { reddit: _noise, ...withoutReddit } = current;
    return withoutReddit;
  }
  const curIsUser = /reddit\.com\/user\//i.test(current.reddit);
  const bestIsUser = best ? /reddit\.com\/user\//i.test(best) : false;
  const bestUserMatch = best?.match(/reddit\.com\/user\/([^/?#]+)/i);
  const bestUname = bestUserMatch?.[1]?.toLowerCase() ?? "";
  const s = slug.toLowerCase();
  const bestUserMatchesBrand =
    bestIsUser &&
    s.length > 1 &&
    bestUname &&
    (bestUname === s || bestUname.includes(s) || s.includes(bestUname));
  if (best && bestUserMatchesBrand && !curIsUser) {
    return { ...current, reddit: best };
  }
  return current;
}

/** Snapchat /add/ handles — require a minimum match to the brand to avoid random creators */
export function scoreSnapchatHandle(
  handle: string,
  brandSlug: string,
  domainKey: string,
  title?: string
): number {
  const h = handle.replace(/^@/, "").toLowerCase();
  const s = brandSlug.toLowerCase().replace(/[^a-z0-9]/g, "");
  const d = domainKey.replace(/^www\./, "").split(".")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
  const t = (title || "").toLowerCase();
  let sc = 0;
  if (s.length >= 3 && (h === s || h.includes(s) || s.includes(h))) sc += 18;
  if (d.length >= 3 && (h === d || h.includes(d))) sc += 14;
  if (s.length >= 3 && t.includes(s)) sc += 10;
  if (d.length >= 3 && t.includes(d)) sc += 8;
  return sc;
}

export function pickBestSnapchatFromHits(hits: SearchHit[], domain: string): string | undefined {
  const slug = brandSlugFromDomain(domain);
  const domainKey = domain.replace(/^www\./, "").toLowerCase();
  let bestHandle: string | undefined;
  let bestScore = -1;
  for (const { url: raw, title } of hits) {
    const u = normalizeSocialUrlCandidate(raw);
    const m = u.match(/snapchat\.com\/add\/([a-z0-9._-]{2,40})/i);
    if (!m?.[1]) continue;
    const handle = m[1];
    const sc = scoreSnapchatHandle(handle, slug, domainKey, title);
    if (sc > bestScore) {
      bestScore = sc;
      bestHandle = handle;
    }
  }
  if (bestHandle && bestScore >= 10) return `@${bestHandle}`;
  return undefined;
}

/** Drop or replace Snapchat when the handle doesn’t match the brand strongly enough */
export function refineSnapchatWithBrand(
  current: Partial<PlatformIdentifier>,
  hits: SearchHit[],
  domain: string
): Partial<PlatformIdentifier> {
  const slug = brandSlugFromDomain(domain);
  const domainKey = domain.replace(/^www\./, "").toLowerCase();
  const snapHits = hits.filter((h) => /snapchat\.com\/add\//i.test(h.url));
  const best = pickBestSnapchatFromHits(hits, domain);

  const hitTitleFor = (handle: string) => {
    const low = handle.replace(/^@/, "").toLowerCase();
    return snapHits.find((h) => h.url.toLowerCase().includes(`/add/${low}`))?.title;
  };

  const cur = current.snapchat;
  const curScore = cur ? scoreSnapchatHandle(cur, slug, domainKey, hitTitleFor(cur)) : 0;

  if (cur && curScore < 10) {
    const { snapchat: _s, ...rest } = current;
    return best ? { ...rest, snapchat: best } : rest;
  }
  if (!cur && best) {
    return { ...current, snapchat: best };
  }
  if (cur && best && scoreSnapchatHandle(best, slug, domainKey) > curScore + 4) {
    return { ...current, snapchat: best };
  }
  return current;
}

/** Pull Merchant Center numeric id from search hit titles/snippets */
export function pickMerchantIdFromHits(hits: SearchHit[]): string | undefined {
  const patterns: RegExp[] = [
    /merchant\s*(?:center|id|account)?\s*[:\s#-]*(\d{10,15})\b/i,
    /\bid\s*[:\s#]+(\d{10,15})\b/i,
    /merchant\s*#?\s*(\d{10,15})\b/i,
    /(\d{12,15})\s*(?:merchant|google\s*merchant)/i,
  ];
  for (const { title, url } of hits) {
    const blob = `${title || ""} ${url || ""}`;
    for (const re of patterns) {
      const m = blob.match(re);
      if (m?.[1] && /^\d{10,15}$/.test(m[1])) return m[1];
    }
  }
  return undefined;
}

/**
 * Best public Facebook page URL from search/scrape hits when numeric page id isn’t available.
 * Prefers paths that match the brand slug and avoids posts/photos deep links.
 */
export function pickBestFacebookPageUrl(hits: SearchHit[], domain: string): string | undefined {
  const slug = brandSlugFromDomain(domain).toLowerCase();
  const candidates: string[] = [];
  for (const { url } of hits) {
    const c = toFacebookWebUrl(url);
    if (!c) continue;
    try {
      const u = new URL(c);
      const path = (u.pathname || "/").replace(/\/+$/, "") || "/";
      const low = path.toLowerCase();
      if (path === "/" || low === "/home" || low.startsWith("/login") || low.startsWith("/share")) continue;
      if (low.startsWith("/dialog") || low.startsWith("/plugins")) continue;
      if (/\/(posts|photos|videos|reel|watch|stories|groups|marketplace|events|gaming)\b/i.test(path)) {
        continue;
      }
      candidates.push(c);
    } catch {
      /* skip */
    }
  }
  const uniq = [...new Set(candidates)];
  if (uniq.length === 0) return undefined;

  const scoreUrl = (url: string): number => {
    try {
      const p = new URL(url).pathname.toLowerCase();
      let s = 0;
      if (slug && p.includes(slug)) s += 12;
      const segments = p.split("/").filter(Boolean);
      if (segments.length === 1) s += 4;
      if (p.includes("/people/")) s += 2;
      if (p.includes("/pages/")) s += 3;
      return s;
    } catch {
      return 0;
    }
  };

  uniq.sort((a, b) => scoreUrl(b) - scoreUrl(a));
  return uniq[0];
}

/** Collect unique Facebook page URLs to try for HTML page-id extraction */
export function collectFacebookPageUrls(hits: SearchHit[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const { url } of hits) {
    const canon = toFacebookWebUrl(url);
    if (canon && !seen.has(canon)) {
      seen.add(canon);
      out.push(canon);
    }
  }
  return out.slice(0, 5);
}

/** Same page on mbasic/m host — often smaller HTML, easier to parse */
export function expandFacebookUrlsForScrape(wwwUrls: string[]): string[] {
  const expanded: string[] = [];
  const seen = new Set<string>();
  for (const u of wwwUrls) {
    for (const next of [u, u.replace("//www.facebook.com", "//mbasic.facebook.com"), u.replace("//www.facebook.com", "//m.facebook.com")]) {
      if (!seen.has(next)) {
        seen.add(next);
        expanded.push(next);
      }
    }
  }
  return expanded.slice(0, 12);
}

/** Extract all links from markdown or HTML-like content */
export function extractLinksFromContent(content: string): string[] {
  const urlRegex = /https?:\/\/[^\s)\]"']+/gi;
  const matches = content.match(urlRegex) || [];
  return [...new Set(matches.map((u) => u.replace(/[)\]"']+$/, "")))];
}

/** First search-hit URL that looks like a given platform (for “preview source” links). */
export function pickPreviewUrlFromHits(
  hits: SearchHit[],
  platform:
    | "meta"
    | "x"
    | "tiktok"
    | "youtube"
    | "linkedin"
    | "pinterest"
    | "snapchat"
    | "reddit"
    | "shopping"
    | "microsoft"
): string | undefined {
  for (const { url: raw } of hits) {
    const url = normalizeSocialUrlCandidate(raw);
    const lower = url.toLowerCase();
    switch (platform) {
      case "meta":
        if (/facebook\.com|fb\.com|fb\.me/i.test(lower)) return url;
        break;
      case "x":
        if (/(?:twitter\.com|x\.com)\//i.test(lower)) return url;
        break;
      case "tiktok":
        if (/tiktok\.com\//i.test(lower)) return url;
        break;
      case "youtube":
        if (/youtube\.com|youtu\.be/i.test(lower)) return url;
        break;
      case "linkedin":
        if (/linkedin\.com\//i.test(lower)) return url;
        break;
      case "pinterest":
        if (/pinterest\.com\//i.test(lower)) return url;
        break;
      case "snapchat":
        if (/snapchat\.com\//i.test(lower)) return url;
        break;
      case "reddit":
        if (/reddit\.com\/(r|user)\//i.test(lower)) return url;
        break;
      case "shopping":
        if (/google\.com\/.*shopping|merchants\.google/i.test(lower)) return url;
        break;
      case "microsoft":
        if (
          /ads\.microsoft\.com|adlibrary\.about\.ads\.microsoft|advertiser\.microsoft\.com/i.test(
            lower
          )
        )
          return url;
        break;
      default:
        break;
    }
  }
  return undefined;
}
