export type CompetitorKey = "panoramata" | "adspyder" | "poweradspy" | "adlibrary";

export type ComparisonRow = {
  feature: string;
  /** Shorter label for mobile comparison table - desktop uses `feature`. */
  featureMobile: string;
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
        featureMobile: "Fixed competitor tracking list",
        rival: true,
        panoramata: true,
        adspyder: false,
        poweradspy: false,
        adlibrary: false,
      },
      {
        feature: "Weekly email summaries focused on tracked competitors' changes",
        featureMobile: "Weekly competitor change emails",
        rival: true,
        panoramata: true,
        adspyder: false,
        poweradspy: false,
        adlibrary: false,
      },
      {
        feature: "Generates recurring, per-competitor test ideas from their latest ads",
        featureMobile: "Auto test ideas from latest ads",
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
        featureMobile: "Funnel stage tags (TOFU/MOFU/BOFU)",
        rival: true,
        panoramata: false,
        adspyder: false,
        poweradspy: false,
        adlibrary: false,
      },
      {
        feature: "Shows a timeline of each competitor ad's lifespan (launch → killed)",
        featureMobile: "Ad lifespan timeline",
        rival: true,
        panoramata: false,
        adspyder: false,
        poweradspy: false,
        adlibrary: false,
      },
      {
        feature: "Built-in archive of competitor landing pages, linked from every ad",
        featureMobile: "Landing page archive per ad",
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
        featureMobile: "All-platform ads in one dashboard",
        rival: true,
        panoramata: false,
        adspyder: false,
        poweradspy: false,
        adlibrary: false,
      },
      {
        feature: "Competitor view is ad-funnel focused, not email / SMS / SEO-first",
        featureMobile: "Ad-funnel focus (not email/SEO)",
        rival: true,
        panoramata: false,
        adspyder: true,
        poweradspy: true,
        adlibrary: true,
      },
    ],
  },
  {
    title: "Beyond ad libraries",
    rows: [
      {
        feature: "Organic social monitoring - posts, hooks, and formats",
        featureMobile: "Organic social monitoring",
        rival: true,
        panoramata: false,
        adspyder: false,
        poweradspy: false,
        adlibrary: false,
      },
      {
        feature: "Competitor email capture - promos, flows, and sequences",
        featureMobile: "Email flow capture",
        rival: true,
        panoramata: true,
        adspyder: false,
        poweradspy: false,
        adlibrary: false,
      },
      {
        feature: "24/7 Autopilot alerts to Slack and email",
        featureMobile: "Autopilot Slack + email alerts",
        rival: true,
        panoramata: false,
        adspyder: false,
        poweradspy: false,
        adlibrary: false,
      },
      {
        feature: "MCP access - query live competitor data from Claude and ChatGPT",
        featureMobile: "MCP for Claude & ChatGPT",
        rival: true,
        panoramata: false,
        adspyder: false,
        poweradspy: false,
        adlibrary: false,
      },
    ],
  },
  {
    title: "Agency workflow",
    rows: [
      {
        feature: "Designed explicitly for media buyers & agencies (not just e-com brands)",
        featureMobile: "Built for agencies & media buyers",
        rival: true,
        panoramata: false,
        adspyder: true,
        poweradspy: true,
        adlibrary: true,
      },
      {
        feature: "Generates client-ready competitor reports with minimal manual editing",
        featureMobile: "Client-ready reports, minimal editing",
        rival: true,
        panoramata: true,
        adspyder: false,
        poweradspy: false,
        adlibrary: false,
      },
    ],
  },
];

export const COMPETITOR_COLUMNS: { key: CompetitorKey; label: string; short: string; mobile: string }[] = [
  { key: "panoramata", label: "Panoramata", short: "Pano", mobile: "Pan" },
  { key: "adspyder", label: "AdSpyder", short: "AdSpy", mobile: "Spy" },
  { key: "poweradspy", label: "PowerAdSpy", short: "Power", mobile: "Pow" },
  { key: "adlibrary", label: "AdLibrary.com", short: "AdLib", mobile: "Lib" },
];
