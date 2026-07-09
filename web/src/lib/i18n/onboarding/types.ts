import type { LandingPlanOffer } from "@/lib/i18n/landing/types";

export type OnboardingBillingPlan = LandingPlanOffer & {
  slug: "starter" | "pro" | "agency";
  monthlyUsd: number;
  annualMonthlyUsd: number;
  annualYearlyUsd: number;
};

export type IdentifierValidationCopy = {
  metaAdLibrary: string;
  googleTransparency: string;
  linkedInKeyword: string;
};

export type OnboardingFormCopy = {
  back: string;
  continue: string;
  continueToSignup: string;
  saving: string;
  loadingFavicon: string;
  adMarketsAria: string;
  noneAddMarkets: string;
  globalTerritoryTitle: string;
  global: string;
  auto: string;
  change: string;
  done: string;
  brandLabel: string;
  aboutLabel: string;
  /** Template: `{label}` */
  openAdsLibraryTitle: string;
  /** Template: `{label}` */
  openAdsLibrarySrOnly: string;
  website: {
    title: string;
    placeholder: string;
  };
  brand: {
    loadingTitle: string;
    readyTitle: string;
    emptyState: string;
  };
  platforms: {
    title: string;
    body: string;
  };
  markets: {
    title: string;
    body: string;
    pickHint: string;
  };
  profiles: {
    title: string;
    body: string;
    bodyEmphasis: string;
    metaPlaceholder: string;
    googlePlaceholder: string;
    linkedInPlaceholder: string;
    tiktokPlaceholder: string;
    snapchatPlaceholder: string;
    pinterestPlaceholder: string;
  };
  actions: {
    getStarted: string;
    startScraping: string;
    settingUp: string;
    startingScrape: string;
  };
  errors: {
    enterWebsite: string;
    invalidWebsite: string;
    invalidWebsiteGoBack: string;
    brandPreviewFailed: string;
    networkBrandScan: string;
    pickPlatform: string;
    pickRegions: string;
    googleTransparencyRequired: string;
    somethingWrong: string;
    finishFailed: string;
    saveBrandFailed: string;
    saveCompetitorsFailed: string;
    serverUnreachable: string;
  };
  validation: IdentifierValidationCopy;
};

export type PlanPickerCopy = {
  allSet: string;
  choosePlanTitle: string;
  intro: string;
  trialBadge: string;
  billingAria: string;
  monthly: string;
  annual: string;
  /** Template: `{percent}` */
  savePercentBadge: string;
  perMonth: string;
  /** Template: `{percent}` */
  saveVsMonthly: string;
  startFreeTrial: string;
  popular: string;
  includes: string;
  billedMonthly: string;
  /** Template: `{yearlyUsd}` */
  billedAnnually: string;
  /** Link shown when user is stuck on choose-plan but wants another account. */
  switchAccount: string;
  tester: {
    title: string;
    body: string;
    badge: string;
    complimentary: string;
    activate: string;
    activating: string;
    /** Template: `{amount}` */
    listPricePerMonth: string;
    freePerMonth: string;
    claimError: string;
    networkError: string;
  };
  plans: OnboardingBillingPlan[];
};

export type OnboardingCopy = {
  localeSwitcherAria: string;
  form: OnboardingFormCopy;
  planPicker: PlanPickerCopy;
};
