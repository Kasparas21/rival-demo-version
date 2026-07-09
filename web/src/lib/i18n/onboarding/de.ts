import type { OnboardingCopy } from "@/lib/i18n/onboarding/types";
import { onboardingBillingPlansDe } from "@/lib/i18n/onboarding/billing-plans";

const form: OnboardingCopy["form"] = {
  back: "← Zurück",
  continue: "Weiter →",
  continueToSignup: "Weiter zur Registrierung →",
  saving: "Speichern…",
  loadingFavicon: "Favicon wird geladen",
  adMarketsAria: "Anzeigenmärkte",
  noneAddMarkets: "Keine — Märkte hinzufügen",
  globalTerritoryTitle: "Alle unterstützten Territorien einbeziehen",
  global: "Global",
  auto: "Auto",
  change: "Ändern",
  done: "Fertig",
  brandLabel: "Marke",
  aboutLabel: "Über",
  openAdsLibraryTitle: "{label} Ads Library öffnen",
  openAdsLibrarySrOnly: "{label} in neuem Tab öffnen",
  website: {
    title: "Ihre Unternehmenswebsite",
    placeholder: "ihrewebsite.de",
  },
  brand: {
    loadingTitle: "Marke wird geladen",
    readyTitle: "Sieht gut aus",
    emptyState: "Nichts geladen — zurückgehen oder fortfahren.",
  },
  platforms: {
    title: "Ihre Anzeigenplattformen",
    body: "Sagen Sie uns, wo Sie aktiv Werbung schalten. Wir scrapen diese Libraries, um Angles, Creatives und Angebote Ihres Unternehmens zu erfassen — die Grundlage für Wettbewerbsstrategie in Rival.",
  },
  markets: {
    title: "Regionen für Ihre Anzeigen",
    body: "Märkte steuern Filter in Meta Ads Library, Google Transparency, TikTok Library und mehr.",
    pickHint: "Global wählen, zu Auto zurück oder mindestens ein Land auswählen.",
  },
  profiles: {
    title: "Ihre Anzeigenprofile",
    body: "Wir scrapen jeden von Ihnen freigegebenen Ads-Library-Endpunkt, um Creatives, Hooks und Funnels Ihres Unternehmens zu erfassen — für Benchmarks und Planung in Rival.",
    bodyEmphasis: "Ihre Domain ist aus Schritt eins bereits hinterlegt — hier nicht erneut nötig.",
    metaPlaceholder: "Ads-Library-Advertiser-URL",
    googlePlaceholder: "Ads-Transparency-Advertiser-URL",
    linkedInPlaceholder: "Ad-Library-Advertiser-URL",
    tiktokPlaceholder: "@Handle oder Profilname",
    snapchatPlaceholder: "@Benutzername oder Profilname",
    pinterestPlaceholder: "@Benutzername oder Profilname",
  },
  actions: {
    getStarted: "Loslegen →",
    startScraping: "Scraping starten →",
    settingUp: "Einrichten…",
    startingScrape: "Scraping startet…",
  },
  errors: {
    enterWebsite: "Geben Sie Ihre Unternehmenswebsite ein.",
    invalidWebsite:
      "Das sieht nicht nach einer gültigen Website aus. Nutzen Sie z. B. acme.com oder ihrewebsite.de.",
    invalidWebsiteGoBack:
      "Das sieht nicht nach einer gültigen Website aus. Gehen Sie zurück und korrigieren Sie die URL.",
    brandPreviewFailed: "Markenvorschau konnte nicht geladen werden.",
    networkBrandScan:
      "Netzwerkfehler beim Scannen Ihrer Website. Erneut versuchen oder manuell fortfahren.",
    pickPlatform: "Wählen Sie mindestens eine Plattform, auf der Ihre Marke Anzeigen schaltet.",
    pickRegions: "Wählen Sie Global, Auto oder mindestens eine Region für Ihre eigenen Anzeigen.",
    googleTransparencyRequired:
      "Fügen Sie eine Google-Ads-Transparency-URL mit …/advertiser/AR… im Pfad hinzu.",
    somethingWrong: "Etwas ist schiefgelaufen. Bitte erneut versuchen.",
    finishFailed: "Beim Abschließen des Onboardings ist etwas schiefgelaufen. Bitte erneut versuchen.",
    saveBrandFailed: "Workspace-Marke konnte nicht gespeichert werden.",
    saveCompetitorsFailed: "Überwachte Marken konnten nicht gespeichert werden.",
    serverUnreachable: "Server zum Speichern der Marken nicht erreichbar.",
  },
  validation: {
    metaAdLibrary:
      "Bitte die Ads-Library-URL eingeben, nicht die Facebook-Seite. Unter facebook.com/ads/library finden.",
    googleTransparency:
      "Der Link enthält keine Transparency-Advertiser-ID (…/advertiser/AR…). Öffnen Sie das Google Ads Transparency Center, suchen Sie die Marke, öffnen Sie eine Anzeige und kopieren Sie die URL aus der Adressleiste. Keine reine Shop-Domain oder ?domain=-Suchseite.",
    linkedInKeyword:
      "Das wirkt wie eine Stichwortsuche — Ergebnisse können andere Unternehmen enthalten",
  },
};

const planPickerMeta: Omit<OnboardingCopy["planPicker"], "plans"> = {
  allSet: "Alles erledigt",
  choosePlanTitle: "Plan wählen",
  intro: "Beide Pläne mit 7-Tage-Test — volles Produkt, Karte nötig, jederzeit kündbar.",
  trialBadge: "7-Tage-Test",
  billingAria: "Abrechnungszeitraum",
  monthly: "Monatlich",
  annual: "Jährlich",
  savePercentBadge: "{percent} % sparen",
  perMonth: "/Monat",
  saveVsMonthly: "{percent} % Ersparnis vs. monatlich",
  startFreeTrial: "Gratis-Test starten",
  popular: "Beliebt",
  includes: "Enthält",
  billedMonthly: "Monatlich abgerechnet",
  billedAnnually: "Jährlich abgerechnet (£{yearlyUsd}/Jahr)",
  switchAccount: "Mit einem anderen Konto anmelden",
  tester: {
    title: "Ihr Tester-Zugang",
    body: "Pro ist für Ihre Testgruppe inklusive — 100 % Rabatt bereits angewendet. Keine Zahlung nötig.",
    badge: "Tester",
    complimentary: "Kostenloses Tester-Pro",
    activate: "Ohne Zahlung aktivieren (keine Karte)",
    activating: "Aktivieren…",
    listPricePerMonth: "£{amount}/Monat",
    freePerMonth: "/Monat — 100 % Rabatt angewendet",
    claimError: "Tester-Zugang konnte nicht aktiviert werden.",
    networkError: "Netzwerkfehler — bitte erneut versuchen.",
  },
};

export const onboardingCopyDe: OnboardingCopy = {
  localeSwitcherAria: "Sprache wählen",
  form,
  planPicker: {
    ...planPickerMeta,
    plans: onboardingBillingPlansDe,
  },
};
