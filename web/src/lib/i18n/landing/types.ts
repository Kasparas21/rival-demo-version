import type { Locale } from "@/lib/i18n/locale";

export type FaqItem = { q: string; a: string };

export type LandingCapabilityKey = "paid" | "organic" | "email" | "autopilot" | "mcp";

export type LandingCapabilityTile = {
  key: LandingCapabilityKey;
  label: string;
};

export type LandingNavItem = { label: string; sectionId: string };

export type LandingReview = {
  name: string;
  photo?: string;
  initials?: string;
  /** Footer line, e.g. "US · Jan 2026" */
  meta: string;
  verified?: boolean;
  text: string;
  /** In-card photo — gradient placeholder when omitted */
  featureImage?: string;
  /** Overrides the section-level feature image alt template. */
  featureImageAlt?: string;
  /** Screenshot height tier for the crush-style staggered grid. */
  cardSize?: "default" | "tall" | "tallest";
  /** Faint peek card at the bottom of the grid (center column). */
  peek?: boolean;
};

export type LandingPlanMetricHighlight = {
  count: string;
  label: string;
};

export type LandingPlanOffer = {
  slug: "starter" | "pro" | "agency";
  name: string;
  summary: string;
  monthlyUsd: number;
  annualMonthlyUsd: number;
  annualYearlyUsd: number;
  /** Strikethrough "was" price on monthly billing (e.g. launch discount). */
  originalMonthlyUsd?: number;
  /** Primary decision metric - rendered large above the feature list. */
  metricHighlight?: LandingPlanMetricHighlight;
  features: string[];
  plusLabel?: string;
  popular?: boolean;
};

export type ComparisonRowCopy = {
  feature: string;
  featureMobile: string;
  rival: boolean;
  panoramata: boolean;
  adspyder: boolean;
  poweradspy: boolean;
  adlibrary: boolean;
};

export type ComparisonSectionCopy = {
  title: string;
  rows: ComparisonRowCopy[];
};

export type StackToolCopy = {
  name: string;
  iconKey: "search" | "userSearch" | "play" | "layers" | "folder" | "spreadsheet";
  iconClass: string;
  iconBg: string;
};

export type LandingHeroHeadlineCopy = {
  /** First line: `{line1Prefix}{highlight}` e.g. "see every ad" */
  line1Prefix: string;
  highlight: string;
  line2: string;
  subline: string;
  /** Shorter subline for narrow viewports. */
  sublineMobile?: string;
};

export type LandingHeroCoverageKey = "paid" | "organic" | "email" | "autopilot" | "mcp";

export type LandingHeroCoverageChip = {
  key: LandingHeroCoverageKey;
  label: string;
  href?: string;
  linkAriaLabel?: string;
};

export type LandingHowItWorksStep = {
  title: string;
  body: string;
};

export type LandingAutopilotFeedItem = {
  time: string;
  tag: "ad" | "email" | "organic" | "page" | "report";
  tagLabel: string;
  text: string;
};

export type LandingCoverageCardKey =
  | "paid"
  | "organic"
  | "email"
  | "strategy-map"
  | "landing-tests"
  | "winners";

export type LandingCoverageCard = {
  key: LandingCoverageCardKey;
  title: string;
  /** One short line under the title (the visual carries the rest). */
  tagline: string;
};

export type LandingCoverageGroup = {
  label: string;
  cards: LandingCoverageCard[];
};

export type LandingCopy = {
  locale: Locale;
  meta: {
    title: string;
    description: string;
  };
  header: {
    navItems: LandingNavItem[];
    startTrial: string;
    homeAria: string;
    primaryNavAria: string;
    localeSwitcherAria: string;
  };
  hero: {
    headline: LandingHeroHeadlineCopy;
    trialCta: string;
    platformTrialAria: string;
    marketersPillAria: string;
    marketersPill: string;
    brandMarqueeAria: string;
    brandMarqueeLabel: string;
    /** Channel checklist under the hero CTA. */
    coverage: {
      chips: LandingHeroCoverageChip[];
    };
  };
  howItWorks: {
    titleLine1: string;
    titleHighlight: string;
    /** Trailing phrase on the headline line, e.g. "in 5 minutes". */
    titleSuffix?: string;
    steps: [LandingHowItWorksStep, LandingHowItWorksStep, LandingHowItWorksStep];
    cta: string;
  };
  autopilot: {
    titleLine1: string;
    titleHighlight: string;
    subtitle: string;
    /** Big-number stat rows (replaces prose bullets - visual-first). */
    stats: Array<{ value: string; label: string; sub: string }>;
    feed: {
      title: string;
      liveLabel: string;
      items: LandingAutopilotFeedItem[];
      footer: string;
      /** Rich Slack "brief" attachment on the final message - the payoff + in-chat CTA. */
      brief: {
        title: string;
        highlights: string[];
        cta: string;
      };
    };
    cta: string;
  };
  coverage: {
    titleLine1: string;
    titleHighlight: string;
    subtitle: string;
    groups: LandingCoverageGroup[];
    cta: string;
  };
  mcp: {
    titleLine1: string;
    titleHighlight: string;
    subtitle: string;
    chat: {
      connectedLabel: string;
      userMsg: string;
      replyIntro: string;
      replyBullets: string[];
      replyOutro: string;
      inputPlaceholder: string;
    };
    worksWith: string;
    clients: string[];
    cta: string;
  };
  features: {
    titleLine1: string;
    titleHighlight: string;
    subtitle: string;
    capabilitiesLabel: string;
    capabilities: LandingCapabilityTile[];
    cards: Array<{ imageAlt: string; title: string; body: string }>;
    cta: string;
  };
  stackReplacement: {
    titlePrefix: string;
    titleHighlight: string;
    titleSuffix: string;
    vs: string;
    withoutTitle: string;
    withoutBadge: string;
    withoutIntro: string;
    withoutIntroMobile: string;
    withoutStatTools: string;
    withoutStatLogins: string;
    withoutStatGlue: string;
    /** Template: `{count}` */
    toolsSummary: string;
    toolsSummaryMobile: string;
    manualLabel: string;
    manualLabelMobile: string;
    painPoints: string[];
    painPointsMobile: string[];
    payTodayLabel: string;
    payTodayAmount: string;
    payTodaySub: string;
    payTodayBullets: string[];
    payTodayFooter: string;
    payTodayFooterSub: string;
    bottomBadge: string;
    withTitle: string;
    platformsLabel: string;
    platformsLabelMobile: string;
    capabilitiesLabel: string;
    capabilities: LandingCapabilityTile[];
    onePlanLabel: string;
    price: string;
    priceSuffix: string;
    zeroGlue: string;
    saveLabel: string;
    saveSub: string;
    saveSubMobile: string;
    trialCta: string;
    stackTools: StackToolCopy[];
    platforms: readonly string[];
  };
  reviews: {
    title: string;
    subtitle: string;
    /** Template: `{name}` */
    photoAlt: string;
    /** Template: `{count}` */
    featureImageAlt: string;
    socialProof: {
      count: string;
      label: string;
      trustpilotAria: string;
    };
    items: LandingReview[];
  };
  pricing: {
    titleLine1: string;
    titleHighlight: string;
    riskFreeBadge: string;
    guaranteeTitle: string;
    guaranteeBody: string;
    billingAria: string;
    monthly: string;
    yearly: string;
    planIncludes: string;
    footnote: string;
    trialCta: string;
    popularBadge: string;
    popularClaim: string;
    perMonth: string;
    /** Template: `{price}` - per-competitor unit cost under the metric highlight. */
    perCompetitor: string;
    billedMonthly: string;
    /** Template: `{yearlyUsd}` */
    billedAnnually: string;
    plans: LandingPlanOffer[];
  };
  faq: {
    titleLine1: string;
    titleHighlight: string;
    items: FaqItem[];
  };
  comparison: {
    titleLine1: string;
    titleHighlight: string;
    subtitle: string;
    featureColumn: string;
    yesAria: string;
    noAria: string;
    cta: string;
    ctaFootnote: string;
    sections: ComparisonSectionCopy[];
    competitorColumns: Array<{ key: string; label: string; short: string; mobile: string }>;
  };
  finalCta: {
    titleLine1: string;
    titleHighlight: string;
    subtitle: string;
    monthlyPrice: string;
    annualPrice: string;
    monthlyLabel: string;
    annualLabel: string;
    annualSaveBadge: string;
    billingAria: string;
    trialCta: string;
    cancelNote: string;
  };
  footer: {
    columns: Array<{ title: string; links: Array<{ label: string; href: string }> }>;
    copyright: string;
  };
  jsonLd: {
    appDescription: string;
    starterName: string;
    proName: string;
    agencyName: string;
  };
};
