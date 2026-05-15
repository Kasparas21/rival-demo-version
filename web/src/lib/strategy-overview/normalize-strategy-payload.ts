import type {
  AudienceInferenceResult,
  AudienceSignals,
  CompetitorStrategyOverviewPayload,
  InsightCardsPayload,
  StrategyMapPayload,
} from "@/lib/strategy-overview/payload-types";

const DEFAULT_AUDIENCE: AudienceSignals = {
  interests: [],
  ageRange: "—",
  geo: "—",
  targetingType: [],
};

/** Cached JSON sometimes stores an object-shaped placeholder without `segments[]`. */
function sanitizeAudienceInference(
  raw: CompetitorStrategyOverviewPayload["audience_inference"]
): AudienceInferenceResult | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null) return null;
  if (typeof raw !== "object" || !Array.isArray((raw as AudienceInferenceResult).segments)) {
    return null;
  }
  return raw;
}

/** If jsonb / client cache hands us a non-object, avoid spread throw and still render. */
const FALLBACK_MAP: StrategyMapPayload = {
  title: "—",
  competitor: { name: "—", domain: "—", logoUrl: null },
  totalAdSpend: {
    value: 0,
    low: 0,
    high: 0,
    currency: "EUR",
    unit: "month",
    confidence: "low",
    brandScaleScore: 0.5,
  },
  spendVsSimilar: "Very Low",
  spendTrendline: [],
  audienceSignals: {
    interests: [],
    ageRange: "—",
    geo: "—",
    targetingType: [],
  },
  dominantFormat: { format: "—", percentage: 0 },
  toneOfVoice: { primary: "—", attributes: [] },
  topAngles: [],
  platformNodes: [],
  funnelEdges: [],
  activeAdCount: 0,
  platformCount: 0,
};

function normalizeAudienceSignals(raw: unknown): AudienceSignals {
  if (raw == null || typeof raw !== "object") {
    return {
      interests: [...DEFAULT_AUDIENCE.interests],
      ageRange: DEFAULT_AUDIENCE.ageRange,
      geo: DEFAULT_AUDIENCE.geo,
      targetingType: [...DEFAULT_AUDIENCE.targetingType],
    };
  }
  const o = raw as Record<string, unknown>;
  return {
    interests: Array.isArray(o.interests) ? o.interests.map((x) => String(x)) : [...DEFAULT_AUDIENCE.interests],
    ageRange: typeof o.ageRange === "string" ? o.ageRange : DEFAULT_AUDIENCE.ageRange,
    geo: typeof o.geo === "string" ? o.geo : DEFAULT_AUDIENCE.geo,
    targetingType: Array.isArray(o.targetingType)
      ? o.targetingType.map((x) => String(x))
      : [...DEFAULT_AUDIENCE.targetingType],
  };
}

function normalizeDominantFormat(raw: unknown): StrategyMapPayload["dominantFormat"] {
  if (raw == null || typeof raw !== "object") {
    return { format: "—", percentage: 0 };
  }
  const o = raw as Record<string, unknown>;
  const pct = o.percentage;
  return {
    format: typeof o.format === "string" ? o.format : "—",
    percentage: typeof pct === "number" && Number.isFinite(pct) ? pct : 0,
  };
}

function normalizeToneOfVoice(raw: unknown): StrategyMapPayload["toneOfVoice"] {
  if (raw == null || typeof raw !== "object") {
    return { primary: "—", attributes: [] };
  }
  const o = raw as Record<string, unknown>;
  return {
    primary: typeof o.primary === "string" ? o.primary : "—",
    attributes: Array.isArray(o.attributes) ? o.attributes.map((x) => String(x)) : [],
  };
}

function normalizeTopAngles(raw: unknown): StrategyMapPayload["topAngles"] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, i) => {
    if (item == null || typeof item !== "object") {
      return { angle: "—", rank: i + 1 };
    }
    const o = item as Record<string, unknown>;
    const rank = o.rank;
    return {
      angle: typeof o.angle === "string" ? o.angle : "—",
      rank: typeof rank === "number" && Number.isFinite(rank) ? rank : i + 1,
    };
  });
}

const SPEND_BAND_LABELS = new Set<StrategyMapPayload["spendVsSimilar"]>([
  "Very Low",
  "Low",
  "Medium",
  "High",
  "Very High",
]);

/** Partial / legacy JSONB often omits `insights` keys or nests undefined arrays (`platforms`, `segments`). */
function cloneFallbackInsights(): InsightCardsPayload {
  const base = {
    title: "—",
    subtitle: "—",
    tooltip: "",
    lastUpdated: "1970-01-01T00:00:00.000Z",
    dataConfidence: "low" as const,
  };
  return {
    platform_footprint: {
      ...base,
      platforms: [],
      totalActiveAds: 0,
      totalEstSpendEur: 0,
      platformCount: 0,
    },
    budget_allocation: {
      ...base,
      segments: [],
      totalEstSpendEur: 0,
      insight: "",
    },
    library_activity_timeline: {
      ...base,
      months: [],
      dataQuality: {
        realLaunchPct: 0,
        qualityLabel: "low" as const,
        warning: null,
      },
    },
    funnel_distribution: {
      ...base,
      stages: [],
      totalClassified: 0,
      totalAds: 0,
      insufficientData: true,
    },
    angle_clustering: {
      ...base,
      angles: [],
      unclassifiedPct: 100,
      insufficientData: true,
    },
    voice_tone_position: {
      ...base,
      competitor: null,
      userBrand: null,
      sampleSize: 0,
    },
    ad_format_mix: {
      ...base,
      formats: [],
    },
    voice_tone_by_platform: [],
    angles_by_platform: [],
    testing_velocity_by_platform: [],
    spend_trend_by_platform: [],
  };
}

/** Merge persisted `insights` onto safe defaults — supports `{}` shells from DB/cache. */
export function normalizeInsightCardsPayload(rawUnknown: unknown): InsightCardsPayload {
  const fb = cloneFallbackInsights();
  if (rawUnknown == null || typeof rawUnknown !== "object") {
    return fb;
  }
  const r = rawUnknown as Partial<InsightCardsPayload>;

  const platform_footprint = (() => {
    const d = fb.platform_footprint;
    if (!r.platform_footprint || typeof r.platform_footprint !== "object") return d;
    const x = r.platform_footprint;
    return {
      ...d,
      ...x,
      platforms: Array.isArray(x.platforms) ? x.platforms : d.platforms,
    };
  })();

  const budget_allocation = (() => {
    const d = fb.budget_allocation;
    if (!r.budget_allocation || typeof r.budget_allocation !== "object") return d;
    const x = r.budget_allocation;
    const totalEst =
      typeof x.totalEstSpendEur === "number" && Number.isFinite(x.totalEstSpendEur)
        ? x.totalEstSpendEur
        : d.totalEstSpendEur;
    return {
      ...d,
      ...x,
      segments: Array.isArray(x.segments) ? x.segments : [],
      totalEstSpendEur: totalEst,
    };
  })();

  const library_activity_timeline = (() => {
    const d = fb.library_activity_timeline;
    if (!r.library_activity_timeline || typeof r.library_activity_timeline !== "object") return d;
    const x = r.library_activity_timeline;
    const dq = x.dataQuality && typeof x.dataQuality === "object" ? x.dataQuality : {};
    const ql = dq.qualityLabel;
    return {
      ...d,
      ...x,
      months: Array.isArray(x.months) ? x.months : d.months,
      dataQuality: {
        ...d.dataQuality,
        ...dq,
        qualityLabel:
          ql === "high" || ql === "medium" || ql === "low" ? ql : d.dataQuality.qualityLabel,
        warning:
          dq.warning === null || typeof dq.warning === "string"
            ? (dq.warning as string | null)
            : d.dataQuality.warning,
        realLaunchPct:
          typeof dq.realLaunchPct === "number" && Number.isFinite(dq.realLaunchPct)
            ? dq.realLaunchPct
            : d.dataQuality.realLaunchPct,
      },
    };
  })();

  const funnel_distribution = (() => {
    const d = fb.funnel_distribution;
    if (!r.funnel_distribution || typeof r.funnel_distribution !== "object") return d;
    const x = r.funnel_distribution;
    return {
      ...d,
      ...x,
      stages: Array.isArray(x.stages) ? x.stages : d.stages,
    };
  })();

  const angle_clustering = (() => {
    const d = fb.angle_clustering;
    if (!r.angle_clustering || typeof r.angle_clustering !== "object") return d;
    const x = r.angle_clustering;
    return {
      ...d,
      ...x,
      angles: Array.isArray(x.angles) ? x.angles : d.angles,
    };
  })();

  const voice_tone_position = (() => {
    const d = fb.voice_tone_position;
    if (!r.voice_tone_position || typeof r.voice_tone_position !== "object") return d;
    const x = r.voice_tone_position;
    const merged = { ...d, ...x };
    return {
      ...merged,
      competitor: merged.competitor ?? null,
      userBrand: merged.userBrand ?? null,
      sampleSize:
        typeof merged.sampleSize === "number" && Number.isFinite(merged.sampleSize)
          ? merged.sampleSize
          : d.sampleSize,
    };
  })();

  const ad_format_mix = (() => {
    const d = fb.ad_format_mix;
    if (!r.ad_format_mix || typeof r.ad_format_mix !== "object") return d;
    const x = r.ad_format_mix;
    return {
      ...d,
      ...x,
      formats: Array.isArray(x.formats) ? x.formats : d.formats,
    };
  })();

  return {
    platform_footprint,
    budget_allocation,
    library_activity_timeline,
    funnel_distribution,
    angle_clustering,
    voice_tone_position,
    ad_format_mix,
    voice_tone_by_platform: Array.isArray(r.voice_tone_by_platform)
      ? r.voice_tone_by_platform
      : fb.voice_tone_by_platform,
    angles_by_platform: Array.isArray(r.angles_by_platform) ? r.angles_by_platform : fb.angles_by_platform,
    testing_velocity_by_platform: Array.isArray(r.testing_velocity_by_platform)
      ? r.testing_velocity_by_platform
      : fb.testing_velocity_by_platform,
    spend_trend_by_platform: Array.isArray(r.spend_trend_by_platform)
      ? r.spend_trend_by_platform
      : fb.spend_trend_by_platform,
  };
}

function cloneFallbackMap(): StrategyMapPayload {
  return {
    ...FALLBACK_MAP,
    audienceSignals: {
      ...FALLBACK_MAP.audienceSignals,
      interests: [...FALLBACK_MAP.audienceSignals.interests],
      targetingType: [...FALLBACK_MAP.audienceSignals.targetingType],
    },
    toneOfVoice: { ...FALLBACK_MAP.toneOfVoice, attributes: [...FALLBACK_MAP.toneOfVoice.attributes] },
    topAngles: [...FALLBACK_MAP.topAngles],
    platformNodes: [...FALLBACK_MAP.platformNodes],
    funnelEdges: [...FALLBACK_MAP.funnelEdges],
    spendTrendline: [...FALLBACK_MAP.spendTrendline],
  };
}

/**
 * DB jsonb / client cache can ship a partial `map` (missing arrays, half-filled `competitor`, etc.).
 * Merge defaults first, then coerce — never trust a bare `{ ...partial }` spread alone.
 */
export function normalizeStrategyMapPayload(map: StrategyMapPayload): StrategyMapPayload {
  if (map == null || typeof map !== "object") {
    return cloneFallbackMap();
  }

  const raw = map;
  const platformNodes = Array.isArray(raw.platformNodes) ? raw.platformNodes : [];
  const platformCount =
    typeof raw.platformCount === "number" && Number.isFinite(raw.platformCount)
      ? raw.platformCount
      : platformNodes.length;

  return {
    ...FALLBACK_MAP,
    suppressEdgesReason:
      raw.suppressEdgesReason === "low_sample" || raw.suppressEdgesReason === "single_platform"
        ? raw.suppressEdgesReason
        : undefined,
    derivationQuality:
      raw.derivationQuality === "high" || raw.derivationQuality === "medium" || raw.derivationQuality === "low"
        ? raw.derivationQuality
        : undefined,
    title: typeof raw.title === "string" ? raw.title : FALLBACK_MAP.title,
    spendVsSimilar: SPEND_BAND_LABELS.has(raw.spendVsSimilar as StrategyMapPayload["spendVsSimilar"])
      ? (raw.spendVsSimilar as StrategyMapPayload["spendVsSimilar"])
      : FALLBACK_MAP.spendVsSimilar,
    spendTrendline: Array.isArray(raw.spendTrendline) ? raw.spendTrendline : [],
    competitor: {
      ...FALLBACK_MAP.competitor,
      ...(raw.competitor && typeof raw.competitor === "object" ? raw.competitor : {}),
    },
    totalAdSpend: {
      ...FALLBACK_MAP.totalAdSpend,
      ...(raw.totalAdSpend && typeof raw.totalAdSpend === "object" ? raw.totalAdSpend : {}),
    },
    platformNodes,
    funnelEdges: Array.isArray(raw.funnelEdges) ? raw.funnelEdges : [],
    funnelCells: Array.isArray(raw.funnelCells) ? raw.funnelCells : undefined,
    activeAdCount:
      typeof raw.activeAdCount === "number" && Number.isFinite(raw.activeAdCount)
        ? raw.activeAdCount
        : FALLBACK_MAP.activeAdCount,
    platformCount,
    audienceSignals: normalizeAudienceSignals(raw.audienceSignals),
    dominantFormat: normalizeDominantFormat(raw.dominantFormat),
    toneOfVoice: normalizeToneOfVoice(raw.toneOfVoice),
    topAngles: normalizeTopAngles(raw.topAngles),
  };
}

/** DB rows and stale JSON can omit `map` or ship partial objects; never return a payload without `map`. */
export function normalizeCompetitorStrategyOverviewPayload(
  p: CompetitorStrategyOverviewPayload
): CompetitorStrategyOverviewPayload {
  if (p == null || typeof p !== "object") return p;
  const insightsNormalized = normalizeInsightCardsPayload((p as { insights?: unknown }).insights);
  const audienceInferenceNormalized = sanitizeAudienceInference(p.audience_inference);
  if (!p.map || typeof p.map !== "object") {
    return {
      ...p,
      map: normalizeStrategyMapPayload(null as unknown as StrategyMapPayload),
      insights: insightsNormalized,
      audience_inference: audienceInferenceNormalized,
    };
  }
  return {
    ...p,
    map: normalizeStrategyMapPayload(p.map),
    insights: insightsNormalized,
    audience_inference: audienceInferenceNormalized,
  };
}
