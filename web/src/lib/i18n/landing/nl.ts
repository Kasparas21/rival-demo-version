import { landingCopyEn } from "@/lib/i18n/landing/en";
import type { LandingCopy } from "@/lib/i18n/landing/types";

export const landingCopyNl: LandingCopy = {
  ...landingCopyEn,
  locale: "nl",
  meta: {
    title: "Spy Rival - #1 gratis adspy-tool",
    description:
      "Spy Rival is het #1 gratis adspy-tool voor concurrent-ads — Meta, Google, YouTube, TikTok, LinkedIn, Pinterest en Snapchat in één dashboard.",
  },
  consent: {
    title: "Cookies & analytics",
    descriptionMobile: "Analytics- en marketingcookies voor site- en advertentiemeting.",
    descriptionDesktop:
      "We gebruiken analytics- en marketingcookies (inclusief Meta Pixel) om sitegebruik en advertentieprestaties te meten. U kunt niet-essentiële cookies accepteren of weigeren.",
    policyShort: "Beleid",
    cookiePolicy: "Cookiebeleid",
    reject: "Weigeren",
    accept: "Accepteren",
  },
  header: {
    navItems: [
      { label: "Hoe het werkt", sectionId: "solution" },
      { label: "Prijzen", sectionId: "pricing" },
      { label: "Vergelijk", sectionId: "compare" },
      { label: "FAQ", sectionId: "faq" },
    ],
    startTrial: "GRATIS PROBEREN",
    homeAria: "Rival home",
    primaryNavAria: "Hoofdnavigatie",
    localeSwitcherAria: "Taal kiezen",
  },
  hero: {
    headline: {
      line1Prefix: "#1 gratis ",
      highlight: "adspy-tool",
      line2: "",
      subline:
        "Spy Rival is het beste adspy-tool om elke concurrent-ad te volgen op Meta, Google, TikTok, LinkedIn, Pinterest en Snapchat — alles in één dashboard.",
    },
    trialCta: "GRATIS PROBEREN",
    platformTrialAria: "Start proef met {platform}",
    marketersPillAria: "Gebouwd voor performance marketeers",
    marketersPill: "Gebouwd voor performance marketeers",
    brandMarqueeAria: "Vertrouwd door performance marketeers",
    brandMarqueeLabel: "Vertrouwd door performance marketeers",
  },
  features: {
    titleLine1: "van concurrent-ads naar jouw",
    titleHighlight: "wekelijkse actieplan in 30 seconden",
    subtitle:
      "Rival haalt elke actieve ad van concurrenten over 6 platformen, decodeert hun funnel en geeft de drie moves voor deze week. Eén tool vervangt zes tabbladen.",
    cards: [
      {
        imageAlt:
          "Ad Library-dashboard met ads van meerdere platformen en selectie voor Meta, Google, TikTok, LinkedIn, Pinterest en Snapchat.",
        title: "Elk platform waar ze adverteren — in één view.",
        body: "Voeg een concurrent toe op domein — Rival haalt elke actieve ad over Meta, Google, TikTok, LinkedIn, Pinterest en Snapchat. Foreplay toont Meta. AdSpy stopt bij Google. Rival toont alle zes — geen zes tabbladen en vier abonnementen meer.",
      },
      {
        imageAlt: "Strategy Map met platform-funnelraster en AI-strategie-samenvatting.",
        title: "Zie hun hele strategie op één kaart.",
        body: "Rival legt activiteit per concurrent op een platform-funnelkaart — waar ze vol inzetten, testen of afbouwen — met een AI-samenvatting in één alinea. Het verschil tussen een stapel ads en een plan dat je ziet.",
      },
      {
        imageAlt: "Three Moves-dashboard met wekelijkse tactische prioriteiten uit scrape-data.",
        title: "Drie tactische moves elke week.",
        body: "Geen 47-pagina concurrentrapporten meer. Rival leest wekelijks de strategie en levert precies drie moves — kopieer deze angle, verschuif budget, vernieuw creative — elk met echte scrape-cijfers, geen generiek advies.",
      },
    ],
    cta: "Ontdek alle features",
  },
  stackReplacement: {
    ...landingCopyEn.stackReplacement,
    titlePrefix: "zes tools, of ",
    titleHighlight: "één",
    titleSuffix: "",
    withoutTitle: "Zonder Rival",
    withoutBadge: "De oude manier",
    withoutIntro: "Zes losse tools. Geen gedeeld overzicht.",
    withoutIntroMobile: "Zes tools. Geen gedeeld overzicht.",
    withoutStatTools: "tools",
    withoutStatLogins: "logins",
    withoutStatGlue: "lijm/wk",
    toolsSummary: "{count} tools · {count} logins · nul intelligence",
    toolsSummaryMobile: "{count} tools · {count} logins",
    manualLabel: "Het wekelijkse gedoe",
    manualLabelMobile: "Wekelijks gedoe",
    painPoints: ["Spreadsheet-lijm", "Tabblad-wisselen", "Maandag giswerk"],
    painPointsMobile: ["Spreadsheets", "Tab-chaos", "Giswerk"],
    payTodayLabel: "Stack-kosten vandaag",
    payTodayAmount: "£350",
    payTodaySub: "/mnd · ~4 uur lijmwerk / week",
    payTodayBullets: [],
    payTodayFooter: "£270+/mnd meer dan Rival",
    payTodayFooterSub: "6 logins · geen strategy map",
    bottomBadge: "6 tools · nul opbrengst",
    withTitle: "Met Rival",
    platformsLabel: "Alle 6 platformen inbegrepen",
    platformsLabelMobile: "Alle 6 platformen",
    features: [
      "Concurrent op domein — alle 6 platformen",
      "Auto-refresh + ingebouwde timelines",
      "Funnel- + landingpage-archief",
      "AI-angles + wekelijkse Three Moves-mail",
      "Denk in rivalen, niet netwerken",
      "Stealable Angles vs. eigen ad library",
      "Maandag Activity Feed + digest-mail",
      "Eén login — geen platformtoeslagen",
    ],
    featuresMobile: [
      "Concurrent op domein — alle 6 platformen",
      "Auto-refresh + timelines",
      "Funnel- + landingpage-archief",
      "AI-angles + wekelijkse Three Moves",
      "Eén login — geen platformkosten",
    ],
    onePlanLabel: "Eén plan · alle 6 platformen",
    zeroGlue: "Geen lijmwerk · één login",
    saveLabel: "Bespaar £270+/maand vs. 6-tool stack",
    saveSub: "7-daagse proef · 1 concurrent · altijd opzegbaar",
    saveSubMobile: "Bespaar £270+/maand · 7-daagse proef",
    trialCta: "GRATIS PROBEREN",
  },
  reviews: {
    titleLine1: "de voorkeurstool",
    titleHighlight: "van performance marketeers",
    starsAria: "{count} van 5 sterren",
    photoAlt: "Foto van {name}",
    items: landingCopyEn.reviews.items.map((item, i) => {
      const nlTexts = [
        "Vier tools vervangen door één. Three Moves geeft klanten bewijs, geen vage tips.",
        "Alle zes platformen op één plek. Activity Feed vangt moves die Foreplay en AdSpy misten.",
        "Stealable Angles toont gaten die we niet testen. Win-rate op nieuwe creative is omhoog.",
        "Na proef met één concurrent dezelfde dag geabonneerd. Moves gevonden die ik weken miste.",
        "15 concurrenten, zes klanten, één login. Strategy Map direct in decks.",
        "Maandag-koffieroutine kapot. Three Moves om 7 uur — ik moet echt werken. (Campagnes presteren beter.)",
      ];
      return { ...item, text: nlTexts[i] ?? item.text };
    }),
  },
  pricing: {
    title: "kies je plan",
    riskFreeBadge: "Risicovrij",
    guaranteeTitle: "30 dagen geld-terug-garantie",
    guaranteeBody:
      "Volg je concurrenten. Als Rival binnen 30 dagen niets waardevols toont, mail ons voor volledige terugbetaling. Geen vragen.",
    billingAria: "Factureringsperiode",
    monthly: "Maandelijks",
    yearly: "Jaarlijks",
    planIncludes: "Plan bevat:",
    footnote: "Alle plannen met 7-daagse proef · 1 concurrent · kaart vereist · altijd opzegbaar",
    trialCta: "GRATIS PROBEREN",
    popular: "Populair",
    perMonth: "/maand",
    billedMonthly: "Maandelijks gefactureerd",
    billedAnnually: "Jaarlijks gefactureerd (£{yearlyUsd}/jaar)",
    plans: [
      {
        slug: "starter",
        name: "Starter",
        summary: "Voor solo media buyers met hun belangrijkste marktrivalen.",
        monthlyUsd: 40,
        annualMonthlyUsd: 32,
        annualYearlyUsd: 384,
        features: [
          "5 concurrenten",
          "Alle 6 platformen — Meta, Google, TikTok, LinkedIn, Pinterest, Snapchat",
          "Automatische refresh — geen handwerk",
          "Volledige intelligence-suite",
          "Strategy Map · Activity Score · Copy Vault · Timeline · Landing Pages · Vergelijk",
          "Wekelijks Three Moves AI-rapport",
          "Maandag digest-mail",
          "1 merk-workspace · tot 15 wissels/maand",
        ],
      },
      {
        slug: "pro",
        name: "Pro",
        summary: "Voor teams die meer concurrenten, exports en on-demand refresh nodig hebben.",
        monthlyUsd: 60,
        annualMonthlyUsd: 48,
        annualYearlyUsd: 576,
        plusLabel: "Alles in Starter, plus",
        popular: true,
        features: [
          "15 concurrenten",
          "1 merk-workspace · tot 50 wissels/maand",
          "Priority refresh",
          "CSV-export",
          "Handmatige refresh op aanvraag",
          "Historische snapshots",
          "Emerging Angle Alerts",
        ],
      },
      {
        slug: "agency",
        name: "Agency",
        summary: "Voor bureaus die meerdere klantmerken in één account beheren.",
        monthlyUsd: 100,
        annualMonthlyUsd: 80,
        annualYearlyUsd: 960,
        plusLabel: "Alles in Pro, plus",
        features: [
          "Tot 5 merk-workspaces — aparte concurrentenlijst per klant",
          "75 concurrent-slots (gedeeld over alle merken)",
          "Alle Pro-features per merk",
          "CSV-export · handmatige refresh · alertregels",
        ],
      },
    ],
  },
  faq: {
    eyebrow: "nog niet overtuigd?",
    titleLine1: "veelgestelde",
    titleHighlight: "vragen",
    items: [
      {
        q: "Hoe werkt de gratis proef?",
        a: "Meld je aan met je kaart en krijg 7 dagen volledige Rival-toegang met 1 concurrent over alle 6 platformen. Annuleer binnen 7 dagen — geen kosten. Daarna vanaf £40/maand (Starter) of £384/jaar (20% korting) bij jaarlijkse facturering. Opzeggen met één klik, geen retentiegesprekken.",
      },
      {
        q: "Hoe verschilt Rival van Foreplay of AdSpy?",
        a: "Foreplay en AdSpy zijn ad libraries — ze tonen wat een concurrent draait. Rival is een intelligence-platform — toont ads én wat je ermee moet. (1) Alle 6 platformen out of the box. (2) Stealable Angles vergelijkt concurrent-angles met jouw library. (3) Three Moves levert wekelijkse aanbevelingen uit echte scrape-data.",
      },
      {
        q: "Is dit legaal?",
        a: "Ja. Rival gebruikt alleen publieke ad transparency libraries van Meta, Google, TikTok, LinkedIn, Pinterest en Snapchat. Geen privédata, geen accounttoegang.",
      },
      {
        q: "Hoe vaak worden data bijgewerkt?",
        a: "Elke concurrent wordt automatisch ververst — Meta en Google elke paar dagen, andere iets langzamer. Pro-gebruikers kunnen handmatig refreshen. De meesten openen Rival maandag voor de weekwijzigingen.",
      },
      {
        q: "Kan ik ook mijn eigen merk volgen?",
        a: "Ja, aanbevolen. Eigen merk ontgrendelt side-by-side stats, vergelijkingen en Stealable Angles — gaten die je moet testen.",
      },
      {
        q: "Welke platformen ondersteunt Rival?",
        a: "Meta (Facebook & Instagram), Google (Search, Display, YouTube), TikTok, LinkedIn, Pinterest en Snapchat. Alle zes in elk plan — geen platformtoeslagen.",
      },
      {
        q: "Hoe nauwkeurig zijn de data?",
        a: "Ad-detectie is zeer betrouwbaar omdat we direct uit officiële transparency libraries lezen. Strategische analyse is AI-gegenereerd en wordt scherper met meer data. Elke claim is gekoppeld aan de onderliggende ads.",
      },
      {
        q: "Kan ik altijd opzeggen?",
        a: "Ja. Eén klik in accountinstellingen — geen retentiegesprekken. Bij opzegging midden in de cyclus behoud je toegang tot period/einde.",
      },
    ],
  },
  comparison: {
    titleLine1: "hoe wij scoren",
    titleHighlight: "t.o.v. andere tools",
    subtitle: "Rival vs. Panoramata, AdSpyder, PowerAdSpy en AdLibrary.com — in één oogopslag.",
    featureColumn: "Feature",
    yesAria: "Ja",
    noAria: "Nee",
    cta: "GRATIS PROBEREN",
    ctaFootnote: "Het enige cross-platform concurrent-OS voor wekelijkse moves.",
    sections: landingCopyEn.comparison.sections.map((section) => ({
      ...section,
      title:
        section.title === "Strategy OS"
          ? "Strategy OS"
          : section.title === "Funnel & timeline intelligence"
            ? "Funnel- & timeline-intelligence"
            : section.title === "Cross-platform competitor view"
              ? "Cross-platform concurrentview"
              : "Bureau-workflow",
      rows: section.rows.map((row) => ({
        ...row,
        feature: translateComparisonFeatureNl(row.feature),
        featureMobile: translateComparisonFeatureMobileNl(row.featureMobile),
      })),
    })),
    competitorColumns: landingCopyEn.comparison.competitorColumns,
  },
  finalCta: {
    titleLine1: "zie wat je",
    titleHighlight: "concurrenten draaien",
    subtitle: "7 dagen gratis proberen.",
    monthlyPrice: "£40/mnd",
    annualPrice: "£32/mnd",
    monthlyLabel: "Maandelijks",
    annualLabel: "Jaarlijks",
    annualSaveBadge: "Bespaar 20%",
    billingAria: "Kies factureringsperiode",
    trialCta: "GRATIS PROBEREN",
    cancelNote: "altijd opzegbaar",
  },
  footer: {
    columns: [
      {
        title: "PRODUCT",
        links: [
          { label: "Hoe het werkt", href: "/#how-it-works" },
          { label: "Vergelijk", href: "/#compare" },
          { label: "Prijzen", href: "/#pricing" },
          { label: "FAQ", href: "/#faq" },
          { label: "Proef starten", href: "/onboarding" },
        ],
      },
      {
        title: "BRONNEN",
        links: [
          { label: "Blog", href: "/blog" },
          { label: "Over ons", href: "/about" },
          { label: "Contact", href: "mailto:hello@spy-rival.com" },
        ],
      },
      {
        title: "JURIDISCH",
        links: [
          { label: "Privacybeleid", href: "/privacy" },
          { label: "Servicevoorwaarden", href: "/terms" },
          { label: "Cookiebeleid", href: "/cookies" },
        ],
      },
    ],
    copyright: "© 2026 Spy-Rival",
  },
  jsonLd: {
    appDescription:
      "#1 gratis adspy-tool voor concurrent-ads op Meta, Google, TikTok, LinkedIn, Pinterest en Snapchat.",
    starterName: "Starter",
    proName: "Pro",
    agencyName: "Agency",
  },
};

function translateComparisonFeatureNl(feature: string): string {
  const map: Record<string, string> = {
    "Tracks a fixed list of named competitors as the core workflow":
      "Vaste lijst van concurrenten als kern-workflow",
    "Weekly email summaries focused on tracked competitors' changes":
      "Wekelijkse e-mails over wijzigingen bij gevolgde concurrenten",
    "Generates recurring, per-competitor test ideas from their latest ads":
      "Terugkerende testideeën per concurrent uit nieuwste ads",
    "Tags competitor ads by funnel stage (TOFU / MOFU / BOFU)":
      "Concurrent-ads per funnelfase (TOFU / MOFU / BOFU)",
    "Shows a timeline of each competitor ad's lifespan (launch → killed)":
      "Timeline van advertentie-levensduur (start → beëindigd)",
    "Built-in archive of competitor landing pages, linked from every ad":
      "Archief van concurrent-landingpages, gelinkt vanaf elke ad",
    "Single dashboard showing each competitor's ads across Meta, Google, TikTok, LinkedIn, Pinterest":
      "Eén dashboard: concurrent-ads over Meta, Google, TikTok, LinkedIn, Pinterest",
    "Competitor view is ad-funnel focused, not email / SMS / SEO-first":
      "Concurrentview gericht op ad-funnel, niet e-mail/SMS/SEO",
    "Designed explicitly for media buyers & agencies (not just e-com brands)":
      "Voor media buyers & bureaus (niet alleen e-commerce)",
    "Generates client-ready competitor reports with minimal manual editing":
      "Klantklare concurrentrapporten met minimale bewerking",
  };
  return map[feature] ?? feature;
}

function translateComparisonFeatureMobileNl(featureMobile: string): string {
  const map: Record<string, string> = {
    "Fixed competitor tracking list": "Vaste concurrentenlijst",
    "Weekly competitor change emails": "Wekelijkse wijzigingsmails",
    "Auto test ideas from latest ads": "Auto testideeën uit ads",
    "Funnel stage tags (TOFU/MOFU/BOFU)": "Funnel-tags (TOFU/MOFU/BOFU)",
    "Ad lifespan timeline": "Ad-timeline",
    "Landing page archive per ad": "Landing-archief per ad",
    "All-platform ads in one dashboard": "Alle platformen, één dashboard",
    "Ad-funnel focus (not email/SEO)": "Ad-funnel focus",
    "Built for agencies & media buyers": "Voor bureaus & media buyers",
    "Client-ready reports, minimal editing": "Klantklare rapporten",
  };
  return map[featureMobile] ?? featureMobile;
}
