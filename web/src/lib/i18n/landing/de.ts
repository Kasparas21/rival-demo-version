import { landingCopyEn } from "@/lib/i18n/landing/en";
import type { LandingCopy } from "@/lib/i18n/landing/types";

export const landingCopyDe: LandingCopy = {
  ...landingCopyEn,
  locale: "de",
  meta: {
    title: "Spy Rival - Wettbewerber-Spionage auf Autopilot | #1 Adspy-Tool",
    description:
      "Rival betreibt Ihre Wettbewerber-Spionage auf Autopilot - das einzige Tool, das Paid Ads, organisches Marketing und E-Mail-Marketing rund um die Uhr verfolgt, mit MCP-Zugriff aus Claude & ChatGPT.",
  },
  header: {
    navItems: [
      { label: "So funktioniert's", sectionId: "solution" },
      { label: "Preise", sectionId: "pricing" },
      { label: "Vergleich", sectionId: "compare" },
      { label: "FAQ", sectionId: "faq" },
    ],
    startTrial: "KOSTENLOS TESTEN",
    homeAria: "Rival Startseite",
    primaryNavAria: "Hauptnavigation",
    localeSwitcherAria: "Sprache wählen",
  },
  hero: {
    headline: {
      line1Prefix: "wettbewerber-spionage ",
      highlight: "auf autopilot",
      line2: "",
      subline:
        "Wettbewerber-Ads, Organic und E-Mail in einer Plattform - mit Ad-Bibliotheken, Strategy Maps und Alerts bei Änderungen.",
      sublineMobile:
        "Wettbewerber-Ads, Organic und E-Mail - Ad-Bibliotheken, Strategy Maps und Alerts in einer Plattform.",
    },
    trialCta: "KOSTENLOS TESTEN",
    platformTrialAria: "Test mit {platform} starten",
    marketersPillAria: "Für Performance-Marketer gebaut",
    marketersPill: "Für Performance-Marketer gebaut",
    brandMarqueeAria: "Vertraut von Performance-Marketern",
    brandMarqueeLabel: "Vertraut von Performance-Marketern",
    coverage: {
      chips: [
        { key: "paid", label: "Paid Ads" },
        { key: "organic", label: "Organic" },
        { key: "email", label: "E-Mail" },
        { key: "autopilot", label: "Autopilot" },
        {
          key: "mcp",
          label: "MCP",
          href: "/docs/mcp",
          linkAriaLabel: "So verbinden Sie Rival über MCP mit Claude und ChatGPT",
        },
      ],
    },
  },
  howItWorks: {
    titleLine1: "von der domain zum",
    titleHighlight: "autopilot",
    titleSuffix: "in 5 minuten",
    steps: [
      {
        title: "Wettbewerber-Domain eintragen",
        body: "URL einfügen. Keine Ad-Library-Tabs, keine Tabellen, kein Setup-Call.",
      },
      {
        title: "Rival scannt jeden Kanal",
        body: "Paid Ads, organische Posts und E-Mails laufen automatisch über sechs Plattformen ein.",
      },
      {
        title: "Autopilot wacht 24/7",
        body: "Slack- und E-Mail-Alerts, wenn Wettbewerber Anzeigen, Posts oder Promos starten.",
      },
    ],
    cta: "KOSTENLOS TESTEN",
  },
  autopilot: {
    titleLine1: "ihr neuer",
    titleHighlight: "24/7 spionage-mitarbeiter",
    subtitle:
      "Einmal einschalten. Autopilot beobachtet jeden Wettbewerber rund um die Uhr - Anzeigen, organische Posts und Postfächer - und pingt Sie in Slack und per E-Mail.",
    stats: [
      { value: "24/7", label: "Immer auf Wache", sub: "jeder Wettbewerber, jeder Kanal" },
      { value: "~1 Std", label: "Fängt neue Launches", sub: "sofort, nicht Wochen später" },
      { value: "Slack", label: "Sofort-Alerts", sub: "E-Mail-Digests inklusive" },
    ],
    feed: {
      title: "Nachtschicht-Report",
      liveLabel: "LIVE",
      items: [
        {
          time: "02:14",
          tag: "ad",
          tagLabel: "AD",
          text: "SmileCo startete 4 neue Meta-Anzeigen - neuer Rabatt-Angle erkannt",
        },
        {
          time: "03:47",
          tag: "email",
          tagLabel: "E-MAIL",
          text: "Winback-Flow erfasst: 20%-Angebot, 3-Mail-Sequenz",
        },
        {
          time: "05:22",
          tag: "organic",
          tagLabel: "ORGANISCH",
          text: "Neues TikTok-Hook-Format - 3. Repost diese Woche",
        },
        {
          time: "06:38",
          tag: "page",
          tagLabel: "SEITE",
          text: "Landing Page geändert - neue Preistabelle archiviert",
        },
        {
          time: "07:00",
          tag: "report",
          tagLabel: "REPORT",
          text: "Autopilot-Alert an Slack - neuer Meta-Launch erkannt",
        },
      ],
      footer: "…alles, während Sie geschlafen haben",
      brief: {
        title: "Ihr Autopilot-Übernacht-Digest",
        highlights: [
          "SmileCo startete 4 Meta-Anzeigen mit neuem 0%-Finanzierungs-Angle",
          "BrightDental startete einen 4-Mail-Winback-Flow mit 20% Angebot",
          "NovaSmile repostete einen bewährten TikTok-Hook zum dritten Mal",
        ],
        cta: "Autopilot in Rival öffnen",
      },
    },
    cta: "SPIONAGE AUF AUTOPILOT STELLEN",
  },
  coverage: {
    titleLine1: "spionieren sie ihr",
    titleHighlight: "gesamtes marketing aus",
    subtitle:
      "Jeder Kanal, den sie nutzen - plus die Intelligence-Schicht, die zeigt, was funktioniert, was getestet wird und was sie beendet haben.",
    groups: [
      {
        label: "Jeder Kanal, den sie nutzen",
        cards: [
          {
            key: "paid",
            title: "Paid Ads",
            tagline: "Jede aktive Anzeige, 6 Plattformen.",
          },
          {
            key: "organic",
            title: "Organisch",
            tagline: "Ihre Posts, Hooks & Formate.",
          },
          {
            key: "email",
            title: "E-Mail-Marketing",
            tagline: "Jede Promo, jeder Flow.",
          },
        ],
      },
      {
        label: "Alle Daten mit Rival-Features verbinden - z. B.",
        cards: [
          {
            key: "strategy-map",
            title: "Strategy Map",
            tagline: "Plattform x Funnel - ihr gesamtes Playbook.",
          },
          {
            key: "landing-tests",
            title: "Landing-Page-Tests",
            tagline: "A/B-Varianten und welche Seite gewinnt.",
          },
          {
            key: "winners",
            title: "Winner & Loser",
            tagline: "Bewährte Ads vs. schnell beendete Creatives.",
          },
        ],
      },
    ],
    cta: "Alle Features entdecken",
  },
  mcp: {
    titleLine1: "chatten sie mit ihren",
    titleHighlight: "spionage-daten",
    subtitle:
      "Rival verbindet sich über MCP direkt mit Claude und ChatGPT. Stellen Sie Fragen zu Ihren Wettbewerbern in normaler Sprache - Ihre KI antwortet mit Live-Daten aus Ihrem Rival-Workspace.",
    chat: {
      connectedLabel: "Claude - mit Rival verbunden",
      userMsg: "Was haben meine Wettbewerber diese Woche gelauncht?",
      replyIntro: "3 relevante Autopilot-Alerts Ihrer verfolgten Wettbewerber:",
      replyBullets: [
        "SmileCo startete 6 Meta-Anzeigen mit neuem „0%-Finanzierung“-Angle",
        "BrightDental begann einen 4-Mail-Winback-Flow mit 20%-Angebot",
        "NovaSmile machte seinen besten TikTok-Hook zur Paid Ad - erwiesener Winner",
      ],
      replyOutro: "Soll ich Gegen-Angles für den Finanzierungs-Push entwerfen?",
      inputPlaceholder: "Fragen Sie alles über Ihre Wettbewerber…",
    },
    worksWith: "Funktioniert mit",
    clients: ["Claude", "ChatGPT", "Cursor", "Claude Code"],
    cta: "IN 2 MINUTEN EINRICHTEN",
  },
  features: {
    titleLine1: "von wettbewerber-anzeigen zu Ihrem",
    titleHighlight: "wöchentlichen aktionsplan in 30 sekunden",
    subtitle:
      "Paid, Organic, E-Mail, Autopilot-Alerts und MCP - ein Login ersetzt sechs Tools.",
    capabilitiesLabel: "Der volle Stack in einem Plan",
    capabilities: [
      { key: "paid", label: "Paid Ads" },
      { key: "organic", label: "Organic" },
      { key: "email", label: "E-Mail" },
      { key: "autopilot", label: "Autopilot" },
      { key: "mcp", label: "MCP-Chat" },
    ],
    cards: [
      {
        imageAlt:
          "Ad-Library-Dashboard mit Anzeigen mehrerer Plattformen und Auswahl für Meta, Google, TikTok, LinkedIn, Pinterest und Snapchat.",
        title: "Jede Plattform, auf der sie werben - in einer Ansicht.",
        body: "Sechs Ad-Plattformen. Eine Domain. Kein Tab-Chaos mehr.",
      },
      {
        imageAlt: "Strategy Map mit Plattform-Funnel-Raster und KI-Strategie-Zusammenfassung.",
        title: "Die ganze Strategie auf einer Karte.",
        body: "Plattform-Funnel plus Organic, E-Mail und Landing-Page-Archiv.",
      },
      {
        imageAlt: "Autopilot-Slack-Kanal mit Übernacht-Alerts zu Anzeigen, E-Mail und organischen Posts.",
        title: "Autopilot wacht, während Sie schlafen.",
        body: "Slack- und E-Mail-Alerts, sobald Wettbewerber launchen, pivotieren oder promoten.",
      },
    ],
    cta: "Alle Features entdecken",
  },
  stackReplacement: {
    ...landingCopyEn.stackReplacement,
    titlePrefix: "sechs tools oder ",
    titleHighlight: "eins",
    titleSuffix: "",
    withoutTitle: "Ohne Rival",
    withoutBadge: "Der alte Weg",
    withoutIntro: "Sechs Tools. Keine gemeinsame Ansicht.",
    withoutIntroMobile: "Sechs Tools. Keine gemeinsame Ansicht.",
    withoutStatTools: "tools",
    withoutStatLogins: "logins",
    withoutStatGlue: "klebe/w",
    toolsSummary: "{count} Tools · {count} Logins · null Intelligence",
    toolsSummaryMobile: "{count} Tools · {count} Logins",
    manualLabel: "Der wöchentliche Aufwand",
    manualLabelMobile: "Wöchentlicher Aufwand",
    painPoints: ["Tabellen-Klebearbeit", "Tab-Wechsel", "Montags-Raten"],
    painPointsMobile: ["Tabellen", "Tab-Chaos", "Raten"],
    payTodayLabel: "Stack-Kosten heute",
    payTodayAmount: "$350",
    payTodaySub: "/Mo. · ~4 Std. Klebearbeit / Woche",
    payTodayBullets: [],
    payTodayFooter: "$270+/Mo. mehr als Rival",
    payTodayFooterSub: "6 Logins · keine Strategy Map",
    bottomBadge: "6 Tools · null Ertrag",
    withTitle: "Mit Rival",
    platformsLabel: "Alle 6 Plattformen inklusive",
    platformsLabelMobile: "Alle 6 Plattformen",
    capabilitiesLabel: "Plus die Intelligence-Schicht",
    capabilities: [
      { key: "organic", label: "Organic" },
      { key: "email", label: "E-Mail" },
      { key: "autopilot", label: "Autopilot" },
      { key: "mcp", label: "MCP-Chat" },
    ],
    onePlanLabel: "Ein Plan · voller Stack",
    zeroGlue: "Null Klebearbeit · ein Login",
    saveLabel: "$270+/Monat sparen vs. 6-Tool-Stack",
    saveSub: "7-Tage-Test · 1 Wettbewerber · jederzeit kündbar",
    saveSubMobile: "$270+/Monat sparen · 7-Tage-Test",
    trialCta: "KOSTENLOS TESTEN",
  },
  reviews: {
    title: "Vertraut von allen, die schnell handeln.",
    subtitle: "Performance-Marketer, die mit Rival skalieren",
    photoAlt: "Foto von {name}",
    featureImageAlt: "Foto aus der Bewertung von {name}",
    socialProof: {
      count: "400+",
      label: "Marketer lieben Rival",
      trustpilotAria: "5 von 5 Sternen auf Trustpilot",
    },
    items: landingCopyEn.reviews.items.map((item, i) => {
      const deTexts = [
        "Autopilot einmal aktiviert - Slack und E-Mail in unter fünf Minuten verbunden. Automatische Überwachung läuft, während ich schlafe; Kunden bekommen Belege statt vager Tipps. Stunden zurück jede Woche.",
        "Adidas in der Ad Library - 73 Live-Ads über sechs Plattformen in einer Ansicht. Stealable Angles zeigte Hooks, die wir nicht testen.",
        "15 Wettbewerber, sechs Kunden, ein Login. Die volle Strategy Map ins Kunden-Deck - jeder Kanal und Funnel-Schritt auf einer Folie. Das Playbook ist endlich verständlich.",
        "Nach dem Test am selben Tag abonniert. Moves gefunden, die ich wochenlang übersehen hatte.",
      ];
      return { ...item, text: deTexts[i] ?? item.text };
    }),
  },
  pricing: {
    titleLine1: "wähle deinen",
    titleHighlight: "plan",
    riskFreeBadge: "Risikofrei",
    guaranteeTitle: "7-Tage-Test, dann 30-Tage-Geld-zurück",
    guaranteeBody:
      "Starten Sie mit vollem 7-Tage-Test (Karte nötig). Wenn Rival in Ihren ersten 30 Tagen nichts Lohnendes zeigt, schreiben Sie uns für volle Erstattung - keine Fragen.",
    billingAria: "Abrechnungszeitraum",
    monthly: "Monatlich",
    yearly: "Jährlich",
    planIncludes: "Plan enthält:",
    footnote: "kostenlos testen · jederzeit kündbar",
    trialCta: "KOSTENLOS TESTEN",
    popularBadge: "Am beliebtesten",
    popularClaim: "400+ Käufer vertrauen uns",
    perMonth: "/Monat",
    perCompetitor: "{price} / Wettbewerber",
    billedMonthly: "Monatlich abgerechnet",
    billedAnnually: "Jährlich abgerechnet (${yearlyUsd}/Jahr)",
    plans: [
      {
        slug: "starter",
        name: "Starter",
        summary: "Für Solo-Media-Buyer mit den wichtigsten Marktrivalen.",
        monthlyUsd: 40,
        annualMonthlyUsd: 32,
        annualYearlyUsd: 384,
        metricHighlight: { count: "5", label: "Wettbewerber" },
        features: [
          "Paid, Organic & E-Mail-Intelligence",
          "Autopilot-Alerts in Slack + E-Mail",
          "MCP-Zugang aus Claude & ChatGPT",
          "6 Ad-Plattformen · ein Dashboard",
          "Strategy Map + Autopilot 24/7",
          "1 Workspace · bis 15 Wechsel/Monat",
        ],
      },
      {
        slug: "pro",
        name: "Pro",
        summary: "Für Teams mit mehr Wettbewerbern, Exporten und Refresh on demand.",
        monthlyUsd: 60,
        originalMonthlyUsd: 75,
        annualMonthlyUsd: 48,
        annualYearlyUsd: 576,
        metricHighlight: { count: "15", label: "Wettbewerber" },
        plusLabel: "Alles aus Starter, plus",
        popular: true,
        features: [
          "1 Marken-Workspace · bis 50 Wechsel/Monat",
          "Priority Refresh",
          "CSV-Export",
          "Manueller Refresh auf Abruf",
          "Historische Snapshots",
          "Emerging Angle Alerts",
        ],
      },
      {
        slug: "agency",
        name: "Agency",
        summary: "Für Agenturen mit mehreren Kundenmarken in einem Account.",
        monthlyUsd: 100,
        annualMonthlyUsd: 80,
        annualYearlyUsd: 960,
        metricHighlight: { count: "75", label: "Wettbewerber-Slots" },
        plusLabel: "Alles aus Pro, plus",
        features: [
          "Bis zu 5 Marken-Workspaces - eigene Wettbewerberliste pro Kunde",
          "Alle Pro-Features pro Marke",
          "CSV-Export · manueller Refresh · Alert-Regeln",
          "Dediziertes Onboarding für Ihr Team",
          "Priority Support + White-Label-Kundenberichte",
        ],
      },
    ],
  },
  faq: {
    titleLine1: "häufig gestellte",
    titleHighlight: "fragen",
    items: [
      {
        q: "Wie funktioniert der Gratis-Test?",
        a: "Mit Karte anmelden und 7 Tage vollen Rival-Zugang mit 1 Wettbewerber über alle 6 Plattformen. In den ersten 7 Tagen jederzeit kündigen - keine Abbuchung. Danach ab $40/Monat (Starter) bzw. $384/Jahr (20 % Rabatt) bei jährlicher Buchung. Ein-Klick-Kündigung, keine Retention-Calls.",
      },
      {
        q: "Worin unterscheidet sich Rival von Foreplay oder AdSpy?",
        a: "Foreplay und AdSpy sind Ad Libraries - sie zeigen, was ein Wettbewerber schaltet. Rival ist eine Intelligence-Plattform - zeigt die Anzeigen und warnt, wenn es zählt. (1) Alle 6 Plattformen out of the box. (2) Stealable Angles vergleicht Wettbewerber-Angles mit Ihrer Library. (3) Autopilot wacht 24/7 und sendet Slack- und E-Mail-Alerts bei Launches, Pivots und Promos.",
      },
      {
        q: "Ist das legal?",
        a: "Ja. Rival nutzt nur öffentliche Ad-Transparency-Libraries von Meta, Google, TikTok, LinkedIn, Pinterest und Snapchat. Keine privaten Daten, kein Account-Zugriff.",
      },
      {
        q: "Wie oft werden Daten aktualisiert?",
        a: "Jeder Wettbewerber wird automatisch im Rollplan aktualisiert - Meta und Google alle paar Tage, andere etwas seltener. Pro-Nutzer können manuell refreshen. Die meisten öffnen Rival montags für die Wochenänderungen.",
      },
      {
        q: "Kann ich auch meine eigene Marke tracken?",
        a: "Ja, empfohlen. Eigene Marke schaltet Side-by-Side-Stats, Vergleiche und Stealable Angles frei - Lücken, die Sie testen sollten.",
      },
      {
        q: "Welche Plattformen unterstützt Rival?",
        a: "Meta (Facebook & Instagram), Google (Search, Display, YouTube), TikTok, LinkedIn, Pinterest und Snapchat. Alle sechs in jedem Plan - ohne Plattform-Zusatzkosten.",
      },
      {
        q: "Wie genau sind die Daten?",
        a: "Anzeigen-Erkennung ist sehr zuverlässig, weil wir direkt aus offiziellen Transparency-Libraries lesen. Strategische Analyse ist KI-generiert und wird mit mehr Daten schärfer. Jede Aussage ist an die zugrundeliegenden Anzeigen gebunden.",
      },
      {
        q: "Kann ich jederzeit kündigen?",
        a: "Ja. Ein Klick in den Kontoeinstellungen - keine Retention-Calls. Bei Kündigung mitten im Zyklus behalten Sie Zugang bis Periodenende.",
      },
    ],
  },
  comparison: {
    titleLine1: "unser vergleich",
    titleHighlight: "mit anderen tools",
    subtitle: "Rival vs. Panoramata, AdSpyder, PowerAdSpy und AdLibrary.com - auf einen Blick.",
    featureColumn: "Feature",
    yesAria: "Ja",
    noAria: "Nein",
    cta: "KOSTENLOS TESTEN",
    ctaFootnote: "Das einzige Cross-Platform-Wettbewerber-OS mit Autopilot.",
    sections: landingCopyEn.comparison.sections.map((section) => ({
      ...section,
      title:
        section.title === "Strategy OS"
          ? "Strategy OS"
          : section.title === "Funnel & timeline intelligence"
            ? "Funnel- & Timeline-Intelligence"
            : section.title === "Cross-platform competitor view"
              ? "Cross-Platform-Wettbewerber-Ansicht"
              : "Agentur-Workflow",
      rows: section.rows.map((row) => ({
        ...row,
        feature: translateComparisonFeatureDe(row.feature),
        featureMobile: translateComparisonFeatureMobileDe(row.featureMobile),
      })),
    })),
    competitorColumns: landingCopyEn.comparison.competitorColumns,
  },
  finalCta: {
    titleLine1: "sehen sie, was ihre",
    titleHighlight: "wettbewerber schalten",
    subtitle: "7 tage kostenlos testen.",
    monthlyPrice: "$40/Mo.",
    annualPrice: "$32/Mo.",
    monthlyLabel: "Monatlich",
    annualLabel: "Jährlich",
    annualSaveBadge: "20 % sparen",
    billingAria: "Abrechnungszeitraum wählen",
    trialCta: "KOSTENLOS TESTEN",
    cancelNote: "jederzeit kündbar",
  },
  footer: {
    columns: [
      {
        title: "PRODUKT",
        links: [
          { label: "So funktioniert's", href: "/#how-it-works" },
          { label: "Vergleich", href: "/#compare" },
          { label: "Preise", href: "/#pricing" },
          { label: "FAQ", href: "/#faq" },
          { label: "Test starten", href: "/onboarding" },
        ],
      },
      {
        title: "RESSOURCEN",
        links: [
          { label: "Blog", href: "/blog" },
          { label: "Über uns", href: "/about" },
          { label: "Kontakt", href: "mailto:hello@spy-rival.com" },
        ],
      },
      {
        title: "RECHTLICHES",
        links: [
          { label: "Datenschutz", href: "/privacy" },
          { label: "AGB", href: "/terms" },
          { label: "Cookie-Richtlinie", href: "/cookies" },
        ],
      },
    ],
    copyright: "© 2026 Spy-Rival",
  },
  jsonLd: {
    appDescription:
      "Wettbewerber-Spionage auf Autopilot - verfolgt Paid Ads, organisches Marketing und E-Mail-Marketing auf Meta, Google, TikTok, LinkedIn, Pinterest und Snapchat, mit MCP-Zugriff aus Claude und ChatGPT.",
    starterName: "Starter",
    proName: "Pro",
    agencyName: "Agency",
  },
};

function translateComparisonFeatureDe(feature: string): string {
  const map: Record<string, string> = {
    "Tracks a fixed list of named competitors as the core workflow":
      "Feste Liste benannter Wettbewerber als Kern-Workflow",
    "Weekly email summaries focused on tracked competitors' changes":
      "Wöchentliche E-Mails zu Änderungen der getrackten Wettbewerber",
    "Generates recurring, per-competitor test ideas from their latest ads":
      "Wiederkehrende Test-Ideen pro Wettbewerber aus neuesten Anzeigen",
    "Tags competitor ads by funnel stage (TOFU / MOFU / BOFU)":
      "Wettbewerber-Anzeigen nach Funnel-Stufe (TOFU / MOFU / BOFU)",
    "Shows a timeline of each competitor ad's lifespan (launch → killed)":
      "Timeline der Anzeigen-Laufzeit (Start → beendet)",
    "Built-in archive of competitor landing pages, linked from every ad":
      "Archiv der Wettbewerber-Landingpages, verlinkt von jeder Anzeige",
    "Single dashboard showing each competitor's ads across Meta, Google, TikTok, LinkedIn, Pinterest":
      "Ein Dashboard: Wettbewerber-Anzeigen über Meta, Google, TikTok, LinkedIn, Pinterest",
    "Competitor view is ad-funnel focused, not email / SMS / SEO-first":
      "Wettbewerber-Ansicht fokussiert auf Ad-Funnel, nicht E-Mail/SMS/SEO",
    "Designed explicitly for media buyers & agencies (not just e-com brands)":
      "Für Media Buyer & Agenturen (nicht nur E-Commerce)",
    "Generates client-ready competitor reports with minimal manual editing":
      "Kundenfertige Wettbewerber-Reports mit minimalem Aufwand",
  };
  return map[feature] ?? feature;
}

function translateComparisonFeatureMobileDe(featureMobile: string): string {
  const map: Record<string, string> = {
    "Fixed competitor tracking list": "Feste Wettbewerber-Liste",
    "Weekly competitor change emails": "Wöchentliche Änderungs-E-Mails",
    "Auto test ideas from latest ads": "Auto Test-Ideen aus Anzeigen",
    "Funnel stage tags (TOFU/MOFU/BOFU)": "Funnel-Tags (TOFU/MOFU/BOFU)",
    "Ad lifespan timeline": "Anzeigen-Timeline",
    "Landing page archive per ad": "Landing-Archiv pro Anzeige",
    "All-platform ads in one dashboard": "Alle Plattformen, ein Dashboard",
    "Ad-funnel focus (not email/SEO)": "Ad-Funnel-Fokus",
    "Built for agencies & media buyers": "Für Agenturen & Media Buyer",
    "Client-ready reports, minimal editing": "Kundenfertige Reports",
  };
  return map[featureMobile] ?? featureMobile;
}
