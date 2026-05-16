"use client";

import { ExternalLink, Globe } from "lucide-react";
import { useMemo, useState } from "react";

type Props = {
  url: string;
  /** Path or full display without forcing scheme (matches list row styling). */
  displayPath: string;
  faviconUrl: string | null;
  onCopy: () => void;
  /** e.g. `Used in 3 ads · Meta · Google` */
  metaLine: string | null;
  competitorLabel: string;
  competitorDomainNorm: string;
};

function normalizeHost(hostname: string): string {
  return hostname.replace(/^www\./i, "").toLowerCase();
}

/**
 * Short, URL-only guess of what kind of landing page this is (no server-side fetch).
 * Used to make the embed-fallback card feel informative instead of empty.
 */
export function inferLandingPageContext(
  url: string,
  competitorDomainNorm: string,
  competitorLabel: string,
): { kindLabel: string; explanation: string } {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return {
      kindLabel: "Ad landing URL",
      explanation: `Link destination used in ads you’re tracking for ${competitorLabel}. Open in a new tab to see it exactly as clickers do.`,
    };
  }

  const host = normalizeHost(parsed.hostname);
  const brandDomain = normalizeHost(competitorDomainNorm.trim() || "invalid.");
  const rawPath = parsed.pathname || "/";
  const path = rawPath.replace(/\/+$/, "") || "/";
  const pathLower = path.toLowerCase();
  const search = parsed.search || "";

  const onBrandDomain =
    Boolean(brandDomain) &&
    brandDomain !== "invalid." &&
    (host === brandDomain || host.endsWith(`.${brandDomain}`));

  const brandRoot = brandDomain.split(".")[0] ?? "";
  let regionalNote: string | null = null;
  if (!onBrandDomain && brandRoot && host.includes(brandRoot)) {
    regionalNote = "Looks like a regional or alternate storefront on a related hostname.";
  } else if (!onBrandDomain) {
    regionalNote = "Hostname differs from your primary tracked domain — still normal if ads deep-link here.";
  }

  let kindLabel = "Landing page";
  let explanation =
    onBrandDomain || !regionalNote?.includes("differs")
      ? `Where ${competitorLabel}’s (or this competitor’s) ads send traffic after a click.`
      : `Destination used in tracked ads for ${competitorLabel}.`;

  if (path === "/" || path === "") {
    kindLabel = "Homepage or site root";
    explanation = onBrandDomain
      ? `Main entry to this site — hero, navigation, and top funnels. Often not a single “product” but the brand front door.`
      : `Top-level page on this hostname.`;
  } else if (/\/collection(s)?(\/|$)/.test(pathLower)) {
    kindLabel = "Collection / category";
    explanation =
      "Usually a browsable group of products (gender line, drop, category). Good for comparing positioning across many SKUs.";
  } else if (
    /\/(product|products|p|item|dp)(\/?|$)/.test(pathLower) ||
    /^\/shop\/[^/]+\/?$/i.test(pathLower)
  ) {
    kindLabel = "Product-style page";
    explanation =
      "Likely a PDP or product-focused URL — pricing, imagery, variants, and add-to-cart tend to live here.";
  } else if (/\/(cart|checkout|basket|bag)(\/?|$)/.test(pathLower)) {
    kindLabel = "Cart or checkout";
    explanation = "Part of the purchase path — more common for retargeting or bottom-of-funnel ads.";
  } else if (
    /\/(new|new-releases|new_arrivals|just-dropped|must-have|latest|sale|deals|outlet|promo|black-friday|cyber)(\/|$)/i.test(
      pathLower,
    )
  ) {
    kindLabel = "Promo or new-arrivals hub";
    explanation =
      "Merchandising or campaign-focused landing — highlights new drops, edits, or discounted lines.";
  } else if (/\/(blog|blogs|news|articles?|stories|journal|magazine)(\/|$)/.test(pathLower)) {
    kindLabel = "Editorial / content";
    explanation = "Story, PR, or SEO article-style page rather than a classic shop template.";
  } else if (/\/pages?(\/|$)/.test(pathLower)) {
    kindLabel = "Static or story page";
    explanation =
      "Common pattern for brand story, FAQ, policy, or long-form campaign landing on Shopify-style stacks.";
  } else if (search && /utm_/i.test(search)) {
    kindLabel = "Campaign-tagged link";
    explanation =
      "URL carries UTM (or similar) params — typical for paid social/search so analytics can attribute traffic.";
  }

  if (regionalNote && !explanation.includes(regionalNote.slice(0, 12))) {
    explanation = `${explanation} ${regionalNote}`;
  }

  return { kindLabel, explanation };
}

/**
 * Shown when a landing URL can’t be embedded (CSP / X-Frame-Options / Chrome error page).
 */
export function LandingPagePreviewFallbackCard({
  url,
  displayPath,
  faviconUrl,
  onCopy,
  metaLine,
  competitorLabel,
  competitorDomainNorm,
}: Props) {
  const [faviconFailed, setFaviconFailed] = useState(false);

  const { kindLabel, explanation } = useMemo(
    () => inferLandingPageContext(url, competitorDomainNorm, competitorLabel),
    [url, competitorDomainNorm, competitorLabel],
  );

  return (
    <div className="mx-auto w-full max-w-[420px] rounded-2xl border border-slate-200/95 bg-gradient-to-b from-white to-slate-50/80 px-6 py-8 text-center shadow-[0_12px_40px_rgba(15,23,42,0.08)] ring-1 ring-slate-900/[0.03]">
      <p className="mb-4 inline-flex items-center justify-center rounded-full border border-slate-200/90 bg-slate-100/90 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600">
        Live preview unavailable
      </p>

      <div className="mb-4 flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        {faviconFailed || !faviconUrl ? (
          <Globe className="h-8 w-8 text-slate-400" aria-hidden />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- remote favicons
          <img
            src={faviconUrl}
            alt=""
            width={56}
            height={56}
            className="h-14 w-14 object-contain p-1"
            onError={() => setFaviconFailed(true)}
          />
        )}
      </div>

      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{kindLabel}</p>
      <p className="mb-3 break-all font-mono text-[13px] font-semibold leading-snug text-slate-900">{displayPath}</p>

      <p className="mb-2 text-left text-[13px] leading-relaxed text-slate-600">{explanation}</p>
      <p className="mb-6 text-left text-[12px] leading-relaxed text-slate-500">
        Browsers block many sites from opening inside Rival if they forbid framing (security). You can still inspect the
        page safely in a new tab.
      </p>

      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[color:var(--rival-primary)] px-4 py-3 text-[13px] font-semibold text-white hover:opacity-90"
      >
        Open in new tab
        <ExternalLink className="h-4 w-4" aria-hidden />
      </a>
      <button
        type="button"
        onClick={onCopy}
        className="mt-3 text-[11px] font-medium text-blue-600 underline decoration-blue-200 underline-offset-2 hover:text-blue-700"
      >
        Copy URL
      </button>
      {metaLine ? <p className="mt-5 text-[11px] text-slate-500">{metaLine}</p> : null}
      <p className="mt-2 text-[10px] text-slate-400">Preview blocked by this site&apos;s security headers (e.g. CSP / X-Frame-Options)</p>
    </div>
  );
}

/** Heuristic: after iframe load, decide if we’re seeing a real page or a browser / CSP interstitial. */
export function classifyLandingPreviewEmbed(iframe: HTMLIFrameElement | null): "ok" | "blocked" {
  if (!iframe) return "blocked";

  try {
    const href = iframe.contentWindow?.location?.href ?? "";
    if (!href) return "blocked";
    const h = href.toLowerCase();
    if (h === "about:blank") return "blocked";
    if (h.startsWith("chrome-error:") || h.startsWith("chrome:")) return "blocked";
  } catch {
    /* Expected for many working cross-origin frames */
  }

  try {
    const doc = iframe.contentDocument;
    if (doc == null) return "ok";
    if (!doc.body) return "blocked";
    if (doc.body.children.length === 0) return "blocked";

    const title = (doc.title || "").toLowerCase();
    if (
      title.includes("refused to connect") ||
      title.includes("this site can't be reached") ||
      title.includes("this page has been blocked") ||
      title.includes("site unavailable") ||
      title.includes("privacy error") ||
      title.includes("certificate") ||
      title.includes("your connection is not private") ||
      title.includes("doesn't support embedded") ||
      title.includes("cannot be displayed in a frame")
    ) {
      return "blocked";
    }

    const text = (doc.body.innerText || "").slice(0, 1200).toLowerCase();
    if (
      text.includes("refused to connect") ||
      text.includes("err_blocked_by_response") ||
      text.includes("x-frame-options") ||
      text.includes("cannot display") ||
      text.includes("blocked:csp") ||
      text.includes("chrome-error") ||
      text.includes("this page has been blocked by chrome") ||
      text.includes("because it set 'x-frame-options'") ||
      text.includes("because it set \"x-frame-options\"") ||
      text.includes("err_ssl") ||
      text.includes("net::err_") ||
      text.includes("sameorigin") ||
      text.includes("frame-ancestors") ||
      (text.includes("iframe") && text.includes("refused"))
    ) {
      return "blocked";
    }
  } catch {
    return "ok";
  }

  return "ok";
}
