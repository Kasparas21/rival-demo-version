import { landingCopyEn } from "@/lib/i18n/landing/en";
import type { LandingCopy } from "@/lib/i18n/landing/types";

export const landingCopyDe: LandingCopy = {
  ...landingCopyEn,
  locale: "de",
  meta: {
    title: "Spy Rival - #1 kostenloses Adspy-Tool",
    description:
      "Spy Rival ist das #1 kostenlose Adspy-Tool für Wettbewerber-Anzeigen — Meta, Google, YouTube, TikTok, LinkedIn, Pinterest und Snapchat in einem Dashboard.",
  },
  consent: {
    title: "Cookies & Analyse",
    descriptionMobile: "Analyse- und Marketing-Cookies für Website- und Anzeigen-Messung.",
    descriptionDesktop:
      "Wir verwenden Analyse- und Marketing-Cookies (einschließlich Meta Pixel), um die Nutzung der Website und die Anzeigenleistung zu messen. Sie können nicht notwendige Cookies akzeptieren oder ablehnen.",
    policyShort: "Richtlinie",
    cookiePolicy: "Cookie-Richtlinie",
    reject: "Ablehnen",
    accept: "Akzeptieren",
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
      line1Prefix: "#1 kostenloses ",
      highlight: "adspy-tool",
      line2: "",
      subline:
        "Spy Rival ist das beste Adspy-Tool, um jede Wettbewerber-Anzeige auf Meta, Google, TikTok, LinkedIn, Pinterest und Snapchat zu verfolgen — alles in einem Dashboard.",
    },
    trialCta: "KOSTENLOS TESTEN",
    platformTrialAria: "Test mit {platform} starten",
    marketersPillAria: "Für Performance-Marketer gebaut",
    marketersPill: "Für Performance-Marketer gebaut",
    brandMarqueeAria: "Vertraut von Performance-Marketern",
    brandMarqueeLabel: "Vertraut von Performance-Marketern",
  },
  features: {
    titleLine1: "von wettbewerber-anzeigen zu Ihrem",
    titleHighlight: "wöchentlichen aktionsplan in 30 sekunden",
    subtitle:
      "Rival zieht jede aktive Anzeige Ihrer Wettbewerber über 6 Plattformen, decodiert ihren Funnel und nennt Ihnen die drei Moves für diese Woche. Ein Tool ersetzt sechs Tabs.",
    cards: [
      {
        imageAlt:
          "Ad-Library-Dashboard mit Anzeigen mehrerer Plattformen und Auswahl für Meta, Google, TikTok, LinkedIn, Pinterest und Snapchat.",
        title: "Jede Plattform, auf der sie werben — in einer Ansicht.",
        body: "Wettbewerber per Domain hinzufügen — Rival zieht jede aktive Anzeige über Meta, Google, TikTok, LinkedIn, Pinterest und Snapchat. Foreplay zeigt nur Meta. AdSpy endet bei Google. Rival zeigt alle sechs — keine sechs Tabs und vier Abos mehr.",
      },
      {
        imageAlt: "Strategy Map mit Plattform-Funnel-Raster und KI-Strategie-Zusammenfassung.",
        title: "Die ganze Strategie auf einer Karte.",
        body: "Rival legt die Aktivität jedes Wettbewerbers auf einer Plattform-Funnel-Karte dar — wo sie voll einsteigen, testen oder abbauen — mit einer KI-Zusammenfassung in einem Absatz. Der Unterschied zwischen einem Anzeigenhaufen und einem Plan, den Sie sehen können.",
      },
      {
        imageAlt: "Three-Moves-Dashboard mit wöchentlichen taktischen Prioritäten aus Scrape-Daten.",
        title: "Drei taktische Moves jede Woche.",
        body: "Schluss mit 47-seitigen Wettbewerber-Reports. Rival liest die Strategie wöchentlich und liefert genau drei Moves — diesen Angle kopieren, Budget verschieben, Creative erneuern — jeweils mit echten Scrape-Zahlen, nicht generischen Tipps.",
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
    payTodayAmount: "£350",
    payTodaySub: "/Mo. · ~4 Std. Klebearbeit / Woche",
    payTodayBullets: [],
    payTodayFooter: "£270+/Mo. mehr als Rival",
    payTodayFooterSub: "6 Logins · keine Strategy Map",
    bottomBadge: "6 Tools · null Ertrag",
    withTitle: "Mit Rival",
    platformsLabel: "Alle 6 Plattformen inklusive",
    platformsLabelMobile: "Alle 6 Plattformen",
    features: [
      "Wettbewerber per Domain — alle 6 Plattformen",
      "Auto-Refresh + eingebaute Timelines",
      "Funnel- + Landing-Page-Archiv",
      "KI-Angles + wöchentliche Three-Moves-E-Mail",
      "Denken in Rivalen, nicht Netzwerken",
      "Stealable Angles vs. eigene Ad Library",
      "Montags Activity Feed + Digest-E-Mail",
      "Ein Login — keine Plattform-Zusatzkosten",
    ],
    featuresMobile: [
      "Wettbewerber per Domain — alle 6 Plattformen",
      "Auto-Refresh + Timelines",
      "Funnel- + Landing-Page-Archiv",
      "KI-Angles + wöchentliche Three Moves",
      "Ein Login — keine Plattform-Gebühren",
    ],
    onePlanLabel: "Ein Plan · alle 6 Plattformen",
    zeroGlue: "Null Klebearbeit · ein Login",
    saveLabel: "£270+/Monat sparen vs. 6-Tool-Stack",
    saveSub: "7-Tage-Test · 1 Wettbewerber · jederzeit kündbar",
    saveSubMobile: "£270+/Monat sparen · 7-Tage-Test",
    trialCta: "KOSTENLOS TESTEN",
  },
  reviews: {
    titleLine1: "das bevorzugte tool",
    titleHighlight: "von performance-marketern",
    starsAria: "{count} von 5 Sternen",
    photoAlt: "Foto von {name}",
    items: landingCopyEn.reviews.items.map((item, i) => {
      const deTexts = [
        "Vier Tools durch eines ersetzt. Three Moves liefert Kunden Belege statt vager Tipps.",
        "Alle sechs Plattformen an einem Ort. Activity Feed fängt Moves, die Foreplay und AdSpy verpassten.",
        "Stealable Angles zeigt Lücken, die wir nicht testen. Win-Rate bei neuem Creative ist höher.",
        "Nach dem Test am selben Tag abonniert. Moves gefunden, die ich wochenlang übersehen hatte.",
        "15 Wettbewerber, sechs Kunden, ein Login. Strategy Map direkt ins Deck.",
        "Montags-Kaffee-Routine ruiniert. Three Moves um 7 Uhr — ich muss wirklich arbeiten. (Kampagnen laufen besser.)",
      ];
      return { ...item, text: deTexts[i] ?? item.text };
    }),
  },
  pricing: {
    title: "plan wählen",
    riskFreeBadge: "Risikofrei",
    guaranteeTitle: "7-Tage-Test, dann 30-Tage-Geld-zurück",
    guaranteeBody:
      "Starten Sie mit vollem 7-Tage-Test (Karte nötig). Wenn Rival in Ihren ersten 30 Tagen nichts Lohnendes zeigt, schreiben Sie uns für volle Erstattung — keine Fragen.",
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
    billedAnnually: "Jährlich abgerechnet (£{yearlyUsd}/Jahr)",
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
          "Alle 6 Plattformen — Meta, Google, TikTok, LinkedIn, Pinterest, Snapchat",
          "Automatischer Refresh — keine Handarbeit",
          "Volle Intelligence-Suite — Strategy Map, Activity Score, Copy Vault & mehr",
          "Wöchentlicher Three-Moves-KI-Report + Montags-Digest",
          "1 Marken-Workspace · bis 15 Wechsel/Monat",
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
          "Bis zu 5 Marken-Workspaces — eigene Wettbewerberliste pro Kunde",
          "Alle Pro-Features pro Marke",
          "CSV-Export · manueller Refresh · Alert-Regeln",
          "Dediziertes Onboarding für Ihr Team",
          "Priority Support + White-Label-Kundenberichte",
        ],
      },
    ],
  },
  faq: {
    eyebrow: "noch nicht überzeugt?",
    titleLine1: "häufig gestellte",
    titleHighlight: "fragen",
    items: [
      {
        q: "Wie funktioniert der Gratis-Test?",
        a: "Mit Karte anmelden und 7 Tage vollen Rival-Zugang mit 1 Wettbewerber über alle 6 Plattformen. In den ersten 7 Tagen jederzeit kündigen — keine Abbuchung. Danach ab £40/Monat (Starter) bzw. £384/Jahr (20 % Rabatt) bei jährlicher Buchung. Ein-Klick-Kündigung, keine Retention-Calls.",
      },
      {
        q: "Worin unterscheidet sich Rival von Foreplay oder AdSpy?",
        a: "Foreplay und AdSpy sind Ad Libraries — sie zeigen, was ein Wettbewerber schaltet. Rival ist eine Intelligence-Plattform — zeigt die Anzeigen und sagt, was Sie tun sollen. (1) Alle 6 Plattformen out of the box — Foreplay nur Meta, AdSpy nur Meta und Google. (2) Stealable Angles vergleicht Wettbewerber-Angles mit Ihrer Library. (3) Three Moves liefert wöchentliche Empfehlungen aus echten Scrape-Daten.",
      },
      {
        q: "Ist das legal?",
        a: "Ja. Rival nutzt nur öffentliche Ad-Transparency-Libraries von Meta, Google, TikTok, LinkedIn, Pinterest und Snapchat. Keine privaten Daten, kein Account-Zugriff.",
      },
      {
        q: "Wie oft werden Daten aktualisiert?",
        a: "Jeder Wettbewerber wird automatisch im Rollplan aktualisiert — Meta und Google alle paar Tage, andere etwas seltener. Pro-Nutzer können manuell refreshen. Die meisten öffnen Rival montags für die Wochenänderungen.",
      },
      {
        q: "Kann ich auch meine eigene Marke tracken?",
        a: "Ja, empfohlen. Eigene Marke schaltet Side-by-Side-Stats, Vergleiche und Stealable Angles frei — Lücken, die Sie testen sollten.",
      },
      {
        q: "Welche Plattformen unterstützt Rival?",
        a: "Meta (Facebook & Instagram), Google (Search, Display, YouTube), TikTok, LinkedIn, Pinterest und Snapchat. Alle sechs in jedem Plan — ohne Plattform-Zusatzkosten.",
      },
      {
        q: "Wie genau sind die Daten?",
        a: "Anzeigen-Erkennung ist sehr zuverlässig, weil wir direkt aus offiziellen Transparency-Libraries lesen. Strategische Analyse ist KI-generiert und wird mit mehr Daten schärfer. Jede Aussage ist an die zugrundeliegenden Anzeigen gebunden.",
      },
      {
        q: "Kann ich jederzeit kündigen?",
        a: "Ja. Ein Klick in den Kontoeinstellungen — keine Retention-Calls. Bei Kündigung mitten im Zyklus behalten Sie Zugang bis Periodenende.",
      },
    ],
  },
  comparison: {
    titleLine1: "unser vergleich",
    titleHighlight: "mit anderen tools",
    subtitle: "Rival vs. Panoramata, AdSpyder, PowerAdSpy und AdLibrary.com — auf einen Blick.",
    featureColumn: "Feature",
    yesAria: "Ja",
    noAria: "Nein",
    cta: "KOSTENLOS TESTEN",
    ctaFootnote: "Das einzige Cross-Platform-Wettbewerber-OS für wöchentliche Moves.",
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
    monthlyPrice: "£40/Mo.",
    annualPrice: "£32/Mo.",
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
      "#1 kostenloses Adspy-Tool für Wettbewerber-Anzeigen auf Meta, Google, TikTok, LinkedIn, Pinterest und Snapchat.",
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
