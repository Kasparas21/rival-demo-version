export type ResourceTutorial = {
  title: string;
  summary: string;
  steps: string[];
};

export const TUTORIAL_ITEMS: ResourceTutorial[] = [
  {
    title: "Add your first competitor",
    summary: "Start spying in under two minutes — domain in, six platforms out.",
    steps: [
      "Sign up and open your Rival workspace.",
      "Enter a competitor domain (e.g. rival-brand.com).",
      "Rival discovers their Meta, Google, TikTok, LinkedIn, Pinterest, and Snapchat presence.",
      "Wait for the first scrape — usually a few minutes.",
      "Open the Ad Library tab to browse every live ad.",
    ],
  },
  {
    title: "Read the Strategy Map",
    summary: "Turn a wall of ads into a platform × funnel map you can present.",
    steps: [
      "Open a tracked competitor from your sidebar.",
      "Click Strategy Map in the competitor dashboard.",
      "Scan TOF / MOF / BOF cells for FLAGSHIP, TESTING, STABLE, or DECLINING tags.",
      "Read the AI strategy summary at the top for plain-English takeaways.",
      "Share the map in your weekly marketing sync.",
    ],
  },
  {
    title: "Turn on Autopilot 24/7",
    summary: "Get Slack and email alerts when rivals launch, pivot, or promo.",
    steps: [
      "Open Settings and enable Autopilot for your workspace.",
      "Connect Slack or confirm your alert email.",
      "Pick which competitors and channels to watch.",
      "Rival scans overnight and flags fresh launches while you sleep.",
      "Act on alerts in Slack or open the source ad in one click.",
    ],
  },
  {
    title: "Set up the Monday Digest",
    summary: "Get competitor changes in your inbox every Monday morning.",
    steps: [
      "Go to Settings → Notifications.",
      "Enable Monday Digest for your workspace.",
      "Choose which competitors to include.",
      "Digest sends after the weekly scrape — launches, kills, and platform shifts.",
      "Click through to verify any move in the live Ad Library.",
    ],
  },
];

export const TOOL_ITEMS = [
  {
    title: "Competitor domain lookup",
    summary: "Enter any brand domain and see which ad platforms Rival can track.",
    href: "/onboarding",
  },
  {
    title: "Multi-platform Ad Library",
    summary: "Browse Meta, Google, TikTok, LinkedIn, Pinterest, and Snapchat in one grid.",
    href: "/features/ad-library",
  },
  {
    title: "Strategy Map generator",
    summary: "Auto-build a funnel map from live competitor ads.",
    href: "/features/strategy-map",
  },
  {
    title: "Stealable Angles comparison",
    summary: "Compare your ad angles vs a competitor and rank gaps by opportunity.",
    href: "/features/stealable-angles",
  },
  {
    title: "Copy Vault export",
    summary: "Sort competitor headlines by lifespan and export hooks for briefs.",
    href: "/features/copy-vault",
  },
  {
    title: "Activity Score benchmark",
    summary: "Score how aggressively each competitor is advertising right now.",
    href: "/features/activity-score",
  },
];
