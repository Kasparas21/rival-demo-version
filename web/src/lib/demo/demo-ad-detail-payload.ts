import type { AdPreviewAnalysis } from "@/lib/ad-detail/ad-ai-analysis-types";
import { putAdDetailSeed, setCachedAdDetail, type AdDetailOpenSeed } from "@/lib/ad-detail/ad-detail-cache";
import type { AdDetailDrawerPayload } from "@/lib/ad-detail/ad-detail-types";
import type { DemoAd } from "@/lib/demo/dashboard-demo-data";
import { DEMO_COMPETITOR, DEMO_OWN_BRAND } from "@/lib/demo/dashboard-demo-config";

const DAY_MS = 24 * 60 * 60 * 1000;
const DEMO_NOW = new Date("2026-07-15T12:00:00.000Z");

const MEDIUM_DATE: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  year: "numeric",
};

function formatIsoDateFromMs(ms: number): string {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatMediumDateFromMs(ms: number): string {
  return new Date(ms).toLocaleDateString("en-US", MEDIUM_DATE);
}

function demoCreativeBase(ad: DemoAd): Record<string, unknown> {
  return {
    demo_gradient: ad.gradient,
    demo_is_video: Boolean(ad.isVideo),
    demo_frozen_creative_url: ad.creativeUrl ?? null,
    headline: ad.headline,
    desc: ad.body,
    linkDescription: ad.linkDescription,
    linkHeadline: ad.headline,
    pageName: ad.pageName,
    destinationUrl: `https://${ad.siteLabel}`,
  };
}

function funnelLabel(funnel?: DemoAd["funnel"]): string | null {
  if (funnel === "top") return "TOF";
  if (funnel === "middle") return "MOF";
  if (funnel === "bottom") return "BOF";
  return null;
}

function buildDisplayLabel(ad: DemoAd): string {
  const angle = ad.angle ?? "Brand awareness";
  const hook = ad.headline.trim() || "Creative hook";
  return `${angle} · Hook: ${hook.length > 48 ? `${hook.slice(0, 45)}…` : hook}`;
}

function buildDemoPreviewAnalysis(ad: DemoAd): AdPreviewAnalysis {
  const hook = ad.headline;
  const angle = ad.angle ?? "Brand awareness";

  return {
    psychological_scores: {
      empowerment: ad.funnel === "bottom" ? 72 : 58,
      urgency: ad.funnel === "bottom" ? 48 : 12,
      security: 24,
      authority: ad.platform === "linkedin" ? 78 : 62,
      esteem: 76,
      engagement: ad.isVideo ? 54 : 28,
    },
    content_style: {
      label:
        ad.funnel === "bottom"
          ? "Offer / conversion push"
          : ad.funnel === "middle"
            ? "Consideration / proof"
            : "Social proof / brand affinity",
      description:
        ad.funnel === "bottom"
          ? "Leads with product availability or incentive, then reinforces trust before the purchase CTA."
          : "Leans on brand recognition and lifestyle framing to make the product feel desirable before the click.",
    },
    creative_targeting: {
      summary: `Performance-minded shoppers 18–44 on ${ad.platform === "meta" ? "Meta" : ad.platform} who respond to ${angle.toLowerCase()} messaging.`,
      audience_segments: [
        `${ad.pageName} loyalists`,
        "Runners & training enthusiasts",
        ad.funnel === "bottom" ? "High-intent buyers" : "Style-conscious prospects",
      ],
    },
    persona: {
      age_range: "18–44",
      gender: "unisex",
      psychographics: "Style-conscious, active, values quality and recognizable sportswear brands",
    },
    funnel_stage: funnelLabel(ad.funnel),
    marketing_angle: angle,
    offer_mechanics:
      ad.funnel === "bottom"
        ? "Direct product link with urgency or stock framing"
        : "Brand-led story with soft product mention and explore CTA",
    emotional_drivers: ["aspiration", "belonging", "confidence"],
    persuasion_triggers: [
      "social proof (recognizable brand)",
      "authority (heritage sportswear)",
      ad.isVideo ? "movement / energy (video)" : "visual desire (lifestyle creative)",
    ],
    scroll_stopper: hook,
    visual_storytelling: ad.isVideo
      ? "Vertical motion creative with product-in-use framing and bold headline overlay."
      : "Clean lifestyle gradient creative emphasizing product color and performance cues.",
    competitive_moats: ["brand recognition", "heritage storytelling"],
    risk_flags:
      ad.funnel === "top"
        ? ["low urgency", "may feel generic without stronger hook"]
        : ["offer fatigue if repeated too often"],
    adaptation_playbook: [
      "For a premium DTC brand: swap heritage language with creator testimonials or limited drops.",
      "For a sportswear rival: anchor on performance proof points or athlete endorsements.",
      "For a budget challenger: lead with price/value and everyday wearability.",
      "For a sustainability brand: replace style upgrade framing with impact or materials story.",
    ],
    copy_structure: {
      hook,
      body_framework: [
        ad.body.split(".")[0]?.trim() || ad.body,
        ad.linkDescription || "Supporting product context",
        `Call to action: ${ad.cta}`,
      ],
      cta_pattern: ad.funnel === "bottom" ? "Direct purchase or shop-now push" : "Explore collection / learn more",
      emotional_register: ad.funnel === "bottom" ? "Urgent, confident, action-oriented" : "Aspirational, energetic, brand-led",
      adapt_for_your_brand: `Mirror the ${angle.toLowerCase()} angle with your hero SKU and a sharper first-line hook.`,
    },
    confidence: "medium",
  };
}

const META_PUBLISHER_PLATFORMS = [
  "FACEBOOK",
  "INSTAGRAM",
  "THREADS",
  "MESSENGER",
  "AUDIENCE_NETWORK",
] as const;

const META_ARCHIVE_IDS: Record<string, string> = {
  "meta-1": "26493469133670382",
  "meta-2": "26493469133670391",
  "meta-3": "26493469133670408",
};

const META_IMPRESSIONS: Record<string, number> = {
  "meta-1": 1_842_093,
  "meta-2": 892_441,
  "meta-3": 3_680_094,
};

const META_AGE_AUDIENCE: Record<string, { min: number; max: number }> = {
  "meta-1": { min: 18, max: 44 },
  "meta-2": { min: 18, max: 34 },
  "meta-3": { min: 25, max: 54 },
};

/** Static EU demographic reach table (Germany) — mirrors production Meta transparency drawer. */
const DEMO_META_GERMANY_REACH_BREAKDOWN = {
  country: "DE",
  age_gender_breakdowns: [
    { age_range: "18-24", female: 160_424, male: 208_888, unknown: 6_141 },
    { age_range: "25-34", female: 557_961, male: 655_181, unknown: 19_223 },
    { age_range: "35-44", female: 545_095, male: 538_745, unknown: 21_260 },
    { age_range: "45-54", female: 289_841, male: 296_687, unknown: 13_172 },
    { age_range: "55-64", female: 117_202, male: 154_616, unknown: 5_688 },
    { age_range: "65+", female: 36_060, male: 46_802, unknown: 1_537 },
    { age_range: "Unknown", female: 147, male: 275, unknown: 20 },
  ],
} as const;

type GoogleRegionStat = { region: string; impressionsMax?: number };

const GOOGLE_TRANSPARENCY_BY_AD: Record<
  string,
  {
    firstShown?: string;
    regionStats: GoogleRegionStat[];
    advertiserId: string;
    creativeId: string;
  }
> = {
  "google-1": {
    firstShown: "2026-01-05",
    regionStats: [
      { region: "US", impressionsMax: 600 },
      { region: "FR", impressionsMax: 400 },
    ],
    advertiserId: "AR05343765221255151617",
    creativeId: "CR17553116694019309569",
  },
  "google-2": {
    regionStats: [
      { region: "DE", impressionsMax: 12_000 },
      { region: "GB", impressionsMax: 8_500 },
    ],
    advertiserId: "AR05343765221255151617",
    creativeId: "CR17553116694019412",
  },
  "google-3": {
    regionStats: [
      { region: "US", impressionsMax: 45_000 },
      { region: "CA", impressionsMax: 18_000 },
    ],
    advertiserId: "AR05343765221255151617",
    creativeId: "CR17553116694019501",
  },
};

const TIKTOK_LIBRARY_IDS: Record<string, string> = {
  "tiktok-1": "7123456789012345678",
  "tiktok-2": "7123456789012345689",
  "tiktok-3": "7123456789012345701",
};

const TIKTOK_TARGETING_BY_AD: Record<
  string,
  { targetRegion: string; targetAge: string; targetGender: string; adAudienceLine: string; uniqueUsersSeen: string }
> = {
  "tiktok-1": {
    targetRegion: "United States, United Kingdom",
    targetAge: "18-24, 25-34",
    targetGender: "All",
    adAudienceLine: "Estimated audience: 250K – 500K",
    uniqueUsersSeen: "100K – 250K",
  },
  "tiktok-2": {
    targetRegion: "Germany, France",
    targetAge: "25-34, 35-44",
    targetGender: "Female",
    adAudienceLine: "Estimated audience: 50K – 100K",
    uniqueUsersSeen: "25K – 50K",
  },
  "tiktok-3": {
    targetRegion: "United States, Canada",
    targetAge: "18-24, 25-34, 35-44",
    targetGender: "All",
    adAudienceLine: "Estimated audience: 500K – 1M",
    uniqueUsersSeen: "250K – 500K",
  },
};

const PINTEREST_TARGETING_BY_AD: Record<
  string,
  {
    reachSummary: string;
    impressionsLabel: string;
    countries: string;
    targetingRows: { label: string; value: string }[];
  }
> = {
  "pinterest-1": {
    reachSummary: "10K – 50K",
    impressionsLabel: "25K – 100K",
    countries: "United States, United Kingdom, Germany",
    targetingRows: [
      { label: "Genders", value: "Female, Male" },
      { label: "Age ranges", value: "25-34, 35-44" },
      { label: "Interests", value: "Running, Athletic wear, Sportswear" },
    ],
  },
  "pinterest-2": {
    reachSummary: "5K – 25K",
    impressionsLabel: "10K – 50K",
    countries: "United States, France",
    targetingRows: [
      { label: "Genders", value: "Female" },
      { label: "Age ranges", value: "18-24, 25-34" },
      { label: "Interests", value: "Fitness, Summer fashion" },
    ],
  },
  "pinterest-3": {
    reachSummary: "50K – 100K",
    impressionsLabel: "75K – 150K",
    countries: "United States, Canada, United Kingdom",
    targetingRows: [
      { label: "Genders", value: "Female, Male" },
      { label: "Age ranges", value: "25-34, 35-44, 45-54" },
      { label: "Interests", value: "Sneakers, Streetwear, Loyalty programs" },
    ],
  },
};

const SNAPCHAT_BY_AD: Record<
  string,
  {
    euCountry: string;
    impressionsLabel: string;
    creativeTypeLabel: string;
    endDateLabel?: string;
  }
> = {
  "snapchat-1": {
    euCountry: "Germany",
    impressionsLabel: "50K – 100K",
    creativeTypeLabel: "Single Image",
  },
  "snapchat-2": {
    euCountry: "France",
    impressionsLabel: "25K – 50K",
    creativeTypeLabel: "Video",
    endDateLabel: "Jul 20, 2026",
  },
  "snapchat-3": {
    euCountry: "Netherlands",
    impressionsLabel: "10K – 25K",
    creativeTypeLabel: "Single Image",
  },
};

function buildGoogleDemoRawPayload(ad: DemoAd, firstSeenMs: number): Record<string, unknown> {
  const cfg = GOOGLE_TRANSPARENCY_BY_AD[ad.id] ?? {
    regionStats: [{ region: "US", impressionsMax: 1_000 }],
    advertiserId: "AR05343765221255151617",
    creativeId: `CR1755311669${ad.id.replace(/\D/g, "").padStart(6, "0").slice(-6)}`,
  };
  const firstShown = cfg.firstShown ?? formatIsoDateFromMs(firstSeenMs);
  const adUrl = `https://adstransparency.google.com/advertiser/${cfg.advertiserId}/creative/${cfg.creativeId}`;

  return {
    ...demoCreativeBase(ad),
    firstShown,
    advertiserId: cfg.advertiserId,
    creativeId: cfg.creativeId,
    adUrl,
    regionStats: cfg.regionStats,
    ...(ad.id === "google-3" ? { youtubeVideoId: "dQw4w9WgXcQ" } : {}),
  };
}

function buildTikTokDemoRawPayload(ad: DemoAd, firstSeenMs: number): Record<string, unknown> {
  const libraryId = TIKTOK_LIBRARY_IDS[ad.id] ?? `7123456789${ad.id.replace(/\D/g, "").padStart(8, "0").slice(-8)}`;
  const targeting = TIKTOK_TARGETING_BY_AD[ad.id] ?? {
    targetRegion: "United States",
    targetAge: "18-24, 25-34",
    targetGender: "All",
    adAudienceLine: "Estimated audience: 100K – 250K",
    uniqueUsersSeen: "50K – 100K",
  };

  return {
    ...demoCreativeBase(ad),
    id: libraryId,
    flightStartMs: firstSeenMs,
    firstShown: formatMediumDateFromMs(firstSeenMs),
    adUrl: `https://library.tiktok.com/ads/detail/${libraryId}`,
    ...targeting,
  };
}

function buildPinterestDemoRawPayload(ad: DemoAd, firstSeenMs: number): Record<string, unknown> {
  const cfg = PINTEREST_TARGETING_BY_AD[ad.id] ?? {
    reachSummary: "10K – 50K",
    impressionsLabel: "25K – 100K",
    countries: "United States, United Kingdom",
    targetingRows: [
      { label: "Genders", value: "Female, Male" },
      { label: "Age ranges", value: "25-34" },
    ],
  };
  const pinId = ad.id.replace(/\D/g, "").padStart(10, "0");

  return {
    ...demoCreativeBase(ad),
    disclosureWindow: `From ${formatMediumDateFromMs(firstSeenMs)}`,
    reachSummary: cfg.reachSummary,
    impressionsLabel: cfg.impressionsLabel,
    targetingRows: [{ label: "Countries", value: cfg.countries }, ...cfg.targetingRows],
    adUrl: `https://ads.pinterest.com/ads-repository/detail/${pinId}`,
  };
}

function buildSnapchatDemoRawPayload(ad: DemoAd, firstSeenMs: number): Record<string, unknown> {
  const cfg = SNAPCHAT_BY_AD[ad.id] ?? {
    euCountry: "Germany",
    impressionsLabel: "25K – 50K",
    creativeTypeLabel: ad.isVideo ? "Video" : "Single Image",
  };
  const snapId = ad.id.replace(/\D/g, "").padStart(8, "0");

  return {
    ...demoCreativeBase(ad),
    startDateLabel: formatMediumDateFromMs(firstSeenMs),
    ...(cfg.endDateLabel ? { endDateLabel: cfg.endDateLabel } : {}),
    euCountry: cfg.euCountry,
    impressionsLabel: cfg.impressionsLabel,
    creativeTypeLabel: cfg.creativeTypeLabel,
    adUrl: `https://www.snapchat.com/ads/gallery/${snapId}`,
  };
}

function buildMetaDemoRawPayload(ad: DemoAd, firstSeenMs: number): Record<string, unknown> {
  const startedAt = Math.floor(firstSeenMs / 1000);
  const age = META_AGE_AUDIENCE[ad.id] ?? { min: 18, max: 65 };
  const impressions = META_IMPRESSIONS[ad.id] ?? 1_240_000;
  const archiveId =
    META_ARCHIVE_IDS[ad.id] ??
    `2649346913${ad.id.replace(/\D/g, "").padStart(6, "0").slice(-6)}`;

  return {
    ...demoCreativeBase(ad),
    startedAt,
    isActive: true,
    targets_eu: true,
    location_audience: [{ name: "Germany", type: "countries", excluded: false }],
    age_audience: age,
    gender_audience: "All",
    eu_total_reach: impressions,
    publisher_platform: [...META_PUBLISHER_PLATFORMS],
    ad_archive_id: archiveId,
    age_country_gender_reach_breakdown: [DEMO_META_GERMANY_REACH_BREAKDOWN],
  };
}

function buildDemoRawPayload(ad: DemoAd, firstSeenMs: number): Record<string, unknown> {
  switch (ad.platform) {
    case "meta":
      return buildMetaDemoRawPayload(ad, firstSeenMs);
    case "google":
      return buildGoogleDemoRawPayload(ad, firstSeenMs);
    case "tiktok":
      return buildTikTokDemoRawPayload(ad, firstSeenMs);
    case "pinterest":
      return buildPinterestDemoRawPayload(ad, firstSeenMs);
    case "snapchat":
      return buildSnapchatDemoRawPayload(ad, firstSeenMs);
    default:
      return demoCreativeBase(ad);
  }
}

function demoCompetitorForAd(ad: DemoAd): {
  id: string;
  name: string;
  domain: string;
  logo_url: string;
} {
  const isOwn = ad.pageName === DEMO_OWN_BRAND.name;
  return {
    id: isOwn ? "demo-own-brand" : "demo-competitor-a",
    name: isOwn ? DEMO_OWN_BRAND.name : DEMO_COMPETITOR.name,
    domain: isOwn ? DEMO_OWN_BRAND.domain : DEMO_COMPETITOR.domain,
    logo_url: isOwn ? DEMO_OWN_BRAND.logoUrl : DEMO_COMPETITOR.logoUrl,
  };
}

export function buildDemoAdDetailPayload(ad: DemoAd): AdDetailDrawerPayload {
  const lifespan = ad.lifespanDays ?? ad.activeDays;
  const firstSeenMs = DEMO_NOW.getTime() - lifespan * DAY_MS;
  const firstSeen = new Date(firstSeenMs).toISOString();
  const lastSeen = DEMO_NOW.toISOString();

  return {
    ok: true,
    ad: {
      id: ad.id,
      display_label: buildDisplayLabel(ad),
      platform: ad.platform,
      format: ad.format ?? (ad.isVideo ? "Video" : "Image"),
      ad_creative_url: ad.creativeUrl ?? null,
      ad_text: [ad.headline, ad.body].filter(Boolean).join("\n\n"),
      cta: ad.cta,
      first_seen_at: firstSeen,
      last_seen_at: lastSeen,
      is_killed: false,
      lifespan_days: lifespan,
      raw_payload: buildDemoRawPayload(ad, firstSeenMs),
    },
    competitor: {
      ...demoCompetitorForAd(ad),
      brand_context: null,
    },
    ai: {
      angle: ad.angle ?? null,
      funnel_stage: funnelLabel(ad.funnel),
      voice_tone: null,
      launch_date: firstSeen.slice(0, 10),
      enrichment_status: "complete",
    },
    context: {
      landing_page_url: `https://${ad.siteLabel}`,
      landing_page_display: ad.siteLabel,
      is_creative_test_winner: false,
      preview_analysis: buildDemoPreviewAnalysis(ad),
      preview_analysis_computed_at: lastSeen,
      preview_analysis_quota: { used: 3, limit: 10, remaining: 7 },
    },
  };
}

export function buildDemoAdDetailOpenSeed(ad: DemoAd): AdDetailOpenSeed {
  const payload = buildDemoAdDetailPayload(ad);
  return {
    adId: ad.id,
    platform: ad.platform,
    format: payload.ad?.format,
    ad_creative_url: null,
    ad_text: payload.ad?.ad_text,
    cta: ad.cta,
    first_seen_at: payload.ad?.first_seen_at,
    last_seen_at: payload.ad?.last_seen_at,
    is_killed: false,
    lifespan_days: payload.ad?.lifespan_days,
    raw_payload: payload.ad?.raw_payload,
    display_label: payload.ad?.display_label,
    competitor: demoCompetitorForAd(ad),
  };
}

export function primeDemoAdDetailCache(ad: DemoAd): void {
  setCachedAdDetail(ad.id, buildDemoAdDetailPayload(ad));
  putAdDetailSeed(buildDemoAdDetailOpenSeed(ad));
}
