import type { TimelineAd } from "@/components/competitor/tests-timeline/timeline-types";
import {
  DEMO_COMPETITOR,
  DEMO_OWN_BRAND,
} from "@/lib/demo/dashboard-demo-config";
import { FROZEN_TRACKED_PAGES } from "@/lib/demo/frozen/frozen-neptunas-website";
import type {
  FunnelCellId,
  FunnelCellNodePayload,
  FunnelStage,
  StrategyChannelSignals,
  StrategyJourneyGoal,
  StrategyMapPayload,
  StrategyPlatform,
} from "@/lib/strategy-overview/payload-types";

export { DEMO_COMPETITOR, DEMO_OWN_BRAND };

/** @deprecated Use `DEMO_OWN_BRAND` — kept for landing hero imports. */
export const DEMO_YOUR_BRAND = {
  name: DEMO_OWN_BRAND.name,
  domain: DEMO_OWN_BRAND.domain,
} as const;

export type DemoPlatform = "meta" | "google" | "tiktok" | "linkedin" | "pinterest" | "snapchat";

export const DEMO_PLATFORM_ACTIVE_COUNTS: Record<DemoPlatform, number> = {
  meta: 42,
  google: 28,
  tiktok: 8,
  linkedin: 6,
  pinterest: 4,
  snapchat: 3,
};

export const DEMO_PLATFORM_TOTAL_COUNTS: Record<DemoPlatform, number> = {
  meta: 58,
  google: 36,
  tiktok: 12,
  linkedin: 9,
  pinterest: 6,
  snapchat: 5,
};

export const DEMO_ACTIVITY_SCORE = {
  score: 64,
  tier: 4,
  tierLabel: "Mid-market",
  spend: "~€15K–€25K/mo in this market",
  confidence: "High confidence",
  topPercent: "TOP 12%",
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
  /** Local frozen preview — same asset in library, creative tests, and timeline. */
  creativeUrl?: string | null;
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
  {
    id: "linkedin-1",
    platform: "linkedin",
    pageName: "Competitor A",
    body: "How we cut CAC 22% in Q1 — the playbook our growth team used across paid social.",
    headline: "Case study: 22% lower CAC",
    linkDescription: "Read the breakdown",
    cta: "Learn more",
    siteLabel: "competitor-a.com/case-study",
    activeDays: 31,
    gradient: "linear-gradient(135deg, #0a66c2 0%, #004182 55%, #1e3a5f 100%)",
    funnel: "middle",
    format: "Image",
    lifespanDays: 48,
    angle: "Social proof",
  },
  {
    id: "linkedin-2",
    platform: "linkedin",
    pageName: "Competitor A",
    body: "Join 12,000+ marketers who get our weekly competitive intel brief.",
    headline: "Free competitive intel brief",
    linkDescription: "Subscribe",
    cta: "Sign up",
    siteLabel: "competitor-a.com/brief",
    activeDays: 19,
    gradient: "linear-gradient(135deg, #e8f4fc 0%, #0a66c2 100%)",
    funnel: "top",
    format: "Image",
    lifespanDays: 36,
    angle: "Lead gen",
  },
  {
    id: "linkedin-3",
    platform: "linkedin",
    pageName: "Competitor A",
    body: "Why we're betting on community-led growth in 2026 — insights from our CMO on brand, retention, and paid efficiency.",
    headline: "Community-led growth playbook",
    linkDescription: "Download the report",
    cta: "Download",
    siteLabel: "competitor-a.com/playbook",
    activeDays: 14,
    gradient: "linear-gradient(135deg, #1e3a5f 0%, #0a66c2 45%, #38bdf8 100%)",
    funnel: "middle",
    format: "Image",
    lifespanDays: 29,
    angle: "Thought leadership",
  },
  {
    id: "google-3",
    platform: "google",
    pageName: "Competitor A",
    body: "See how athletes train in our latest campaign — full collection inside.",
    headline: "Train like the pros — new season",
    linkDescription: "Watch on YouTube",
    cta: "Watch now",
    siteLabel: "youtube.com/competitor-a",
    activeDays: 12,
    isVideo: true,
    gradient: "linear-gradient(135deg, #0f0f0f 0%, #27272a 50%, #18181b 100%)",
    funnel: "top",
    format: "Video",
    lifespanDays: 42,
    angle: "Brand awareness",
  },
  {
    id: "pinterest-2",
    platform: "pinterest",
    pageName: "Competitor A",
    body: "Lightweight layers for early mornings — save this capsule wardrobe edit.",
    headline: "Summer training edit",
    linkDescription: "Shop the lookbook",
    cta: "Shop now",
    siteLabel: "competitor-a.com/summer",
    activeDays: 8,
    gradient: "linear-gradient(135deg, #fef3c7 0%, #fbbf24 50%, #d97706 100%)",
    funnel: "top",
    format: "Image",
    lifespanDays: 31,
    angle: "Lifestyle inspiration",
  },
  {
    id: "pinterest-3",
    platform: "pinterest",
    pageName: "Competitor A",
    body: "Members-only colorways dropping this week — join free for early access.",
    headline: "Early access colorways",
    linkDescription: "Join the program",
    cta: "Sign up",
    siteLabel: "competitor-a.com/join",
    activeDays: 5,
    gradient: "linear-gradient(135deg, #ede9fe 0%, #a78bfa 50%, #6d28d9 100%)",
    funnel: "middle",
    format: "Image",
    lifespanDays: 22,
    angle: "Membership hook",
  },
  {
    id: "tiktok-2",
    platform: "tiktok",
    pageName: "Competitor A",
    body: "POV: your recovery routine after a 10K. Hook → product → CTA in 12 seconds.",
    headline: "Recovery routine POV",
    linkDescription: "Shop recovery gear",
    cta: "Shop Now",
    siteLabel: "competitor-a.com/recovery",
    activeDays: 4,
    isVideo: true,
    gradient: "linear-gradient(135deg, #042f2e 0%, #0d9488 50%, #14b8a6 100%)",
    funnel: "middle",
    format: "Video",
    lifespanDays: 18,
    angle: "UGC hook",
  },
  {
    id: "tiktok-3",
    platform: "tiktok",
    pageName: "Competitor A",
    body: "3 outfit combos from one capsule collection — stitch this with your fav look.",
    headline: "Capsule outfit combos",
    linkDescription: "Shop the edit",
    cta: "Shop Now",
    siteLabel: "competitor-a.com/style",
    activeDays: 9,
    isVideo: true,
    gradient: "linear-gradient(135deg, #431407 0%, #ea580c 50%, #fb923c 100%)",
    funnel: "top",
    format: "Video",
    lifespanDays: 25,
    angle: "Creator-style UGC",
  },
  {
    id: "snapchat-1",
    platform: "snapchat",
    pageName: "Competitor A",
    body: "Limited drop ends Sunday — swipe up before sizes sell out.",
    headline: "Limited drop ends Sunday",
    linkDescription: "Shop the drop",
    cta: "Shop Now",
    siteLabel: "competitor-a.com/drop",
    activeDays: 3,
    gradient: "linear-gradient(135deg, #fef08a 0%, #facc15 50%, #eab308 100%)",
    funnel: "bottom",
    format: "Image",
    lifespanDays: 14,
    angle: "Discount urgency",
  },
  {
    id: "snapchat-2",
    platform: "snapchat",
    pageName: "Competitor A",
    body: "Behind the scenes: how we test cushioning on road and trail.",
    headline: "Cushioning lab BTS",
    linkDescription: "Watch the story",
    cta: "Learn more",
    siteLabel: "competitor-a.com/lab",
    activeDays: 7,
    isVideo: true,
    gradient: "linear-gradient(135deg, #09090b 0%, #27272a 50%, #52525b 100%)",
    funnel: "top",
    format: "Video",
    lifespanDays: 21,
    angle: "Product push",
  },
  {
    id: "snapchat-3",
    platform: "snapchat",
    pageName: "Competitor A",
    body: "Fresh colorways just dropped — tap through before your size is gone.",
    headline: "Fresh colorways just dropped",
    linkDescription: "Shop new colors",
    cta: "Shop Now",
    siteLabel: "competitor-a.com/new",
    activeDays: 5,
    gradient: "linear-gradient(135deg, #ecfccb 0%, #a3e635 50%, #65a30d 100%)",
    funnel: "middle",
    format: "Image",
    lifespanDays: 12,
    angle: "Product push",
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
  { platform: "Google", funnel: "TOF", ads: 44, spend: "€8.2k", activity: "Very High" },
  { platform: "Meta", funnel: "TOF", ads: 83, spend: "€14.6k", activity: "Very High" },
  { platform: "TikTok", funnel: "TOF", ads: 27, spend: "€3.8k", activity: "High" },
  { platform: "LinkedIn", funnel: "TOF", ads: 5, spend: "€0.9k", activity: "Low" },
  { platform: "Google", funnel: "MOF", ads: 34, spend: "€6.4k", activity: "High" },
  { platform: "Meta", funnel: "MOF", ads: 69, spend: "€11.2k", activity: "High" },
  { platform: "Pinterest", funnel: "MOF", ads: 7, spend: "€1.1k", activity: "Testing" },
  { platform: "LinkedIn", funnel: "MOF", ads: 2, spend: "€0.4k", activity: "Low" },
  { platform: "Meta", funnel: "BOF", ads: 56, spend: "€10.8k", activity: "High" },
  { platform: "LinkedIn", funnel: "BOF", ads: 6, spend: "€1.0k", activity: "Low" },
  { platform: "Snapchat", funnel: "BOF", ads: 29, spend: "€2.9k", activity: "Testing" },
] as const;

const DEMO_PLATFORM_IDS: Record<(typeof DEMO_STRATEGY_CELLS)[number]["platform"], StrategyPlatform> = {
  Google: "google",
  Meta: "meta",
  TikTok: "tiktok",
  LinkedIn: "linkedin",
  Pinterest: "pinterest",
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
    activity === "Very High" || activity === "High"
      ? "high"
      : activity === "Testing"
        ? "medium"
        : "low";
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

/** Organic + email layer for demo strategy maps (rail above TOF, capture below BOF). */
export const DEMO_STRATEGY_CHANNEL_SIGNALS: StrategyChannelSignals = {
  version: 1,
  computedAt: "2026-07-14T12:00:00.000Z",
  organicNodes: [
    {
      id: "organic:facebook",
      platform: "facebook",
      label: "Facebook",
      postCount: 63,
      postsPerWeek: 4.1,
      avgEngagement: 378,
      lastPostAt: "2026-07-13T09:00:00.000Z",
      topThemes: ["Community drops", "Athlete stories"],
      pairedPaidPlatform: "meta",
    },
    {
      id: "organic:youtube",
      platform: "youtube",
      label: "YouTube",
      postCount: 46,
      postsPerWeek: 2.8,
      avgEngagement: 12700,
      lastPostAt: "2026-07-12T16:00:00.000Z",
      topThemes: ["Training tips", "Product launches"],
      pairedPaidPlatform: "google",
    },
    {
      id: "organic:linkedin",
      platform: "linkedin",
      label: "LinkedIn",
      postCount: 26,
      postsPerWeek: 1.6,
      avgEngagement: 1200,
      lastPostAt: "2026-07-11T11:00:00.000Z",
      topThemes: ["Brand partnerships", "Sustainability"],
      pairedPaidPlatform: "linkedin",
    },
    {
      id: "organic:tiktok",
      platform: "tiktok",
      label: "TikTok",
      postCount: 28,
      postsPerWeek: 3.4,
      avgEngagement: 28900,
      lastPostAt: "2026-07-14T08:00:00.000Z",
      topThemes: ["Hook tests", "UGC formats"],
      pairedPaidPlatform: "tiktok",
    },
  ],
  emailNode: {
    id: "email",
    label: "Email",
    emailCount: 24,
    emailsPerWeek: 2.5,
    dominantType: "promotional",
    dominantAngle: "Flash sales & winback",
    offerSharePct: 45,
    lastEmailAt: "2026-07-14T09:41:00.000Z",
    espDetected: "Klaviyo",
  },
  channelEdges: [
    {
      from: "organic:facebook",
      to: "meta:TOF",
      kind: "organic_to_paid",
      confidence: 0.82,
      reasoning:
        "Facebook organic (63 posts, ~378 avg engagement) warms the audience their paid Meta ads retarget.",
      style: "solid",
    },
    {
      from: "organic:youtube",
      to: "google:TOF",
      kind: "organic_to_paid",
      confidence: 0.76,
      reasoning: "YouTube long-form content feeds Google/YouTube search and demand-gen TOF.",
      style: "solid",
    },
    {
      from: "organic:linkedin",
      to: "linkedin:TOF",
      kind: "organic_to_paid",
      confidence: 0.71,
      reasoning: "LinkedIn thought-leadership posts align with B2B-style TOF tests on the same platform.",
      style: "dashed",
    },
    {
      from: "organic:tiktok",
      to: "tiktok:TOF",
      kind: "organic_to_paid",
      confidence: 0.79,
      reasoning: "TikTok hooks from organic are reposted into paid TOF creative tests.",
      style: "solid",
    },
    {
      from: "meta:BOF",
      to: "email",
      kind: "paid_to_email",
      confidence: 0.84,
      reasoning:
        "Bottom-funnel Meta traffic feeds the email list — promos mirror paid offer angles and checkout paths.",
      style: "solid",
    },
    {
      from: "snapchat:BOF",
      to: "email",
      kind: "paid_to_email",
      confidence: 0.68,
      reasoning: "Snapchat BOF youth promos drive list growth alongside site retargeting.",
      style: "dashed",
    },
  ],
};

export const DEMO_STRATEGY_JOURNEY_GOAL: StrategyJourneyGoal = {
  version: 1,
  computedAt: "2026-07-14T12:00:00.000Z",
  kind: "purchase",
  label: "Purchase on site",
  subtitle: "4 key landing pages",
  catalogBreadth: "catalog",
  catalogLabel: "Multi-category storefront",
  topDestinations: [
    {
      url: `https://${DEMO_COMPETITOR.domain}/`,
      displayUrl: `${DEMO_COMPETITOR.domain}/`,
      adCount: 38,
      sharePct: 67,
    },
    {
      url: `https://${DEMO_COMPETITOR.domain}/sale`,
      displayUrl: `${DEMO_COMPETITOR.domain}/sale`,
      adCount: 24,
      sharePct: 18,
    },
    {
      url: `https://${DEMO_COMPETITOR.domain}/running`,
      displayUrl: `${DEMO_COMPETITOR.domain}/running`,
      adCount: 11,
      sharePct: 11,
    },
    {
      url: `https://shop.${DEMO_COMPETITOR.domain}/`,
      displayUrl: `shop.${DEMO_COMPETITOR.domain}/`,
      adCount: 6,
      sharePct: 4,
    },
  ],
  goalEdges: [
    {
      from: "meta:BOF",
      to: "goal",
      kind: "bof_to_goal",
      pathIntent: "discount_sale",
      pathIntentLabel: "Discount sale",
      alignment: "direct",
      confidence: 0.88,
      reasoning: "Meta BOF promos push sale landing pages with urgency and checkout CTAs.",
      style: "solid",
    },
    {
      from: "snapchat:BOF",
      to: "goal",
      kind: "bof_to_goal",
      pathIntent: "discount_sale",
      pathIntentLabel: "Discount sale",
      alignment: "direct",
      confidence: 0.74,
      reasoning: "Snapchat BOF promos route to sale landing pages with urgency hooks.",
      style: "dashed",
    },
    {
      from: "linkedin:BOF",
      to: "goal",
      kind: "bof_to_goal",
      pathIntent: "direct_sale",
      pathIntentLabel: "Direct sale",
      alignment: "direct",
      confidence: 0.71,
      reasoning: "LinkedIn BOF ads drive B2B-style product pages on the main storefront.",
      style: "dashed",
    },
    {
      from: "email",
      to: "goal",
      kind: "email_to_goal",
      pathIntent: "retargeting",
      pathIntentLabel: "Email retargeting",
      alignment: "supporting",
      confidence: 0.8,
      reasoning: "Email promos echo paid offer angles and drive return visits to checkout.",
      style: "solid",
    },
  ],
  pathIntentBreakdown: [
    { intent: "discount_sale", label: "Discount sale", pathCount: 3, sharePct: 75 },
    { intent: "direct_sale", label: "Direct sale", pathCount: 1, sharePct: 25 },
  ],
  evidence: {
    narrative:
      "Most conversion traffic is direct-sale BOF → Purchase on site. 91 BOF ads; primary destination competitor-a.com/. Paths split between discount sale and direct sale; email promos echo paid offer angles (30% off, free shipping). Messaging mixes brand, mixed themes, and curiosity hooks.",
    deals: [
      { label: "30% off seasonal sale", source: "ad", code: "SAVE30", channel: "meta" },
      { label: "Free shipping weekend", source: "email", code: null, channel: "email" },
    ],
    categories: [
      { label: "Collection page", url: null, adCount: 28, sharePct: 34 },
      { label: "Footwear", url: null, adCount: 22, sharePct: 27 },
      { label: "Apparel", url: null, adCount: 18, sharePct: 22 },
    ],
    topCreatives: [
      {
        adId: "meta-3",
        platform: "meta",
        imageUrl: null,
        headline: "Back in stock",
        angle: "Product push",
        landingUrl: `${DEMO_COMPETITOR.domain}/shoes`,
      },
      {
        adId: "meta-2",
        platform: "meta",
        imageUrl: null,
        headline: "Early access ends Sunday",
        angle: "Discount urgency",
        landingUrl: `${DEMO_COMPETITOR.domain}/sale`,
      },
      {
        adId: "snapchat-1",
        platform: "snapchat",
        imageUrl: null,
        headline: "Limited drop ends Sunday",
        angle: "Scarcity",
        landingUrl: `${DEMO_COMPETITOR.domain}/new`,
      },
      {
        adId: "linkedin-1",
        platform: "linkedin",
        imageUrl: null,
        headline: "Performance gear for teams",
        angle: "B2B catalog",
        landingUrl: `${DEMO_COMPETITOR.domain}/`,
      },
    ],
    landingPreviews: [
      {
        url: `https://${DEMO_COMPETITOR.domain}/`,
        displayUrl: `${DEMO_COMPETITOR.domain}/`,
        adCount: 38,
        sharePct: 67,
        categoryLabel: null,
        previewImageUrl: null,
        platforms: ["meta", "linkedin"],
      },
      {
        url: `https://${DEMO_COMPETITOR.domain}/sale`,
        displayUrl: `${DEMO_COMPETITOR.domain}/sale`,
        adCount: 24,
        sharePct: 18,
        categoryLabel: "Sale hub",
        previewImageUrl: null,
        platforms: ["meta", "snapchat"],
      },
      {
        url: `https://${DEMO_COMPETITOR.domain}/running`,
        displayUrl: `${DEMO_COMPETITOR.domain}/running`,
        adCount: 11,
        sharePct: 11,
        categoryLabel: "Running",
        previewImageUrl: null,
        platforms: ["meta"],
      },
      {
        url: `https://shop.${DEMO_COMPETITOR.domain}/`,
        displayUrl: `shop.${DEMO_COMPETITOR.domain}/`,
        adCount: 6,
        sharePct: 4,
        categoryLabel: "Collection page",
        previewImageUrl: null,
        platforms: ["snapchat"],
      },
    ],
    angleHighlights: ["Brand", "Mixed themes", "Curiosity"],
    emailOfferSummary: "2 of 9 captured emails contain explicit offers",
  },
  journeySummary: "Organic → Discount sale + Direct sale → Email → Purchase on site",
  macroFraming:
    "Different channel roles (discount sale, direct sale) roll up to one outcome: purchase on site.",
  signals: ["BOF-heavy Meta spend", "Aligned email promos", "Single-domain checkout focus"],
  confidence: 0.89,
};

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
  activeAdCount: 362,
  platformCount: 6,
  derivationQuality: "high",
};

export type DemoCreativeTestStatus =
  | "running"
  | "winner_identified"
  | "all_killed_fast"
  | "no_clear_winner";

export type DemoCreativeTestAd = {
  id: string;
  platform: string;
  ad_creative_url: string | null;
  archived_creative_url?: string | null;
  ad_text: string;
  ai_extracted_angle: string | null;
  first_seen_at: string;
  last_seen_at: string;
  format: string;
};

export type DemoCreativeTest = {
  id: string;
  launch_date: string;
  platform: string;
  ad_ids: string[];
  winner_ad_id: string | null;
  test_status: DemoCreativeTestStatus;
  median_lifespan_days: number;
  max_lifespan_days: number;
  winner_lifespan_days: number | null;
  ad_count: number;
  ads: DemoCreativeTestAd[];
};

function demoCreativeTestAd(
  id: string,
  platform: string,
  text: string,
  firstSeen: string,
  lastSeen: string,
  format: string,
): DemoCreativeTestAd {
  return {
    id,
    platform,
    ad_creative_url: null,
    ad_text: text,
    ai_extracted_angle: null,
    first_seen_at: firstSeen,
    last_seen_at: lastSeen,
    format,
  };
}

/** Inline creative-test rows shown in the demo. Filter pill counts derive from this list. */
export const DEMO_CREATIVE_TESTS: DemoCreativeTest[] = [
  {
    id: "ct-1",
    launch_date: "2026-06-29",
    platform: "meta",
    ad_ids: ["ct-1-a", "ct-1-b", "ct-1-c"],
    winner_ad_id: null,
    test_status: "running",
    median_lifespan_days: 12,
    max_lifespan_days: 16,
    winner_lifespan_days: null,
    ad_count: 3,
    ads: [
      demoCreativeTestAd(
        "ct-1-a",
        "meta",
        "Train harder. Recover faster. — spring launch variant A",
        "2026-06-29T12:00:00.000Z",
        "2026-07-14T12:00:00.000Z",
        "Image",
      ),
      demoCreativeTestAd(
        "ct-1-b",
        "meta",
        "Train harder. Recover faster. — spring launch variant B",
        "2026-06-29T12:00:00.000Z",
        "2026-07-13T12:00:00.000Z",
        "Image",
      ),
      demoCreativeTestAd(
        "ct-1-c",
        "meta",
        "Train harder. Recover faster. — spring launch variant C",
        "2026-06-29T12:00:00.000Z",
        "2026-07-10T12:00:00.000Z",
        "Video",
      ),
    ],
  },
  {
    id: "ct-2",
    launch_date: "2026-06-22",
    platform: "meta",
    ad_ids: ["ct-2-a", "ct-2-b"],
    winner_ad_id: null,
    test_status: "running",
    median_lifespan_days: 18,
    max_lifespan_days: 21,
    winner_lifespan_days: null,
    ad_count: 2,
    ads: [
      demoCreativeTestAd(
        "ct-2-a",
        "meta",
        "Early access ends Sunday — members-only colorways",
        "2026-06-22T12:00:00.000Z",
        "2026-07-14T12:00:00.000Z",
        "Video",
      ),
      demoCreativeTestAd(
        "ct-2-b",
        "meta",
        "Early access ends Sunday — join free today",
        "2026-06-22T12:00:00.000Z",
        "2026-07-12T12:00:00.000Z",
        "Image",
      ),
    ],
  },
  {
    id: "ct-3",
    launch_date: "2026-06-17",
    platform: "google",
    ad_ids: ["ct-3-a", "ct-3-b"],
    winner_ad_id: null,
    test_status: "running",
    median_lifespan_days: 0,
    max_lifespan_days: 0,
    winner_lifespan_days: null,
    ad_count: 2,
    ads: [
      demoCreativeTestAd(
        "ct-3-a",
        "google",
        "Running shoes — official store",
        "2026-06-17T12:00:00.000Z",
        "2026-07-14T12:00:00.000Z",
        "Search",
      ),
      demoCreativeTestAd(
        "ct-3-b",
        "google",
        "Compare top-rated trainers side by side",
        "2026-06-17T12:00:00.000Z",
        "2026-07-14T12:00:00.000Z",
        "Search",
      ),
    ],
  },
  {
    id: "ct-4",
    launch_date: "2026-06-15",
    platform: "tiktok",
    ad_ids: ["ct-4-a", "ct-4-b", "ct-4-c"],
    winner_ad_id: null,
    test_status: "running",
    median_lifespan_days: 26,
    max_lifespan_days: 29,
    winner_lifespan_days: null,
    ad_count: 3,
    ads: [
      demoCreativeTestAd(
        "ct-4-a",
        "tiktok",
        "Train like the pros — hook variant A",
        "2026-06-15T12:00:00.000Z",
        "2026-07-14T12:00:00.000Z",
        "Video",
      ),
      demoCreativeTestAd(
        "ct-4-b",
        "tiktok",
        "Train like the pros — hook variant B",
        "2026-06-15T12:00:00.000Z",
        "2026-07-11T12:00:00.000Z",
        "Video",
      ),
      demoCreativeTestAd(
        "ct-4-c",
        "tiktok",
        "Train like the pros — hook variant C",
        "2026-06-15T12:00:00.000Z",
        "2026-07-09T12:00:00.000Z",
        "Video",
      ),
    ],
  },
  {
    id: "ct-5",
    launch_date: "2026-06-05",
    platform: "meta",
    ad_ids: ["ct-5-a", "ct-5-b"],
    winner_ad_id: null,
    test_status: "running",
    median_lifespan_days: 22,
    max_lifespan_days: 28,
    winner_lifespan_days: null,
    ad_count: 2,
    ads: [
      demoCreativeTestAd(
        "ct-5-a",
        "meta",
        "Back in stock — lightweight cushioning for road and trail",
        "2026-06-05T12:00:00.000Z",
        "2026-07-14T12:00:00.000Z",
        "Image",
      ),
      demoCreativeTestAd(
        "ct-5-b",
        "meta",
        "Back in stock — free shipping over €50",
        "2026-06-05T12:00:00.000Z",
        "2026-07-02T12:00:00.000Z",
        "Image",
      ),
    ],
  },
  {
    id: "ct-6",
    launch_date: "2026-06-03",
    platform: "pinterest",
    ad_ids: ["ct-6-a", "ct-6-b"],
    winner_ad_id: null,
    test_status: "running",
    median_lifespan_days: 19,
    max_lifespan_days: 24,
    winner_lifespan_days: null,
    ad_count: 2,
    ads: [
      demoCreativeTestAd(
        "ct-6-a",
        "pinterest",
        "Race day outfit ideas — pin variant A",
        "2026-06-03T12:00:00.000Z",
        "2026-07-14T12:00:00.000Z",
        "Image",
      ),
      demoCreativeTestAd(
        "ct-6-b",
        "pinterest",
        "Race day outfit ideas — pin variant B",
        "2026-06-03T12:00:00.000Z",
        "2026-06-27T12:00:00.000Z",
        "Image",
      ),
    ],
  },
  {
    id: "ct-7",
    launch_date: "2026-05-20",
    platform: "meta",
    ad_ids: ["ct-7-a", "ct-7-b", "ct-7-c"],
    winner_ad_id: "ct-7-b",
    test_status: "winner_identified",
    median_lifespan_days: 21,
    max_lifespan_days: 48,
    winner_lifespan_days: 48,
    ad_count: 3,
    ads: [
      demoCreativeTestAd(
        "ct-7-a",
        "meta",
        "New season drop — performance fabrics",
        "2026-05-20T12:00:00.000Z",
        "2026-06-10T12:00:00.000Z",
        "Image",
      ),
      demoCreativeTestAd(
        "ct-7-b",
        "meta",
        "New season drop — free returns on all orders",
        "2026-05-20T12:00:00.000Z",
        "2026-07-07T12:00:00.000Z",
        "Image",
      ),
      demoCreativeTestAd(
        "ct-7-c",
        "meta",
        "New season drop — shop the latest collection",
        "2026-05-20T12:00:00.000Z",
        "2026-06-08T12:00:00.000Z",
        "Video",
      ),
    ],
  },
  {
    id: "ct-8",
    launch_date: "2026-05-08",
    platform: "tiktok",
    ad_ids: ["ct-8-a", "ct-8-b"],
    winner_ad_id: null,
    test_status: "all_killed_fast",
    median_lifespan_days: 4,
    max_lifespan_days: 6,
    winner_lifespan_days: null,
    ad_count: 2,
    ads: [
      demoCreativeTestAd(
        "ct-8-a",
        "tiktok",
        "Capsule outfit combos — creator hook A",
        "2026-05-08T12:00:00.000Z",
        "2026-05-12T12:00:00.000Z",
        "Video",
      ),
      demoCreativeTestAd(
        "ct-8-b",
        "tiktok",
        "Capsule outfit combos — creator hook B",
        "2026-05-08T12:00:00.000Z",
        "2026-05-14T12:00:00.000Z",
        "Video",
      ),
    ],
  },
  {
    id: "ct-9",
    launch_date: "2026-04-18",
    platform: "meta",
    ad_ids: ["ct-9-a", "ct-9-b", "ct-9-c"],
    winner_ad_id: null,
    test_status: "no_clear_winner",
    median_lifespan_days: 26,
    max_lifespan_days: 31,
    winner_lifespan_days: null,
    ad_count: 3,
    ads: [
      demoCreativeTestAd(
        "ct-9-a",
        "meta",
        "Outlet prices on last season styles — variant A",
        "2026-04-18T12:00:00.000Z",
        "2026-05-19T12:00:00.000Z",
        "Image",
      ),
      demoCreativeTestAd(
        "ct-9-b",
        "meta",
        "Outlet prices on last season styles — variant B",
        "2026-04-18T12:00:00.000Z",
        "2026-05-17T12:00:00.000Z",
        "Image",
      ),
      demoCreativeTestAd(
        "ct-9-c",
        "meta",
        "Outlet prices on last season styles — variant C",
        "2026-04-18T12:00:00.000Z",
        "2026-05-20T12:00:00.000Z",
        "Video",
      ),
    ],
  },
];

export function demoCreativeTestsSummary(tests: readonly DemoCreativeTest[] = DEMO_CREATIVE_TESTS) {
  let winnerIdentified = 0;
  let running = 0;
  let allKilledFast = 0;
  let noClearWinner = 0;
  for (const test of tests) {
    switch (test.test_status) {
      case "winner_identified":
        winnerIdentified += 1;
        break;
      case "running":
        running += 1;
        break;
      case "all_killed_fast":
        allKilledFast += 1;
        break;
      case "no_clear_winner":
        noClearWinner += 1;
        break;
    }
  }
  return {
    total: tests.length,
    winnerIdentified,
    running,
    allKilledFast,
    noClearWinner,
  };
}

export const DEMO_CREATIVE_TESTS_SUMMARY = demoCreativeTestsSummary();

function demoTimelineAd(
  id: string,
  platform: string,
  text: string,
  headline: string,
  firstSeen: string,
  lastSeen: string,
  format: string,
  killed: boolean,
  isWinner = false,
): TimelineAd {
  return {
    id,
    platform,
    ad_creative_url: null,
    ad_text: text || headline,
    ai_extracted_angle: null,
    first_seen_at: firstSeen,
    last_seen_at: lastSeen,
    format,
    is_winner: isWinner,
    is_killed: killed,
  };
}

/** Static timeline ads for demo gantt — dates relative to Jul 2026 scrape window. */
export const DEMO_TIMELINE_ADS: TimelineAd[] = [
  ...[0, 1, 2, 3, 4].map((i) =>
    demoTimelineAd(
      `meta-cal-${i}`,
      "meta",
      "AI can now count your calories—just scan your plate. Free trial inside.",
      "AI can now count your calorie…",
      "2026-06-04T12:00:00.000Z",
      i % 2 === 0 ? "2026-07-02T12:00:00.000Z" : "2026-06-30T12:00:00.000Z",
      "Video",
      true,
    ),
  ),
  demoTimelineAd(
    "meta-1",
    "meta",
    DEMO_ADS[0]!.body,
    DEMO_ADS[0]!.headline,
    "2026-05-09T12:00:00.000Z",
    "2026-07-14T12:00:00.000Z",
    "Image",
    false,
  ),
  demoTimelineAd(
    "meta-2",
    "meta",
    DEMO_ADS[1]!.body,
    DEMO_ADS[1]!.headline,
    "2026-06-03T12:00:00.000Z",
    "2026-07-14T12:00:00.000Z",
    "Video",
    false,
  ),
  demoTimelineAd(
    "google-1",
    "google",
    DEMO_ADS[3]!.body,
    DEMO_ADS[3]!.headline,
    "2026-03-16T12:00:00.000Z",
    "2026-07-14T12:00:00.000Z",
    "Search",
    false,
    true,
  ),
  demoTimelineAd(
    "google-2",
    "google",
    DEMO_ADS[4]!.body,
    DEMO_ADS[4]!.headline,
    "2026-05-28T12:00:00.000Z",
    "2026-06-25T12:00:00.000Z",
    "Display",
    true,
  ),
  demoTimelineAd(
    "pinterest-1",
    "pinterest",
    DEMO_ADS[5]!.body,
    DEMO_ADS[5]!.headline,
    "2026-04-22T12:00:00.000Z",
    "2026-06-10T12:00:00.000Z",
    "Image",
    true,
  ),
  demoTimelineAd(
    "tiktok-1",
    "tiktok",
    DEMO_ADS[6]!.body,
    DEMO_ADS[6]!.headline,
    "2026-06-17T12:00:00.000Z",
    "2026-07-14T12:00:00.000Z",
    "Video",
    false,
  ),
  demoTimelineAd(
    "linkedin-1",
    "linkedin",
    DEMO_ADS[7]!.body,
    DEMO_ADS[7]!.headline,
    "2026-05-01T12:00:00.000Z",
    "2026-07-01T12:00:00.000Z",
    "Image",
    true,
  ),
  demoTimelineAd(
    "snapchat-1",
    "snapchat",
    DEMO_ADS[15]!.body,
    DEMO_ADS[15]!.headline,
    "2026-06-28T12:00:00.000Z",
    "2026-07-14T12:00:00.000Z",
    "Image",
    false,
  ),
];

export const DEMO_TIMELINE_DATE_RANGE = {
  earliest: "2026-03-01T00:00:00.000Z",
  latest: "2026-07-15T12:00:00.000Z",
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
  themLabel: "Adidas",
  youLabel: "Nike",
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

/** Looped toast copy for the hero product demo — cycles every 4s. */
export const DEMO_LIVE_NOTIFICATIONS = [
  {
    id: "live-1",
    type: "New ads",
    title: "8 new Meta ads detected",
    detail: "Fresh creatives added in the last scrape — mostly TOFU video.",
  },
  {
    id: "live-2",
    type: "New platform",
    title: "Competitor A launched on TikTok",
    detail: "6 active TikTok ads found for the first time.",
  },
  {
    id: "live-3",
    type: "Spend shift",
    title: "Google Search share up 12%",
    detail: "More budget moving into search capture vs last snapshot.",
  },
  {
    id: "live-4",
    type: "Landing page",
    title: "New /spring-sale page live",
    detail: "14 active ads now point to the new landing page.",
  },
  {
    id: "live-5",
    type: "Ad killed",
    title: "4 Pinterest ads retired",
    detail: "Style-edit promos ended after a 19-day run.",
  },
  {
    id: "live-6",
    type: "Format shift",
    title: "Video share up 22% on Meta",
    detail: "More Reels-style creatives vs image statics this week.",
  },
  {
    id: "live-7",
    type: "Funnel move",
    title: "3 new BOFU retargeting ads",
    detail: "Bottom-funnel offers added on Meta and Google.",
  },
  {
    id: "live-8",
    type: "Angle test",
    title: "Discount urgency angle testing",
    detail: "5 new limited-time hooks spotted across Meta.",
  },
  {
    id: "live-9",
    type: "Activity spike",
    title: "Meta refresh velocity up 34%",
    detail: "14 new Meta ads in 7 days vs prior week average.",
  },
  {
    id: "live-10",
    type: "Score change",
    title: "Activity score rose to 68/100",
    detail: "Tier 4 — stronger creative diversity across platforms.",
  },
] as const;

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

export type DemoOrganicPlatform = "instagram" | "tiktok" | "youtube" | "linkedin";

export const DEMO_ORGANIC_POSTS = [
  {
    id: "ig-1",
    platform: "instagram" as const,
    content: "Summer training edit — lightweight layers built for early mornings. Save this look.",
    likes: 2840,
    comments: 142,
    postedAt: "2d ago",
    gradient: "linear-gradient(135deg, #fdf2f8 0%, #f472b6 50%, #db2777 100%)",
  },
  {
    id: "ig-2",
    platform: "instagram" as const,
    content: "Behind the scenes: how we test cushioning on road and trail in one shoe.",
    likes: 1920,
    comments: 88,
    postedAt: "5d ago",
    gradient: "linear-gradient(135deg, #eff6ff 0%, #60a5fa 50%, #1d4ed8 100%)",
  },
  {
    id: "tt-1",
    platform: "tiktok" as const,
    content: "POV: your recovery routine after a 10K. Hook → product → CTA in 12 seconds.",
    likes: 18400,
    comments: 312,
    views: 248000,
    postedAt: "1d ago",
    gradient: "linear-gradient(135deg, #0f172a 0%, #334155 50%, #64748b 100%)",
  },
  {
    id: "tt-2",
    platform: "tiktok" as const,
    content: "3 outfit combos from one capsule collection — stitch this with your fav look.",
    likes: 9200,
    comments: 201,
    views: 112000,
    postedAt: "4d ago",
    gradient: "linear-gradient(135deg, #fef3c7 0%, #f59e0b 50%, #b45309 100%)",
  },
] as const;

export const DEMO_ORGANIC_INSIGHTS = {
  avgLikes: 1284,
  avgComments: 86,
  postsPerWeek: 3.2,
  bestPlatform: "Instagram",
  working: [
    { summary: "Recovery / routine hooks outperform product-only posts", why: "3 of top 5 posts use morning routine framing" },
    { summary: "Carousel edits drive 2.1× saves vs single images", why: "Save rate highest on multi-slide training tips" },
  ],
  flopping: [
    { summary: "Static product shots without human motion underperform", why: "Avg engagement 62% below channel baseline" },
  ],
  collaborators: [
    { handle: "@coach.mila", platform: "Instagram", posts: 4, tags: ["Athlete", "UGC"] },
    { handle: "@runclub.eu", platform: "TikTok", posts: 2, tags: ["Community"] },
  ],
} as const;

export const DEMO_ORGANIC_HANDLES = {
  instagram: "@adidas",
  tiktok: "@adidas",
  youtube: "@adidas",
  linkedin: "adidas",
  x: "@adidas",
  facebook: "adidas",
} as const;

export const DEMO_TRACKED_PAGES = FROZEN_TRACKED_PAGES.map((page) => ({
  ...page,
  gradient: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
}));

export const DEMO_LANDING_PAGES_FROM_ADS = DEMO_LANDING_PAGES.map((lp) => ({
  ...lp,
  adsPreview: DEMO_ADS.filter((ad) => ad.siteLabel.includes(lp.url.split("/")[0] ?? "")).slice(0, 3),
}));

export const DEMO_WEBSITE_CHANGES = [
  {
    id: "wc-1",
    label: "Spring sale",
    url: "competitor-a.com/sale",
    status: "Permanent",
    takenAt: "3 days ago",
    hint: "Hero headline and primary CTA updated — stronger urgency language.",
    sections: ["Hero headline", "Primary CTA"],
  },
  {
    id: "wc-2",
    label: "Membership join",
    url: "competitor-a.com/join",
    status: "A/B test",
    takenAt: "1 week ago",
    hint: "Two hero variants detected — benefit-led vs social-proof-led.",
    sections: ["Hero image", "Offer block"],
  },
] as const;

export {
  DEMO_EMAILS,
  DEMO_EMAIL_TRACKER_ADDRESS,
  buildDemoEmailInsights,
} from "@/lib/demo/demo-email-insights-payload";
