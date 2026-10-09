import { createDiscoverFirecrawlClient } from "@/lib/competitor-discover-firecrawl";

export type SiteText = {
  url: string;
  title: string;
  description: string;
  /** Visible text, trimmed to a few thousand characters. */
  text: string;
  lang: string | null;
  /** True when the free fetch returned too little and Firecrawl was used (1 credit). */
  viaFirecrawl: boolean;
};

const FETCH_TIMEOUT_MS = 8_000;
const MAX_TEXT = 3_500;
const MIN_USEFUL_TEXT = 400;

const ENTITIES: Record<string, string> = { amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " " };
const decode = (s: string) =>
  s.replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (m, e: string) =>
    e[0] === "#"
      ? String.fromCodePoint(e[1]?.toLowerCase() === "x" ? Number.parseInt(e.slice(2), 16) : Number.parseInt(e.slice(1), 10))
      : (ENTITIES[e.toLowerCase()] ?? m),
  );

/** Title, meta description, language and visible text of an HTML page. Pure. */
export function htmlToSiteText(html: string, url: string): Omit<SiteText, "viaFirecrawl"> {
  const title = decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").replace(/\s+/g, " ").trim();
  const description = decode(
    html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i)?.[1] ??
      html.match(/<meta[^>]+property=["']og:description["'][^>]*content=["']([^"']*)["']/i)?.[1] ??
      "",
  ).trim();
  const lang = html.match(/<html[^>]*\blang=["']?([a-z]{2})/i)?.[1]?.toLowerCase() ?? null;
  const text = decode(
    html
      .replace(/<head[\s\S]*?<\/head>/i, " ")
      .replace(/<(script|style|noscript|svg|template)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_TEXT);
  return { url, title, description, text, lang };
}

/** Read a site's homepage: a plain fetch first (free), Firecrawl when that returns too little text. */
export async function readSiteText(domain: string, opts: { allowFirecrawl?: boolean } = {}): Promise<SiteText | null> {
  const url = `https://${domain}/`;
  let fetched: Omit<SiteText, "viaFirecrawl"> | null = null;
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36",
        Accept: "text/html",
      },
    });
    if (res.ok && (res.headers.get("content-type") ?? "").includes("html")) {
      fetched = htmlToSiteText((await res.text()).slice(0, 1_500_000), res.url || url);
    }
  } catch {
    /* fall through */
  }
  if (fetched && fetched.text.length >= MIN_USEFUL_TEXT) return { ...fetched, viaFirecrawl: false };
  if (opts.allowFirecrawl === false) return fetched ? { ...fetched, viaFirecrawl: false } : null;

  try {
    const doc = await createDiscoverFirecrawlClient().scrape(url, { formats: ["markdown"], onlyMainContent: true });
    const markdown = (doc.markdown ?? "").replace(/!\[[^\]]*\]\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
    if (!markdown && !fetched) return null;
    const meta = (doc.metadata ?? {}) as { title?: string; description?: string; language?: string; sourceURL?: string };
    return {
      url: meta.sourceURL ?? url,
      title: meta.title?.trim() || fetched?.title || "",
      description: meta.description?.trim() || fetched?.description || "",
      text: (markdown || fetched?.text || "").slice(0, MAX_TEXT),
      lang: meta.language?.slice(0, 2).toLowerCase() || fetched?.lang || null,
      viaFirecrawl: true,
    };
  } catch {
    return fetched ? { ...fetched, viaFirecrawl: false } : null;
  }
}
