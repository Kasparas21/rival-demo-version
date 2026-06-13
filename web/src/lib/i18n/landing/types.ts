import type { Locale } from "@/lib/i18n/locale";

export type FaqItem = { q: string; a: string };

export type LandingNavItem = { label: string; sectionId: string };

export type LandingReview = {
  name: string;
  photo?: string;
  initials?: string;
  when: string;
  stars: 1 | 2 | 3 | 4 | 5;
  text: string;
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
  /** Primary decision metric — rendered large above the feature list. */
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
};

export type LandingCopy = {
  locale: Locale;
  meta: {
    title: string;
    description: string;
  };
  consent: {
    title: string;
    descriptionMobile: string;
    descriptionDesktop: string;
    policyShort: string;
    cookiePolicy: string;
    reject: string;
    accept: string;
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
  };
  features: {
    titleLine1: string;
    titleHighlight: string;
    subtitle: string;
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
    features: string[];
    featuresMobile: string[];
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
    titleLine1: string;
    titleHighlight: string;
    /** Template: `{count}` */
    starsAria: string;
    /** Template: `{name}` */
    photoAlt: string;
    items: LandingReview[];
  };
  pricing: {
    title: string;
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
    /** Template: `{price}` — per-competitor unit cost under the metric highlight. */
    perCompetitor: string;
    billedMonthly: string;
    /** Template: `{yearlyUsd}` */
    billedAnnually: string;
    plans: LandingPlanOffer[];
  };
  faq: {
    eyebrow: string;
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
