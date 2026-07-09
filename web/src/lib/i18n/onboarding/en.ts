import type { OnboardingCopy } from "@/lib/i18n/onboarding/types";
import { onboardingBillingPlansEn } from "@/lib/i18n/onboarding/billing-plans";

const form: OnboardingCopy["form"] = {
  back: "← Back",
  continue: "Continue →",
  continueToSignup: "Continue to sign up →",
  saving: "Saving…",
  loadingFavicon: "Loading favicon",
  adMarketsAria: "Ad markets",
  noneAddMarkets: "None — add markets",
  globalTerritoryTitle: "Include every supported territory",
  global: "Global",
  auto: "Auto",
  change: "Change",
  done: "Done",
  brandLabel: "Brand",
  aboutLabel: "About",
  openAdsLibraryTitle: "Open {label} ads library",
  openAdsLibrarySrOnly: "Open {label} in new tab",
  website: {
    title: "Your company website",
    placeholder: "yourwebsite.com",
  },
  brand: {
    loadingTitle: "Pulling your brand",
    readyTitle: "Looks good",
    emptyState: "Nothing loaded — go back or continue.",
  },
  platforms: {
    title: "Your ad platforms",
    body: "Tell us everywhere you actively run ads. We scrape those libraries to map the angles, creatives, and offers your company's pushing right now—which powers competitive strategy inside Rival.",
  },
  markets: {
    title: "Regions for your ads",
    body: "Markets power filters across Meta Ads Library, Google Transparency, TikTok Library, and more.",
    pickHint: "Pick Global, go back to Auto, or select at least one country.",
  },
  profiles: {
    title: "Your ad profiles",
    body: "We scrape each Ads Library endpoint you authorize so we can map the creatives, hooks, and funnels your company is leaning on—which feeds benchmarks and planning in Rival.",
    bodyEmphasis: "Your site domain is already on file from step one—we don't need it again here.",
    metaPlaceholder: "Ads Library advertiser URL",
    googlePlaceholder: "Ads Transparency advertiser URL",
    linkedInPlaceholder: "Ad Library advertiser URL",
    tiktokPlaceholder: "@handle or profile name",
    snapchatPlaceholder: "@username or profile name",
    pinterestPlaceholder: "@username or profile name",
  },
  actions: {
    getStarted: "Get started →",
    startScraping: "Start scraping →",
    settingUp: "Setting up…",
    startingScrape: "Starting scrape…",
  },
  errors: {
    enterWebsite: "Enter your company website.",
    invalidWebsite: "That doesn't look like a valid website. Use something like acme.com or yourwebsite.com.",
    invalidWebsiteGoBack: "That doesn't look like a valid website. Go back and fix your company URL.",
    brandPreviewFailed: "Could not load brand preview.",
    networkBrandScan: "Network error while scanning your website. Try again or continue manually.",
    pickPlatform: "Pick at least one platform where your brand runs ads.",
    pickRegions: "Pick Global, use Auto, or select at least one region for your own ads.",
    googleTransparencyRequired:
      "Add a Google Ads Transparency URL that includes …/advertiser/AR… in the path.",
    somethingWrong: "Something went wrong. Try again.",
    finishFailed: "Something went wrong while finishing onboarding. Try again.",
    saveBrandFailed: "Could not save workspace brand.",
    saveCompetitorsFailed: "Could not save account competitors.",
    serverUnreachable: "Could not reach the server to save monitored brands.",
  },
  validation: {
    metaAdLibrary:
      "Please enter the Ad Library URL, not the Facebook page. Find it at facebook.com/ads/library",
    googleTransparency:
      "That link doesn't include a Transparency advertiser ID (…/advertiser/AR…). Open Google Ads Transparency Center, search for the brand, then open any creative or ad — copy the URL from that page's address bar and paste it here. Don't use only a shop domain or a ?domain= search results page.",
    linkedInKeyword: "This looks like a keyword search — results may include other companies",
  },
};

const planPickerMeta: Omit<OnboardingCopy["planPicker"], "plans"> = {
  allSet: "You're all set",
  choosePlanTitle: "Choose your plan",
  intro: "Both plans include a 7-day free trial — full product, card required, cancel anytime.",
  trialBadge: "7-day free trial",
  billingAria: "Billing period",
  monthly: "Monthly",
  annual: "Annual",
  savePercentBadge: "Save {percent}%",
  perMonth: "/mo",
  saveVsMonthly: "Save {percent}% vs paying monthly",
  startFreeTrial: "Start free trial",
  popular: "Popular",
  includes: "Includes",
  billedMonthly: "Billed monthly",
  billedAnnually: "Billed annually (£{yearlyUsd}/year)",
  switchAccount: "Sign in with a different account",
  tester: {
    title: "You're invited to Rival Pro",
    body: "Your complimentary Pro access is included — no payment required. We're activating your account now.",
    badge: "Invited",
    complimentary: "Complimentary Pro",
    activate: "Activating Pro…",
    activating: "Activating…",
    listPricePerMonth: "£{amount}/mo",
    freePerMonth: "/mo — 100% discount applied",
    claimError: "Could not activate tester access.",
    networkError: "Network error — try again.",
  },
};

export const onboardingCopyEn: OnboardingCopy = {
  localeSwitcherAria: "Choose language",
  form,
  planPicker: {
    ...planPickerMeta,
    plans: onboardingBillingPlansEn,
  },
};
