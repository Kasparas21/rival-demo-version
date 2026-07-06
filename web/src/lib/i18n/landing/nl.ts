import { landingCopyEn } from "@/lib/i18n/landing/en";
import type { LandingCopy } from "@/lib/i18n/landing/types";

export const landingCopyNl: LandingCopy = {
  ...landingCopyEn,
  locale: "nl",
  meta: {
    title: "Spy Rival - Concurrenten bespioneren op autopilot | #1 adspy-tool",
    description:
      "Rival draait je concurrentiespionage op autopilot - de enige tool die paid ads, organische marketing en e-mailmarketing 24/7 volgt, met MCP-toegang vanuit Claude & ChatGPT.",
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
      line1Prefix: "concurrenten bespioneren ",
      highlight: "op autopilot",
      line2: "",
      subline:
        "Volg concurrenten op ads, organic en e-mail in één platform - met ad-bibliotheken, strategy maps en alerts bij wijzigingen.",
      sublineMobile:
        "Concurrent ads, organic en e-mail - ad-bibliotheken, strategy maps en alerts in één platform.",
    },
    trialCta: "GRATIS PROBEREN",
    platformTrialAria: "Start proef met {platform}",
    marketersPillAria: "Gebouwd voor performance marketeers",
    marketersPill: "Gebouwd voor performance marketeers",
    brandMarqueeAria: "Vertrouwd door performance marketeers",
    brandMarqueeLabel: "Vertrouwd door performance marketeers",
    coverage: {
      chips: [
        { key: "paid", label: "Paid ads" },
        { key: "organic", label: "Organic" },
        { key: "email", label: "E-mail" },
        { key: "autopilot", label: "Autopilot" },
        {
          key: "mcp",
          label: "MCP",
          href: "/docs/mcp",
          linkAriaLabel: "Leer hoe je Rival via MCP koppelt aan Claude en ChatGPT",
        },
      ],
    },
  },
  howItWorks: {
    titleLine1: "van domein naar",
    titleHighlight: "autopilot",
    timeBadge: "live in minder dan 5 minuten",
    steps: [
      {
        title: "Plak een concurrent-domein",
        body: "URL plakken. Geen ad-library-tabs, geen spreadsheets, geen setup-call.",
      },
      {
        title: "Rival scant elk kanaal",
        body: "Betaalde ads, organische posts en e-mails komen automatisch binnen over zes platformen.",
      },
      {
        title: "Autopilot kijkt 24/7",
        body: "Slack- en e-mailalerts wanneer concurrenten ads, posts of promo's lanceren.",
      },
    ],
    cta: "GRATIS PROBEREN",
  },
  autopilot: {
    titleLine1: "je nieuwe",
    titleHighlight: "24/7 spionage-medewerker",
    subtitle:
      "Eén keer aanzetten. Autopilot houdt elke concurrent dag en nacht in de gaten - ads, organische posts en inboxen - en pingt je in Slack en per e-mail.",
    stats: [
      { value: "24/7", label: "Altijd op wacht", sub: "elke concurrent, elk kanaal" },
      { value: "~1u", label: "Vangt nieuwe launches", sub: "meteen, niet weken later" },
      { value: "Slack", label: "Directe alerts", sub: "e-mail digests ook" },
    ],
    feed: {
      title: "Nachtdienst-rapport",
      liveLabel: "LIVE",
      items: [
        {
          time: "02:14",
          tag: "ad",
          tagLabel: "AD",
          text: "SmileCo lanceerde 4 nieuwe Meta-ads - nieuwe kortingsangle gedetecteerd",
        },
        {
          time: "03:47",
          tag: "email",
          tagLabel: "E-MAIL",
          text: "Winback-flow vastgelegd: 20%-aanbieding, 3-mail-reeks",
        },
        {
          time: "05:22",
          tag: "organic",
          tagLabel: "ORGANISCH",
          text: "Nieuw TikTok-hookformat - 3e repost deze week",
        },
        {
          time: "06:38",
          tag: "page",
          tagLabel: "PAGINA",
          text: "Landingspagina gewijzigd - nieuwe prijstabel gearchiveerd",
        },
        {
          time: "07:00",
          tag: "report",
          tagLabel: "RAPPORT",
          text: "Autopilot-alert naar Slack - nieuwe Meta-launch gedetecteerd",
        },
      ],
      footer: "…allemaal terwijl jij sliep",
      brief: {
        title: "Je Autopilot nacht-digest",
        highlights: [
          "SmileCo lanceerde 4 Meta-ads met nieuwe 0%-financieringsangle",
          "BrightDental startte een 4-mail winback-flow met 20% aanbieding",
          "NovaSmile repostte een bewezen TikTok-hook voor de derde keer",
        ],
        cta: "Open Autopilot in Rival",
      },
    },
    cta: "ZET JE SPIONAGE OP AUTOPILOT",
  },
  coverage: {
    titleLine1: "bespioneer hun",
    titleHighlight: "volledige marketing",
    subtitle:
      "Elk kanaal dat ze gebruiken - plus de intelligencelaag die laat zien wat werkt, wat ze testen en wat ze hebben gestopt.",
    groups: [
      {
        label: "Elk kanaal dat ze gebruiken",
        cards: [
          {
            key: "paid",
            title: "Paid ads",
            tagline: "Elke actieve ad, 6 platformen.",
          },
          {
            key: "organic",
            title: "Organisch",
            tagline: "Hun posts, hooks & formats.",
          },
          {
            key: "email",
            title: "E-mailmarketing",
            tagline: "Elke promo, flow & reeks.",
          },
        ],
      },
      {
        label: "Plus de analyselaag",
        cards: [
          {
            key: "strategy-map",
            title: "Strategy Map",
            tagline: "Platform x funnel - hun hele playbook.",
          },
          {
            key: "landing-tests",
            title: "Landingpagina-tests",
            tagline: "A/B-varianten en welke pagina wint.",
          },
          {
            key: "winners",
            title: "Winners & losers",
            tagline: "Bewezen ads vs. snel gestopte creatives.",
          },
        ],
      },
    ],
    cta: "Ontdek alle features",
  },
  mcp: {
    titleLine1: "chat met je",
    titleHighlight: "spionagedata",
    subtitle:
      "Rival koppelt direct aan Claude en ChatGPT via MCP. Stel vragen over je concurrenten in gewone taal - je AI antwoordt met live data uit je Rival-workspace.",
    chat: {
      connectedLabel: "Claude - gekoppeld aan Rival",
      userMsg: "Wat hebben mijn concurrenten deze week gelanceerd?",
      replyIntro: "3 opvallende Autopilot-alerts van je gevolgde concurrenten:",
      replyBullets: [
        "SmileCo lanceerde 6 Meta-ads met een nieuwe '0% financiering'-angle",
        "BrightDental startte een 4-mail winback-flow met 20% korting",
        "NovaSmile maakte van z'n beste TikTok-hook een paid ad - bewezen winner",
      ],
      replyOutro: "Zal ik tegen-angles opstellen voor die financieringspush?",
      inputPlaceholder: "Vraag alles over je concurrenten…",
    },
    worksWith: "Werkt met",
    clients: ["Claude", "ChatGPT", "Cursor", "Claude Code"],
    cta: "IN 2 MINUTEN INGESTELD",
  },
  features: {
    titleLine1: "van concurrent-ads naar jouw",
    titleHighlight: "wekelijkse actieplan in 30 seconden",
    subtitle:
      "Betaalde ads, organic, e-mail, Autopilot-alerts en MCP - één login vervangt zes tools.",
    capabilitiesLabel: "De volledige stack in één plan",
    capabilities: [
      { key: "paid", label: "Betaalde ads" },
      { key: "organic", label: "Organic" },
      { key: "email", label: "E-mail" },
      { key: "autopilot", label: "Autopilot" },
      { key: "mcp", label: "MCP-chat" },
    ],
    cards: [
      {
        imageAlt:
          "Ad Library-dashboard met ads van meerdere platformen en selectie voor Meta, Google, TikTok, LinkedIn, Pinterest en Snapchat.",
        title: "Elk platform waar ze adverteren - in één view.",
        body: "Zes ad-platformen. Eén domein. Geen tab-chaos meer.",
      },
      {
        imageAlt: "Strategy Map met platform-funnelraster en AI-strategie-samenvatting.",
        title: "Zie hun hele strategie op één kaart.",
        body: "Platform-funnel plus organic, e-mail en landingpage-archief.",
      },
      {
        imageAlt: "Autopilot Slack-kanaal met nachtelijke concurrent-alerts voor ads, e-mail en organic.",
        title: "Autopilot kijkt terwijl jij slaapt.",
        body: "Slack- en e-mailalerts zodra concurrenten lanceren, pivoteren of promoten.",
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
    payTodayAmount: "$350",
    payTodaySub: "/mnd · ~4 uur lijmwerk / week",
    payTodayBullets: [],
    payTodayFooter: "$270+/mnd meer dan Rival",
    payTodayFooterSub: "6 logins · geen strategy map",
    bottomBadge: "6 tools · nul opbrengst",
    withTitle: "Met Rival",
    platformsLabel: "Alle 6 platformen",
    platformsLabelMobile: "6 platformen",
    capabilitiesLabel: "Plus de intelligence-laag",
    capabilities: [
      { key: "organic", label: "Organic" },
      { key: "email", label: "E-mail" },
      { key: "autopilot", label: "Autopilot" },
      { key: "mcp", label: "MCP-chat" },
    ],
    onePlanLabel: "Eén plan · volledige stack",
    zeroGlue: "Geen lijmwerk · één login",
    saveLabel: "Bespaar $270+/maand vs. 6-tool stack",
    saveSub: "7-daagse proef · 1 concurrent · altijd opzegbaar",
    saveSubMobile: "Bespaar $270+/maand · 7-daagse proef",
    trialCta: "GRATIS PROBEREN",
  },
  reviews: {
    title: "Vertrouwd door wie snel schakelt.",
    subtitle: "Performance marketeers die schalen met Rival",
    photoAlt: "Foto van {name}",
    featureImageAlt: "Foto uit de review van {name}",
    socialProof: {
      count: "400+",
      label: "marketeers houden van Rival",
      viewMore: "Meer bekijken",
    },
    items: landingCopyEn.reviews.items.map((item, i) => {
      const nlTexts = [
        "Vier tools vervangen door één. Autopilot-alerts geven klanten bewijs, geen vage tips.",
        "Stealable Angles toont gaten die we niet testen. Win-rate op nieuwe creative is omhoog.",
        "15 concurrenten, zes klanten, één login. Strategy Map direct in decks.",
        "Na proef met één concurrent dezelfde dag geabonneerd. Moves gevonden die ik weken miste.",
      ];
      return { ...item, text: nlTexts[i] ?? item.text };
    }),
  },
  pricing: {
    titleLine1: "kies je",
    titleHighlight: "plan",
    riskFreeBadge: "Risicovrij",
    guaranteeTitle: "7 dagen gratis proberen, daarna 30 dagen geld terug",
    guaranteeBody:
      "Start met een volledige proef van 7 dagen (kaart vereist). Als Rival in je eerste 30 dagen niets waardevols toont, mail ons voor volledige terugbetaling - geen vragen.",
    billingAria: "Factureringsperiode",
    monthly: "Maandelijks",
    yearly: "Jaarlijks",
    planIncludes: "Plan bevat:",
    footnote: "gratis proberen · altijd opzegbaar",
    trialCta: "GRATIS PROBEREN",
    popularBadge: "Meest populair",
    popularClaim: "400+ kopers vertrouwen ons",
    perMonth: "/maand",
    perCompetitor: "{price} / concurrent",
    billedMonthly: "Maandelijks gefactureerd",
    billedAnnually: "Jaarlijks gefactureerd (${yearlyUsd}/jaar)",
    plans: [
      {
        slug: "starter",
        name: "Starter",
        summary: "Voor solo media buyers met hun belangrijkste marktrivalen.",
        monthlyUsd: 40,
        annualMonthlyUsd: 32,
        annualYearlyUsd: 384,
        metricHighlight: { count: "5", label: "concurrenten" },
        features: [
          "Betaalde, organic & e-mail intelligence",
          "Autopilot-alerts naar Slack + e-mail",
          "MCP-toegang vanuit Claude & ChatGPT",
          "6 ad-platformen · één dashboard",
          "Strategy Map + Autopilot 24/7",
          "1 workspace · tot 15 wissels/maand",
        ],
      },
      {
        slug: "pro",
        name: "Pro",
        summary: "Voor teams die meer concurrenten, exports en on-demand refresh nodig hebben.",
        monthlyUsd: 60,
        originalMonthlyUsd: 75,
        annualMonthlyUsd: 48,
        annualYearlyUsd: 576,
        metricHighlight: { count: "15", label: "concurrenten" },
        plusLabel: "Alles in Starter, plus",
        popular: true,
        features: [
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
        metricHighlight: { count: "75", label: "concurrent-slots" },
        plusLabel: "Alles in Pro, plus",
        features: [
          "Tot 5 merk-workspaces - aparte concurrentenlijst per klant",
          "Alle Pro-features per merk",
          "CSV-export · handmatige refresh · alertregels",
          "Dedicated onboarding voor je team",
          "Priority support + white-label klantrapporten",
        ],
      },
    ],
  },
  faq: {
    titleLine1: "veelgestelde",
    titleHighlight: "vragen",
    items: [
      {
        q: "Hoe werkt de gratis proef?",
        a: "Meld je aan met je kaart en krijg 7 dagen volledige Rival-toegang met 1 concurrent over alle 6 platformen. Annuleer binnen 7 dagen - geen kosten. Daarna vanaf $40/maand (Starter) of $384/jaar (20% korting) bij jaarlijkse facturering. Opzeggen met één klik, geen retentiegesprekken.",
      },
      {
        q: "Hoe verschilt Rival van Foreplay of AdSpy?",
        a: "Foreplay en AdSpy zijn ad libraries - ze tonen wat een concurrent draait. Rival is een intelligence-platform - toont ads en waarschuwt wanneer het ertoe doet. (1) Alle 6 platformen out of the box. (2) Stealable Angles vergelijkt concurrent-angles met jouw library. (3) Autopilot kijkt 24/7 en stuurt Slack- en e-mailalerts bij launches, pivots en promo's.",
      },
      {
        q: "Is dit legaal?",
        a: "Ja. Rival gebruikt alleen publieke ad transparency libraries van Meta, Google, TikTok, LinkedIn, Pinterest en Snapchat. Geen privédata, geen accounttoegang.",
      },
      {
        q: "Hoe vaak worden data bijgewerkt?",
        a: "Elke concurrent wordt automatisch ververst - Meta en Google elke paar dagen, andere iets langzamer. Pro-gebruikers kunnen handmatig refreshen. De meesten openen Rival maandag voor de weekwijzigingen.",
      },
      {
        q: "Kan ik ook mijn eigen merk volgen?",
        a: "Ja, aanbevolen. Eigen merk ontgrendelt side-by-side stats, vergelijkingen en Stealable Angles - gaten die je moet testen.",
      },
      {
        q: "Welke platformen ondersteunt Rival?",
        a: "Meta (Facebook & Instagram), Google (Search, Display, YouTube), TikTok, LinkedIn, Pinterest en Snapchat. Alle zes in elk plan - geen platformtoeslagen.",
      },
      {
        q: "Hoe nauwkeurig zijn de data?",
        a: "Ad-detectie is zeer betrouwbaar omdat we direct uit officiële transparency libraries lezen. Strategische analyse is AI-gegenereerd en wordt scherper met meer data. Elke claim is gekoppeld aan de onderliggende ads.",
      },
      {
        q: "Kan ik altijd opzeggen?",
        a: "Ja. Eén klik in accountinstellingen - geen retentiegesprekken. Bij opzegging midden in de cyclus behoud je toegang tot period/einde.",
      },
    ],
  },
  comparison: {
    titleLine1: "hoe wij scoren",
    titleHighlight: "t.o.v. andere tools",
    subtitle: "Rival vs. Panoramata, AdSpyder, PowerAdSpy en AdLibrary.com - in één oogopslag.",
    featureColumn: "Feature",
    yesAria: "Ja",
    noAria: "Nee",
    cta: "GRATIS PROBEREN",
    ctaFootnote: "Het enige cross-platform concurrent-OS met Autopilot ingebouwd.",
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
    monthlyPrice: "$40/mnd",
    annualPrice: "$32/mnd",
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
      "Concurrentiespionage op autopilot - volgt paid ads, organische marketing en e-mailmarketing op Meta, Google, TikTok, LinkedIn, Pinterest en Snapchat, met MCP-toegang vanuit Claude en ChatGPT.",
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
