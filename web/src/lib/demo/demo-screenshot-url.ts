/** SVG data URLs for demo landing-page screenshots (no live crawl). */

type ScreenshotTheme = {
  bgTop: string;
  bgBottom: string;
  nav: string;
  headline: string;
  subheadline: string;
  ctaBg: string;
  ctaText: string;
  accent: string;
};

const THEMES: Record<string, ScreenshotTheme> = {
  homepage: {
    bgTop: "#ffffff",
    bgBottom: "#f8fafc",
    nav: "#0f172a",
    headline: "#0f172a",
    subheadline: "#64748b",
    ctaBg: "#0f172a",
    ctaText: "#ffffff",
    accent: "#4a7fa5",
  },
  homepageBefore: {
    bgTop: "#1e3a5f",
    bgBottom: "#4a7fa5",
    nav: "#ffffff",
    headline: "#ffffff",
    subheadline: "#dbeafe",
    ctaBg: "#ffffff",
    ctaText: "#1e3a5f",
    accent: "#93c5fd",
  },
  sale: {
    bgTop: "#fef3c7",
    bgBottom: "#fbbf24",
    nav: "#78350f",
    headline: "#78350f",
    subheadline: "#92400e",
    ctaBg: "#b45309",
    ctaText: "#ffffff",
    accent: "#f59e0b",
  },
  saleBefore: {
    bgTop: "#fffbeb",
    bgBottom: "#fde68a",
    nav: "#92400e",
    headline: "#92400e",
    subheadline: "#b45309",
    ctaBg: "#d97706",
    ctaText: "#ffffff",
    accent: "#fbbf24",
  },
  join: {
    bgTop: "#ecfdf5",
    bgBottom: "#6ee7b7",
    nav: "#065f46",
    headline: "#065f46",
    subheadline: "#047857",
    ctaBg: "#059669",
    ctaText: "#ffffff",
    accent: "#34d399",
  },
  joinAlt: {
    bgTop: "#f0fdf4",
    bgBottom: "#bbf7d0",
    nav: "#14532d",
    headline: "#14532d",
    subheadline: "#166534",
    ctaBg: "#16a34a",
    ctaText: "#ffffff",
    accent: "#86efac",
  },
  outlet: {
    bgTop: "#faf5ff",
    bgBottom: "#c4b5fd",
    nav: "#5b21b6",
    headline: "#5b21b6",
    subheadline: "#6d28d9",
    ctaBg: "#7c3aed",
    ctaText: "#ffffff",
    accent: "#a78bfa",
  },
  outletAlt: {
    bgTop: "#f5f3ff",
    bgBottom: "#ddd6fe",
    nav: "#4c1d95",
    headline: "#4c1d95",
    subheadline: "#6d28d9",
    ctaBg: "#6d28d9",
    ctaText: "#ffffff",
    accent: "#c4b5fd",
  },
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = w;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

export function buildDemoScreenshotUrl(opts: {
  theme: keyof typeof THEMES;
  headline: string;
  subheadline?: string;
  cta?: string;
  badge?: string;
  hero?: boolean;
}): string {
  const theme = THEMES[opts.theme] ?? THEMES.homepage;
  const w = 800;
  const h = opts.hero ? 480 : 1280;
  const headlineLines = wrapText(opts.headline, opts.hero ? 22 : 28);
  const subLines = opts.subheadline ? wrapText(opts.subheadline, opts.hero ? 26 : 36) : [];

  const headlineY = opts.hero ? 180 : 220;
  const headlineSvg = headlineLines
    .map(
      (line, i) =>
        `<tspan x="56" dy="${i === 0 ? 0 : 44}" font-size="${opts.hero ? 34 : 42}" font-weight="700" fill="${theme.headline}">${esc(line)}</tspan>`,
    )
    .join("");
  const subSvg = subLines
    .map(
      (line, i) =>
        `<tspan x="56" dy="${i === 0 ? 52 : 28}" font-size="${opts.hero ? 16 : 20}" fill="${theme.subheadline}">${esc(line)}</tspan>`,
    )
    .join("");

  const ctaY = headlineY + headlineLines.length * 44 + subLines.length * 28 + 48;
  const ctaSvg = opts.cta
    ? `<rect x="56" y="${ctaY}" width="${Math.min(220, opts.cta.length * 14 + 48)}" height="48" rx="10" fill="${theme.ctaBg}"/>
       <text x="76" y="${ctaY + 31}" font-size="16" font-weight="600" fill="${theme.ctaText}">${esc(opts.cta)}</text>`
    : "";

  const badgeSvg = opts.badge
    ? `<rect x="56" y="120" width="${opts.badge.length * 9 + 28}" height="28" rx="14" fill="${theme.accent}" opacity="0.25"/>
       <text x="70" y="139" font-size="12" font-weight="600" fill="${theme.accent}">${esc(opts.badge)}</text>`
    : "";

  const blocks = opts.hero
    ? ""
    : `<rect x="56" y="${ctaY + 100}" width="688" height="120" rx="12" fill="#ffffff" opacity="0.55"/>
       <rect x="56" y="${ctaY + 250}" width="330" height="180" rx="12" fill="#ffffff" opacity="0.45"/>
       <rect x="414" y="${ctaY + 250}" width="330" height="180" rx="12" fill="#ffffff" opacity="0.45"/>
       <rect x="56" y="${ctaY + 470}" width="688" height="220" rx="12" fill="#ffffff" opacity="0.35"/>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.2" y2="1">
      <stop offset="0%" stop-color="${theme.bgTop}"/>
      <stop offset="100%" stop-color="${theme.bgBottom}"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <rect x="0" y="0" width="${w}" height="64" fill="#ffffff" opacity="0.92"/>
  <circle cx="36" cy="32" r="10" fill="${theme.accent}"/>
  <rect x="64" y="26" width="72" height="12" rx="6" fill="${theme.nav}" opacity="0.85"/>
  <rect x="620" y="22" width="96" height="24" rx="12" fill="${theme.nav}" opacity="0.12"/>
  ${badgeSvg}
  <text x="56" y="${headlineY}">${headlineSvg}</text>
  ${subLines.length ? `<text x="56" y="${headlineY + headlineLines.length * 44}">${subSvg}</text>` : ""}
  ${ctaSvg}
  ${blocks}
</svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** Tight section crop for close-up before/after rows in change cards. */
export function buildDemoSectionCropUrl(opts: {
  theme: keyof typeof THEMES;
  section: "hero" | "pricing";
  headline?: string;
  cta?: string;
  pricingVariant?: "tiers" | "enterprise";
}): string {
  const theme = THEMES[opts.theme] ?? THEMES.homepage;
  const w = 520;
  const h = opts.section === "hero" ? 280 : 220;

  if (opts.section === "pricing") {
    const tiers =
      opts.pricingVariant === "enterprise"
        ? `<rect x="140" y="48" width="240" height="140" rx="14" fill="#1e3a5f"/>
           <text x="168" y="88" font-size="16" font-weight="700" fill="#ffffff">Enterprise</text>
           <text x="168" y="112" font-size="12" fill="#dbeafe">Custom pricing</text>
           <rect x="168" y="128" width="120" height="32" rx="8" fill="#ffffff"/>
           <text x="188" y="149" font-size="11" font-weight="600" fill="#1e3a5f">Contact us</text>`
        : `<rect x="24" y="56" width="140" height="120" rx="12" fill="#ffffff" opacity="0.9"/>
           <rect x="190" y="48" width="140" height="128" rx="12" fill="#ffffff"/>
           <rect x="356" y="56" width="140" height="120" rx="12" fill="#ffffff" opacity="0.9"/>
           <text x="44" y="88" font-size="13" font-weight="700" fill="#1e3a5f">Starter</text>
           <text x="210" y="80" font-size="13" font-weight="700" fill="#1e3a5f">Pro</text>
           <text x="376" y="88" font-size="13" font-weight="700" fill="#1e3a5f">Agency</text>`;

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <rect width="100%" height="100%" fill="${theme.bgBottom}"/>
      <text x="24" y="28" font-size="11" font-weight="600" fill="${theme.subheadline}">PRICING</text>
      ${tiers}
    </svg>`;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  }

  const headline = esc(opts.headline ?? "Headline");
  const cta = opts.cta ?? "Shop now";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0.2" y2="1">
        <stop offset="0%" stop-color="${theme.bgTop}"/>
        <stop offset="100%" stop-color="${theme.bgBottom}"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#bg)"/>
    <rect x="0" y="0" width="${w}" height="48" fill="#ffffff" opacity="0.15"/>
    <text x="28" y="108" font-size="22" font-weight="700" fill="${theme.headline}">${headline}</text>
    <rect x="28" y="148" width="${Math.min(160, cta.length * 11 + 40)}" height="36" rx="8" fill="${theme.ctaBg}"/>
    <text x="44" y="171" font-size="13" font-weight="600" fill="${theme.ctaText}">${esc(cta)}</text>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
