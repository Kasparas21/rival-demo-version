export type FeatureIconKey =
  | "layout-grid"
  | "map"
  | "sparkles"
  | "git-compare"
  | "book-open"
  | "timer"
  | "gauge"
  | "bar-chart"
  | "mail"
  | "sliders";

export type FeatureDefinition = {
  id: string;
  name: string;
  iconKey: FeatureIconKey;
  summary: string;
  why: string;
  bullets: string[];
};

export const FEATURE_DEFINITIONS: FeatureDefinition[] = [
  {
    id: "ad-library",
    name: "Multi-platform Ad Library",
    iconKey: "layout-grid",
    summary:
      "Every active ad your competitor runs — Meta, Google, TikTok, LinkedIn, Pinterest, and Snapchat — in one searchable library.",
    why: "Stop juggling six tabs and four subscriptions just to see what they're running.",
    bullets: [
      "Filter by platform, status, or format in one click",
      "See launch dates and lifespan on every creative",
      "Jump from any ad to its source transparency page",
    ],
  },
  {
    id: "strategy-map",
    name: "Strategy Map",
    iconKey: "map",
    summary:
      "A platform × funnel map that shows where each competitor is going all-in, testing, stable, or winding down.",
    why: "Turn a pile of ads into a readable strategy you can explain in a meeting.",
    bullets: [
      "TOF / MOF / BOF cells tagged FLAGSHIP, TESTING, STABLE, or DECLINING",
      "AI-written strategy summary in plain English",
      "Spot budget shifts before they show up in your market",
    ],
  },
  {
    id: "three-moves",
    name: "Three Moves",
    iconKey: "sparkles",
    summary:
      "Three concrete tactical recommendations every week — copy this angle, shift this budget, refresh this creative.",
    why: "Replace 47-page reports with moves you can act on Monday morning.",
    bullets: [
      "Each move tied to specific ads and numbers from your scrape",
      "Prioritized by impact, not generic best practices",
      "One-click brief links for your creative team",
    ],
  },
  {
    id: "stealable-angles",
    name: "Stealable Angles",
    iconKey: "git-compare",
    summary: "Side-by-side comparison of your ad angles vs a competitor's — with gaps ranked by opportunity.",
    why: "Find the hooks they run that you don't, without scrolling hundreds of ads.",
    bullets: [
      "Compare your library against any tracked competitor",
      "Highlight angles worth testing with evidence attached",
      "Save examples to brief your team instantly",
    ],
  },
  {
    id: "copy-vault",
    name: "Copy Vault",
    iconKey: "book-open",
    summary:
      "Every headline, hook, and CTA your competitor has run — sorted by lifespan so winners float to the top.",
    why: "Longest-running copy is proven copy. Rival surfaces it automatically.",
    bullets: [
      "Sort by lifespan or newest first",
      "Filter by platform and funnel stage",
      "Export hooks for creative briefs",
    ],
  },
  {
    id: "timeline",
    name: "Timeline",
    iconKey: "timer",
    summary: "A Gantt-style view of every ad's lifespan — what's live, what just launched, and what they killed.",
    why: "See the rhythm of their creative testing without building spreadsheets.",
    bullets: [
      "Launch → last-seen dates on every creative",
      "Live vs killed ads styled differently",
      "Weekly launch and retirement activity at a glance",
    ],
  },
  {
    id: "activity-score",
    name: "Activity Score",
    iconKey: "gauge",
    summary: "A 0–100 score that quantifies how aggressively a competitor is advertising right now.",
    why: "Know instantly if they're in growth mode, maintenance, or pulling back.",
    bullets: [
      "Tier classification with confidence level",
      "Breakdown of creative clusters and production mix",
      "Compare scores across multiple competitors",
    ],
  },
  {
    id: "audience-inference",
    name: "Audience Inference",
    iconKey: "bar-chart",
    summary:
      "AI-inferred audience profile from ad copy, creative, and platform mix — age range, tone, and primary channels.",
    why: "Understand who they're talking to even when targeting data isn't public.",
    bullets: [
      "Tone-of-voice tags from actual ad language",
      "Primary platform signals weighted by spend proxies",
      "Side-by-side audience comparison vs your brand",
    ],
  },
  {
    id: "monday-digest",
    name: "Monday Digest",
    iconKey: "mail",
    summary: "A weekly email summarizing everything that changed — new angles, platform shifts, budget moves.",
    why: "Open your inbox Monday and know exactly what happened last week.",
    bullets: [
      "Bullet summary of launches, kills, and shifts",
      "Linked to source ads for verification",
      "Delivered automatically after each scrape cycle",
    ],
  },
  {
    id: "platform-prioritization",
    name: "Smart Platform Prioritization",
    iconKey: "sliders",
    summary: "Auto-classifies each platform as PRIMARY, SECONDARY, MINIMAL, or INACTIVE based on live ad volume.",
    why: "Instantly see where they actually spend attention — not where they have a profile.",
    bullets: [
      "Classification updates as ad counts change",
      "Compare prioritization across competitors",
      "Spot channel experiments before they scale",
    ],
  },
];
