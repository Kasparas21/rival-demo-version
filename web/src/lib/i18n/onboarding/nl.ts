import type { OnboardingCopy } from "@/lib/i18n/onboarding/types";
import { onboardingBillingPlansNl } from "@/lib/i18n/onboarding/billing-plans";

const form: OnboardingCopy["form"] = {
  back: "← Terug",
  continue: "Doorgaan →",
  continueToSignup: "Doorgaan naar aanmelden →",
  saving: "Opslaan…",
  loadingFavicon: "Favicon laden",
  adMarketsAria: "Advertentiemarkten",
  noneAddMarkets: "Geen — voeg markten toe",
  globalTerritoryTitle: "Alle ondersteunde territoria opnemen",
  global: "Globaal",
  auto: "Auto",
  change: "Wijzigen",
  done: "Klaar",
  brandLabel: "Merk",
  aboutLabel: "Over",
  openAdsLibraryTitle: "Open {label} Ads Library",
  openAdsLibrarySrOnly: "Open {label} in nieuw tabblad",
  website: {
    title: "Uw bedrijfswebsite",
    placeholder: "uwwebsite.nl",
  },
  brand: {
    loadingTitle: "Uw merk ophalen",
    readyTitle: "Ziet er goed uit",
    emptyState: "Niets geladen — ga terug of ga verder.",
  },
  platforms: {
    title: "Uw advertentieplatforms",
    body: "Vertel ons waar u actief advertenties draait. We scrapen die libraries om de angles, creatives en aanbiedingen van uw bedrijf in kaart te brengen — de basis voor concurrentiestrategie in Rival.",
    comingSoon: "Binnenkort",
  },
  rivals: {
    title: "Uw grootste concurrenten",
    body: "Kies wie u in de gaten wilt houden. Wij volgen hun advertenties voor u.",
    loading: "We zoeken uw concurrenten. Dit duurt ongeveer een minuut.",
    failed: "De zoekopdracht is niet afgerond. Voeg uw concurrenten hieronder toe.",
    empty: "We vonden geen concurrenten waar we zeker van waren. Voeg de uwe hieronder toe.",
    retry: "Opnieuw proberen",
    addLabel: "Concurrent toevoegen",
    addPlaceholder: "concurrent.nl",
    add: "Toevoegen",
    invalidSite: "Voer een website in, bijvoorbeeld concurrent.nl",
    trackOne: "1 concurrent volgen",
    trackMany: "{count} concurrenten volgen",
    skip: "Nu overslaan",
    capReached: "Uw abonnement volgt tot {count} concurrenten.",
  },
  markets: {
    title: "Regio's voor uw advertenties",
    body: "Markten sturen filters in Meta Ads Library, Google Transparency, TikTok Library en meer.",
    pickHint: "Kies Globaal, ga terug naar Auto of selecteer minstens één land.",
  },
  profiles: {
    title: "Uw advertentieprofielen",
    body: "We scrapen elk door u goedgekeurd Ads Library-endpoint om creatives, hooks en funnels van uw bedrijf in kaart te brengen — voor benchmarks en planning in Rival.",
    bodyEmphasis: "Uw domein staat al uit stap één — hier niet opnieuw nodig.",
    metaPlaceholder: "Ads Library-adverteerders-URL",
    googlePlaceholder: "Ads Transparency-adverteerders-URL",
    linkedInPlaceholder: "Ad Library-adverteerders-URL",
    tiktokPlaceholder: "@handle of profielnaam",
    snapchatPlaceholder: "@gebruikersnaam of profielnaam",
    pinterestPlaceholder: "@gebruikersnaam of profielnaam",
  },
  actions: {
    getStarted: "Aan de slag →",
    startScraping: "Scraping starten →",
    settingUp: "Instellen…",
    startingScrape: "Scraping starten…",
  },
  errors: {
    enterWebsite: "Voer uw bedrijfswebsite in.",
    invalidWebsite:
      "Dit lijkt geen geldige website. Gebruik bijvoorbeeld acme.com of uwwebsite.nl.",
    invalidWebsiteGoBack:
      "Dit lijkt geen geldige website. Ga terug en corrigeer uw bedrijfs-URL.",
    brandPreviewFailed: "Merkvoorbeeld kon niet worden geladen.",
    networkBrandScan:
      "Netwerkfout bij het scannen van uw website. Probeer opnieuw of ga handmatig verder.",
    pickPlatform: "Kies minstens één platform waar uw merk advertenties draait.",
    pickRegions: "Kies Globaal, Auto of minstens één regio voor uw eigen advertenties.",
    googleTransparencyRequired:
      "Voeg een Google Ads Transparency-URL toe met …/advertiser/AR… in het pad.",
    somethingWrong: "Er ging iets mis. Probeer opnieuw.",
    finishFailed: "Er ging iets mis bij het afronden van onboarding. Probeer opnieuw.",
    saveBrandFailed: "Workspace-merk kon niet worden opgeslagen.",
    saveCompetitorsFailed: "Gevolgde merken konden niet worden opgeslagen.",
    serverUnreachable: "Server om merken op te slaan niet bereikbaar.",
  },
  validation: {
    metaAdLibrary:
      "Voer de Ads Library-URL in, niet de Facebook-pagina. Te vinden op facebook.com/ads/library",
    googleTransparency:
      "Deze link bevat geen Transparency-adverteerders-ID (…/advertiser/AR…). Open Google Ads Transparency Center, zoek het merk, open een creative of advertentie en kopieer de URL uit de adresbalk. Geen alleen shopdomein of ?domain=-zoekpagina.",
    linkedInKeyword:
      "Dit lijkt op een zoekopdracht op trefwoord — resultaten kunnen andere bedrijven bevatten",
    metaKeywordSearch:
      "Dit is een zoekopdracht op trefwoord, niet de pagina van het merk — alleen advertenties van een pagina met de merknaam worden bewaard. Open voor het beste resultaat de pagina van het merk in de Ads Library en kopieer die link (met view_all_page_id).",
  },
};

const planPickerMeta: Omit<OnboardingCopy["planPicker"], "plans"> = {
  allSet: "U bent klaar",
  choosePlanTitle: "Kies uw plan",
  intro: "Kies het plan dat bij uw team past. Volledige toegang zodra de checkout is afgerond — altijd opzegbaar.",
  trialBadge: "Altijd opzegbaar",
  billingAria: "Factureringsperiode",
  monthly: "Maandelijks",
  annual: "Jaarlijks",
  savePercentBadge: "Bespaar {percent}%",
  perMonth: "/mnd",
  saveVsMonthly: "Bespaar {percent}% t.o.v. maandelijks",
  startFreeTrial: "Verder naar checkout",
  popular: "Populair",
  includes: "Inclusief",
  billedMonthly: "Maandelijks gefactureerd",
  billedAnnually: "Jaarlijks gefactureerd (£{yearlyUsd}/jaar)",
  switchAccount: "Inloggen met een ander account",
  tester: {
    title: "Uw tester-toegang",
    body: "Pro is inbegrepen voor uw testgroep — 100% korting al toegepast. Geen betaling nodig.",
    badge: "Tester",
    complimentary: "Gratis tester Pro",
    activate: "Activeren zonder betaling (geen kaart)",
    activating: "Activeren…",
    listPricePerMonth: "£{amount}/mnd",
    freePerMonth: "/mnd — 100% korting toegepast",
    claimError: "Tester-toegang kon niet worden geactiveerd.",
    networkError: "Netwerkfout — probeer opnieuw.",
  },
};

export const onboardingCopyNl: OnboardingCopy = {
  localeSwitcherAria: "Taal kiezen",
  form,
  planPicker: {
    ...planPickerMeta,
    plans: onboardingBillingPlansNl,
  },
};
