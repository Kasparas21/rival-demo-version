/** Lowercase letters/digits only, accents folded: "Rothy's" → "rothys", "Margentūra" → "margentura". */
function compact(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/** Title fragments split on the usual separators: "Allbirds | Shoes — Official" → ["Allbirds", "Shoes", "Official"]. */
function titleSegments(title: string | null | undefined): string[] {
  if (!title?.trim()) return [];
  return title
    .split(/\s+[|–—\-:·•]\s+|\s*[|–—·•]\s*|:\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function titleCaseLabel(label: string): string {
  return label
    .split(/[-_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Brand name for a site. Page and Open Graph titles are often slogans ("The World's Most Comfortable Shoes"),
 * so prefer a site name or title segment that matches the domain, then a short site name, then the domain.
 */
export function pickBrandName(params: {
  domain: string;
  ogSiteName?: string | null;
  ogTitle?: string | null;
  title?: string | null;
}): string {
  const host = params.domain.trim().toLowerCase().replace(/^www\./, "");
  const label = host.split(".")[0] ?? host;
  const labelCompact = compact(label);

  const candidates = [
    params.ogSiteName?.trim() || "",
    ...titleSegments(params.title),
    ...titleSegments(params.ogTitle),
  ].filter((c) => c.length > 0 && c.length <= 60);

  if (labelCompact.length >= 3) {
    const exact = candidates.find((c) => compact(c) === labelCompact);
    if (exact) return exact;
    const close = candidates.find((c) => {
      const cc = compact(c);
      return cc.length >= 3 && (cc.startsWith(labelCompact) || labelCompact.startsWith(cc)) && c.split(/\s+/).length <= 4;
    });
    if (close) return close;
  }

  const siteName = params.ogSiteName?.trim();
  if (siteName && siteName.length <= 40 && siteName.split(/\s+/).length <= 4) return siteName;

  return label ? titleCaseLabel(label) : host;
}
