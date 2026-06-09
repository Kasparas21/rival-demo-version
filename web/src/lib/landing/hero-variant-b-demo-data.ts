import type {
  FunnelCellId,
  FunnelCellNodePayload,
  FunnelStage,
  StrategyMapPayload,
  StrategyPlatform,
} from "@/lib/strategy-overview/payload-types";

export const DEMO_COMPETITOR = {
  name: "Competitor A",
  domain: "competitor-a.com",
  lastScraped: "2h ago",
  lastSpyRun: "Tue Jun 9 (UTC)",
} as const;

export const DEMO_YOUR_BRAND = {
  name: "Your Brand",
  domain: "your-brand.com",
} as const;

export type DemoPlatform = "meta" | "google" | "tiktok" | "pinterest" | "snapchat";

export const DEMO_PLATFORM_ACTIVE_COUNTS: Record<DemoPlatform, number> = {
  meta: 205,
  google: 108,
  tiktok: 28,
  pinterest: 12,
  snapchat: 4,
};

export const DEMO_PLATFORM_TOTAL_COUNTS: Record<DemoPlatform, number> = {
  meta: 248,
  google: 132,
  tiktok: 31,
  pinterest: 14,
  snapchat: 6,
};

export const DEMO_ACTIVITY_SCORE = {
  score: 68,
  tier: 4,
  tierLabel: "Tier 4",
  spend: "€15K–€50K/mo in this market",
  confidence: "High confidence",
  topPercent: "TOP 1%",
  reasons: [
    "Strong creative diversity across formats",
    "Consistent refresh velocity on Meta",
    "Multi-platform landing page footprint",
  ],
} as const;

export const DEMO_LANDING_PAGES = [
  { id: "lp-1", url: "competitor-a.com/sale", ads: 142, platforms: { meta: 98, google: 44 } },
  { id: "lp-2", url: "competitor-a.com/new", ads: 89, platforms: { meta: 62, google: 27 } },
  { id: "lp-3", url: "shop.competitor-a.com", ads: 56, platforms: { meta: 31, google: 18, pinterest: 7 } },
  { id: "lp-4", url: "competitor-a.com/running", ads: 41, platforms: { meta: 28, google: 13 } },
  { id: "lp-5", url: "competitor-a.com/outlet", ads: 29, platforms: { meta: 19, google: 10 } },
] as const;

export type DemoAd = {
  id: string;
  platform: DemoPlatform;
  pageName: string;
  body: string;
  headline: string;
  linkDescription: string;
  cta: string;
  siteLabel: string;
  activeDays: number;
  isVideo?: boolean;
  gradient: string;
  funnel?: "top" | "middle" | "bottom";
  format?: string;
  lifespanDays?: number;
  angle?: string;
};

export const DEMO_ADS: DemoAd[] = [
  {
    id: "meta-1",
    platform: "meta",
    pageName: "Competitor A",
    body: "New season drop — performance fabrics built for everyday training. Free returns on all orders.",
    headline: "Train harder. Recover faster.",
    linkDescription: "Shop the latest collection",
    cta: "Shop Now",
    siteLabel: "competitor-a.com",
    activeDays: 14,
    gradient: "linear-gradient(135deg, #1e3a5f 0%, #4a7fa5 55%, #7eb3d4 100%)",
    funnel: "top",
    format: "Image",
    lifespanDays: 67,
    angle: "Brand awareness",
  },
  {
    id: "meta-2",
    platform: "meta",
    pageName: "Competitor A",
    body: "Members get early access to limited colorways. Join free — unlock 15% off your first order.",
    headline: "Early access ends Sunday",
    linkDescription: "Join the rewards program",
    cta: "Sign Up",
    siteLabel: "competitor-a.com/join",
    activeDays: 9,
    isVideo: true,
    gradient: "linear-gradient(160deg, #0f172a 0%, #334155 45%, #64748b 100%)",
    funnel: "middle",
    format: "Video",
    lifespanDays: 42,
    angle: "Membership hook",
  },
  {
    id: "meta-3",
    platform: "meta",
    pageName: "Competitor A",
    body: "Our best-selling runner is back in stock. Lightweight cushioning for road and trail.",
    headline: "Back in stock",
    linkDescription: "Free shipping over €50",
    cta: "Shop Now",
    siteLabel: "competitor-a.com/shoes",
    activeDays: 21,
    gradient: "linear-gradient(120deg, #dc2626 0%, #f97316 50%, #fbbf24 100%)",
    funnel: "bottom",
    format: "Image",
    lifespanDays: 88,
    angle: "Product push",
  },
  {
    id: "google-1",
    platform: "google",
    pageName: "Competitor A",
    body: "Compare top-rated trainers side by side. See specs, reviews, and live inventory.",
    headline: "Running shoes — official store",
    linkDescription: "competitor-a.com",
    cta: "Visit site",
    siteLabel: "competitor-a.com",
    activeDays: 18,
    gradient: "linear-gradient(135deg, #ecfdf5 0%, #6ee7b7 50%, #059669 100%)",
    funnel: "bottom",
    format: "Search",
    lifespanDays: 120,
    angle: "Search capture",
  },
  {
    id: "google-2",
    platform: "google",
    pageName: "Competitor A",
    body: "Outlet prices on last season's styles. Limited sizes — updated daily.",
    headline: "Outlet — up to 40% off",
    linkDescription: "shop.competitor-a.com/outlet",
    cta: "Shop outlet",
    siteLabel: "shop.competitor-a.com",
    activeDays: 7,
    gradient: "linear-gradient(135deg, #faf5ff 0%, #c4b5fd 50%, #7c3aed 100%)",
    funnel: "bottom",
    format: "Display",
    lifespanDays: 35,
    angle: "Discount urgency",
  },
  {
    id: "pinterest-1",
    platform: "pinterest",
    pageName: "Competitor A",
    body: "Pin-worthy looks for your next race day. Save ideas and shop the edit.",
    headline: "Race day outfit ideas",
    linkDescription: "Browse the lookbook",
    cta: "Shop the look",
    siteLabel: "competitor-a.com/style",
    activeDays: 11,
    gradient: "linear-gradient(135deg, #fff1f2 0%, #fda4af 50%, #e11d48 100%)",
    funnel: "top",
    format: "Image",
    lifespanDays: 54,
    angle: "Lifestyle inspiration",
  },
  {
    id: "tiktok-1",
    platform: "tiktok",
    pageName: "Competitor A",
    body: "Watch how our athletes train — then shop the exact gear from the video.",
    headline: "Train like the pros",
    linkDescription: "Shop the collection",
    cta: "Shop Now",
    siteLabel: "competitor-a.com/athletes",
    activeDays: 6,
    isVideo: true,
    gradient: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)",
    funnel: "top",
    format: "Video",
    lifespanDays: 28,
    angle: "Creator-style UGC",
  },
];

export const DEMO_SAVED_AD = {
  id: "saved-1",
  title: "curiosity • Hook: How brands execute growth strategy externally",
  body: "Revenue growth management analysis & brand study — long-running thought-leadership creative.",
  savedAt: "May 26, 2026",
  gradient: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #94a3b8 100%)",
} as const;

export const DEMO_STRATEGY_CELLS = [
  { platform: "Google", funnel: "TOF", ads: 214, spend: "€27.5k", activity: "High" },
  { platform: "Meta", funnel: "TOF", ads: 198, spend: "€31.2k", activity: "High" },
  { platform: "TikTok", funnel: "TOF", ads: 86, spend: "€8.4k", activity: "Testing" },
  { platform: "LinkedIn", funnel: "TOF", ads: 42, spend: "€4.1k", activity: "Low" },
  { platform: "Google", funnel: "MOF", ads: 156, spend: "€18.9k", activity: "High" },
  { platform: "Meta", funnel: "MOF", ads: 142, spend: "€22.1k", activity: "High" },
  { platform: "Google", funnel: "BOF", ads: 98, spend: "€14.2k", activity: "High" },
  { platform: "Meta", funnel: "BOF", ads: 112, spend: "€19.8k", activity: "High" },
  { platform: "Snapchat", funnel: "BOF", ads: 24, spend: "€2.8k", activity: "Testing" },
] as const;

const DEMO_PLATFORM_IDS: Record<(typeof DEMO_STRATEGY_CELLS)[number]["platform"], StrategyPlatform> = {
  Google: "google",
  Meta: "meta",
  TikTok: "tiktok",
  LinkedIn: "linkedin",
  Snapchat: "snapchat",
};

function parseSpendK(spend: string): number {
  const n = Number(spend.replace(/[€,k]/gi, "").trim());
  return Number.isFinite(n) ? n * 1000 : 0;
}

function demoFunnelCell(
  platformLabel: (typeof DEMO_STRATEGY_CELLS)[number]["platform"],
  funnel: FunnelStage,
  adCount: number,
  spend: string,
  activity: (typeof DEMO_STRATEGY_CELLS)[number]["activity"],
): FunnelCellNodePayload {
  const platform = DEMO_PLATFORM_IDS[platformLabel];
  const mid = parseSpendK(spend);
  const cellConfidence =
    activity === "High" ? "high" : activity === "Testing" ? "medium" : "low";
  return {
    id: `${platform}:${funnel}` as FunnelCellId,
    platform,
    label: platformLabel,
    funnelStage: funnel,
    adCount,
    estSpendEur: mid,
    estSpendEurLow: Math.round(mid * 0.82),
    estSpendEurHigh: Math.round(mid * 1.18),
    sampleAdIds: [],
    cellConfidence,
    position: { x: 0, y: 0 },
  };
}

export const DEMO_STRATEGY_MAP_FUNNEL_CELLS: FunnelCellNodePayload[] = DEMO_STRATEGY_CELLS.map((cell) =>
  demoFunnelCell(cell.platform, cell.funnel as FunnelStage, cell.ads, cell.spend, cell.activity),
);

/** Static strategy map payload for hero variant B — mirrors live Insights → Strategy Map. */
export const DEMO_STRATEGY_MAP: StrategyMapPayload = {
  title: `${DEMO_COMPETITOR.name} Full Funnel Strategy Map`,
  competitor: {
    name: DEMO_COMPETITOR.name,
    domain: DEMO_COMPETITOR.domain,
    logoUrl: null,
  },
  totalAdSpend: {
    value: 42000,
    low: 15000,
    high: 50000,
    currency: "EUR",
    unit: "month",
    confidence: "high",
    brandScaleScore: 3.2,
  },
  spendVsSimilar: "High",
  spendTrendline: [38, 42, 45, 48, 52, 55, 58, 62, 65, 68, 70, 68],
  audienceSignals: {
    interests: [
      "Brand-aware mass consumers 18–44",
      "Performance runners 25–40",
      "Young trendsetters on TikTok",
    ],
    ageRange: "18–44 primary",
    geo: "EU + US core markets",
    targetingType: ["Broad reach", "Interest clusters", "Retargeting"],
  },
  dominantFormat: { format: "Image", percentage: 38 },
  toneOfVoice: {
    primary: "Aspirational lifestyle",
    attributes: ["Aspirational", "Urgency", "Social proof"],
  },
  topAngles: [
    { angle: "Brand awareness / generic product", rank: 1 },
    { angle: "Hook ad — limited drop urgency", rank: 2 },
    { angle: "Social proof / reviews", rank: 3 },
  ],
  sidebarExtras: {
    formatMix: [
      { label: "Image", sharePct: 38 },
      { label: "Video", sharePct: 34 },
      { label: "Search", sharePct: 18 },
      { label: "Display", sharePct: 10 },
    ],
    angleCategories: [
      { label: "Brand", count: 142, sharePct: 38, category: "brand_awareness" },
      { label: "Product", count: 86, sharePct: 24, category: "product_push" },
      { label: "Discount", count: 41, sharePct: 11, category: "discount" },
    ],
    voiceConfidence: 0.84,
  },
  platformNodes: [],
  funnelCells: DEMO_STRATEGY_MAP_FUNNEL_CELLS,
  funnelEdges: [],
  activeAdCount: 530,
  platformCount: 5,
  derivationQuality: "high",
};

export const DEMO_ACTIVITY_FEED = {
  lastAnalyzed: "1w ago",
  snapshots: 28,
  windows: [
    { label: "Last 7 days", angles: 0, platform: 0, budget: 0, voice: 0 },
    { label: "Last 14 days", angles: 0, platform: 0, budget: 0, voice: 0 },
    { label: "Last 30 days", angles: 0, platform: 1, budget: 0, voice: 0 },
  ],
  quietMessage: "Quiet week — last change was 20 days ago.",
  earlier: [
    {
      id: "move-1",
      title: "Platform shift on Google",
      detail: "Competitor A increased Google Search spend share by 12% vs prior snapshot.",
      daysAgo: 20,
    },
  ],
} as const;

export const DEMO_CREATIVE_TESTS = [
  { date: "Mar 30, 2026", status: "running" as const, bars: [67, 66, 71], running: 1, total: 3 },
  { date: "Mar 23, 2026", status: "empty" as const },
  { date: "Mar 16, 2026", status: "empty" as const },
  { date: "Mar 9, 2026", status: "ended" as const, bars: [45] },
] as const;

export const DEMO_TIMELINE = {
  adsInView: 530,
  active: 65,
  retired: 465,
  longestRun: 492,
  launched30d: 79,
  rows: [
    { name: "Competitor A — spring launch", platform: "meta", status: "Active", days: 67, gradient: "linear-gradient(135deg, #1e3a5f, #4a7fa5)" },
    { name: "Competitor A — search capture", platform: "google", status: "Active", days: 42, gradient: "linear-gradient(135deg, #ecfdf5, #059669)" },
    { name: "Competitor A — outlet promo", platform: "google", status: "Retired", days: 28, gradient: "linear-gradient(135deg, #faf5ff, #7c3aed)" },
    { name: "Competitor A — style edit", platform: "pinterest", status: "Retired", days: 19, gradient: "linear-gradient(135deg, #fff1f2, #e11d48)" },
  ],
} as const;

export const DEMO_AUDIENCE = {
  primary: {
    title: "Brand-aware mass consumers 18–44 on Meta and Google",
    body: "Broad reach with performance undertones — heavy Meta prospecting paired with Google Search capture on product and category terms.",
    signals: ["68% of active ads target 18–44", "Meta + Google carry 88% of modeled spend", "Video share rising on TikTok tests"],
    adCount: 312,
  },
  secondary: [
    { title: "Young trendsetters 13–34 on TikTok and Snapchat", ads: 48, detail: "Short-form video, creator-style hooks" },
    { title: "Professionals 25–54 on LinkedIn", ads: 19, detail: "B2B-adjacent brand campaigns" },
  ],
  evolution: [
    { date: "Jun 7", segment: "Brand-aware mass 18–44", share: "62%" },
    { date: "May 25", segment: "Performance runners 25–40", share: "58%" },
    { date: "May 11", segment: "Performance runners 25–40", share: "54%" },
  ],
} as const;

export const DEMO_COPY_VAULT_ANGLES = [
  "Brand awareness / generic product",
  "Hook ad — limited drop urgency",
  "Social proof / reviews",
  "Membership / loyalty",
  "Outlet / discount",
] as const;

export const DEMO_COMPARISON = {
  themLabel: "Competitor A",
  youLabel: "Your Brand",
  metrics: [
    { label: "Avg ad age", them: "119d", you: "50d", verdict: "behind" as const },
    { label: "New ads (30d)", them: "140", you: "63", verdict: "ahead" as const },
    { label: "Video creative %", them: "20%", you: "28%", verdict: "behind" as const },
  ],
  budgetThem: { meta: 49, google: 28, tiktok: 12, pinterest: 6, snapchat: 5 },
  budgetYou: { meta: 44, google: 32, tiktok: 14, pinterest: 6, snapchat: 4 },
  angles: [
    { angle: "Brand awareness", themAds: 142, youAds: 98, tag: "testing" },
    { angle: "Product push", themAds: 86, youAds: 64, tag: "succeeding" },
    { angle: "Discount urgency", themAds: 41, youAds: 12, tag: "dormant" },
  ],
} as const;

export const DEMO_ALERTS = [
  {
    id: "alert-1",
    type: "New platform",
    title: "Competitor A launched on TikTok",
    detail: "First TikTok ads detected — 6 active creatives in the last scrape.",
    unread: true,
    daysAgo: 3,
  },
  {
    id: "alert-2",
    type: "Activity spike",
    title: "Meta refresh velocity up 34%",
    detail: "14 new Meta ads in the last 7 days vs prior week average.",
    unread: false,
    daysAgo: 8,
  },
] as const;
