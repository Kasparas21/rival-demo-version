import { FEATURE_DEFINITIONS } from "@/components/marketing/features-page-data";
import type { Locale } from "@/lib/i18n/locale";

export type NavLink = { label: string; href: string };

export type NavDropdown = {
  type: "dropdown";
  label: string;
  items: NavLink[];
};

export type NavDirectLink = {
  type: "link";
  label: string;
  href: string;
};

export type SiteNavItem = NavDropdown | NavDirectLink;

const ADSPY_SLUGS = ["meta", "google", "tiktok", "linkedin", "pinterest", "snapchat"] as const;
export type AdspyPlatformSlug = (typeof ADSPY_SLUGS)[number];

export const ADSPY_PLATFORM_SLUGS: AdspyPlatformSlug[] = [...ADSPY_SLUGS];

export const FEATURE_SLUGS = FEATURE_DEFINITIONS.map((f) => f.id);

type NavLabels = {
  home: string;
  adspy: string;
  features: string;
  pricing: string;
  resources: string;
  tutorials: string;
  blog: string;
  tools: string;
  adspyPlatforms: Record<AdspyPlatformSlug, string>;
  featurePages: Record<string, string>;
};

const NAV_LABELS_EN: NavLabels = {
  home: "Home",
  adspy: "AdSpy",
  features: "Features",
  pricing: "Pricing",
  resources: "Resources",
  tutorials: "Tutorials",
  blog: "Blog",
  tools: "Tools",
  adspyPlatforms: {
    meta: "Meta AdSpy",
    google: "Google AdSpy",
    tiktok: "TikTok AdSpy",
    linkedin: "LinkedIn AdSpy",
    pinterest: "Pinterest AdSpy",
    snapchat: "Snapchat AdSpy",
  },
  featurePages: Object.fromEntries(FEATURE_DEFINITIONS.map((f) => [f.id, f.name])),
};

const NAV_LABELS_DE: NavLabels = {
  home: "Start",
  adspy: "AdSpy",
  features: "Features",
  pricing: "Preise",
  resources: "Ressourcen",
  tutorials: "Tutorials",
  blog: "Blog",
  tools: "Tools",
  adspyPlatforms: {
    meta: "Meta AdSpy",
    google: "Google AdSpy",
    tiktok: "TikTok AdSpy",
    linkedin: "LinkedIn AdSpy",
    pinterest: "Pinterest AdSpy",
    snapchat: "Snapchat AdSpy",
  },
  featurePages: {
    "ad-library": "Multi-Plattform Ad Library",
    "strategy-map": "Strategy Map",
    "three-moves": "Three Moves",
    "stealable-angles": "Stealable Angles",
    "copy-vault": "Copy Vault",
    timeline: "Timeline",
    "activity-score": "Activity Score",
    "audience-inference": "Audience Inference",
    "monday-digest": "Monday Digest",
    "platform-prioritization": "Smart Platform Prioritization",
  },
};

const NAV_LABELS_NL: NavLabels = {
  home: "Home",
  adspy: "AdSpy",
  features: "Features",
  pricing: "Prijzen",
  resources: "Bronnen",
  tutorials: "Tutorials",
  blog: "Blog",
  tools: "Tools",
  adspyPlatforms: {
    meta: "Meta AdSpy",
    google: "Google AdSpy",
    tiktok: "TikTok AdSpy",
    linkedin: "LinkedIn AdSpy",
    pinterest: "Pinterest AdSpy",
    snapchat: "Snapchat AdSpy",
  },
  featurePages: {
    "ad-library": "Multi-platform Ad Library",
    "strategy-map": "Strategy Map",
    "three-moves": "Three Moves",
    "stealable-angles": "Stealable Angles",
    "copy-vault": "Copy Vault",
    timeline: "Timeline",
    "activity-score": "Activity Score",
    "audience-inference": "Audience Inference",
    "monday-digest": "Monday Digest",
    "platform-prioritization": "Smart Platform Prioritization",
  },
};

function navLabelsForLocale(locale: Locale): NavLabels {
  if (locale === "de") return NAV_LABELS_DE;
  if (locale === "nl") return NAV_LABELS_NL;
  return NAV_LABELS_EN;
}

export function getSiteNav(locale: Locale): SiteNavItem[] {
  const labels = navLabelsForLocale(locale);

  return [
    { type: "link", label: labels.home, href: "/" },
    {
      type: "dropdown",
      label: labels.adspy,
      items: ADSPY_PLATFORM_SLUGS.map((slug) => ({
        label: labels.adspyPlatforms[slug],
        href: `/adspy/${slug}`,
      })),
    },
    {
      type: "dropdown",
      label: labels.features,
      items: FEATURE_SLUGS.map((slug) => ({
        label: labels.featurePages[slug] ?? slug,
        href: `/features/${slug}`,
      })),
    },
    { type: "link", label: labels.pricing, href: "/#pricing" },
    {
      type: "dropdown",
      label: labels.resources,
      items: [
        { label: labels.tutorials, href: "/resources/tutorials" },
        { label: labels.blog, href: "/blog" },
        { label: labels.tools, href: "/resources/tools" },
      ],
    },
  ];
}

/** Flat list of marketing paths for sitemap generation. */
export function getMarketingStaticPaths(): string[] {
  return [
    ...ADSPY_PLATFORM_SLUGS.map((slug) => `/adspy/${slug}`),
    ...FEATURE_SLUGS.map((slug) => `/features/${slug}`),
    "/resources/tutorials",
    "/resources/tools",
  ];
}
