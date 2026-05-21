export type CompetitorKey = "panoramata" | "adspyder" | "poweradspy" | "adlibrary";

export type ComparisonRow = {
  feature: string;
  rival: boolean;
  panoramata: boolean;
  adspyder: boolean;
  poweradspy: boolean;
  adlibrary: boolean;
};

export type ComparisonSection = {
  title: string;
  rows: ComparisonRow[];
};

export const LANDING_COMPARISON_SECTIONS: ComparisonSection[] = [
  {
    title: "Strategy OS",
    rows: [
      {
        feature: "Tracks a fixed list of named competitors as the core workflow",
        rival: true,
        panoramata: true,
        adspyder: false,
        poweradspy: false,
        adlibrary: false,
      },
      {
        feature: "Weekly email summaries focused on tracked competitors' changes",
        rival: true,
        panoramata: true,
        adspyder: false,
        poweradspy: false,
        adlibrary: false,
      },
      {
        feature: "Generates recurring, per-competitor test ideas from their latest ads",
        rival: true,
        panoramata: false,
        adspyder: false,
        poweradspy: false,
        adlibrary: false,
      },
    ],
  },
  {
    title: "Funnel & timeline intelligence",
    rows: [
      {
        feature: "Tags competitor ads by funnel stage (TOFU / MOFU / BOFU)",
        rival: true,
        panoramata: false,
        adspyder: false,
        poweradspy: false,
        adlibrary: false,
      },
      {
        feature: "Shows a timeline of each competitor ad's lifespan (launch → killed)",
        rival: true,
        panoramata: false,
        adspyder: false,
        poweradspy: false,
        adlibrary: false,
      },
      {
        feature: "Built-in archive of competitor landing pages, linked from every ad",
        rival: true,
        panoramata: true,
        adspyder: true,
        poweradspy: true,
        adlibrary: true,
      },
    ],
  },
  {
    title: "Cross-platform competitor view",
    rows: [
      {
        feature: "Single dashboard showing each competitor's ads across Meta, Google, TikTok, LinkedIn, Pinterest",
        rival: true,
        panoramata: true,
        adspyder: true,
        poweradspy: true,
        adlibrary: true,
      },
      {
        feature: "Competitor view is ad-funnel focused, not email / SMS / SEO-first",
        rival: true,
        panoramata: false,
        adspyder: true,
        poweradspy: true,
        adlibrary: true,
      },
    ],
  },
  {
    title: "Agency workflow",
    rows: [
      {
        feature: "Designed explicitly for media buyers & agencies (not just e-com brands)",
        rival: true,
        panoramata: false,
        adspyder: true,
        poweradspy: true,
        adlibrary: true,
      },
      {
        feature: "Generates client-ready competitor reports with minimal manual editing",
        rival: true,
        panoramata: true,
        adspyder: false,
        poweradspy: false,
        adlibrary: false,
      },
    ],
  },
];

export const COMPETITOR_COLUMNS: { key: CompetitorKey; label: string; short: string }[] = [
  { key: "panoramata", label: "Panoramata", short: "Pano" },
  { key: "adspyder", label: "AdSpyder", short: "AdSpy" },
  { key: "poweradspy", label: "PowerAdSpy", short: "Power" },
  { key: "adlibrary", label: "AdLibrary.com", short: "AdLib" },
];
