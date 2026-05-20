import {
  classifyAngleCategory,
  parseAngleForDisplay,
  type AngleCardCategory,
} from "@/lib/comparison/stealable-angle-present";
import type { AudienceSignals, StrategyMapPayload } from "@/lib/strategy-overview/payload-types";

export type SidebarScrapedAd = {
  platform: string;
  format: string;
  ai_extracted_angle: string | null;
  ai_extracted_voice_tone?: unknown;
  raw_payload?: unknown;
};

type VoiceToneVector = {
  formal: number;
  emotional: number;
  confidence: number;
};

function computeFormatMix(ads: SidebarScrapedAd[]): { format: string; count: number; sharePct: number }[] {
  const aggregator = new Map<string, number>();
  for (const ad of ads) {
    const format = (ad.format ?? "unknown").toLowerCase().trim();
    aggregator.set(format, (aggregator.get(format) ?? 0) + 1);
  }
  const total = ads.length;
  return Array.from(aggregator.entries())
    .map(([format, count]) => ({
      format,
      count,
      sharePct: total > 0 ? Math.round((count / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

function computeVoiceToneAverage(ads: SidebarScrapedAd[]): VoiceToneVector | null {
  const scored = ads
    .map((a) => parseVoiceToneVector(a.ai_extracted_voice_tone))
    .filter((v): v is VoiceToneVector => v != null);
  if (scored.length < 3) return null;
  const avg = (key: keyof VoiceToneVector) =>
    scored.reduce((sum, s) => sum + (s[key] ?? 0), 0) / scored.length;
  return {
    formal: parseFloat(avg("formal").toFixed(2)),
    emotional: parseFloat(avg("emotional").toFixed(2)),
    confidence: parseFloat(avg("confidence").toFixed(2)),
  };
}

const ENRICHMENT_ANGLE_HEAD: Record<string, AngleCardCategory> = {
  price: "price",
  discount: "discount",
  fear: "fear",
  urgency: "urgency",
  social_proof: "social_proof",
  speed: "speed",
  curiosity: "curiosity",
  brand: "brand",
  quality: "other",
  trust: "social_proof",
};

function categoryFromAngle(angleRaw: string): AngleCardCategory {
  const head = angleRaw.split(/·+/)[0]?.trim().toLowerCase().replace(/\s+/g, "_") ?? "";
  if (head in ENRICHMENT_ANGLE_HEAD) return ENRICHMENT_ANGLE_HEAD[head]!;
  return classifyAngleCategory(angleRaw);
}
const CATEGORY_LABEL: Record<AngleCardCategory, string> = {
  price: "Price-led",
  discount: "Discount & deals",
  fear: "Risk / fear",
  urgency: "Urgency",
  social_proof: "Social proof",
  speed: "Speed & convenience",
  curiosity: "Curiosity",
  brand: "Brand",
  other: "Mixed themes",
};

function parseVoiceToneVector(raw: unknown): VoiceToneVector | null {
  if (raw == null || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const formal = Number(o.formal);
  const emotional = Number(o.emotional);
  const confidence = Number(o.confidence);
  if (![formal, emotional, confidence].every((n) => Number.isFinite(n))) return null;
  if (formal < 0 || formal > 1 || emotional < 0 || emotional > 1 || confidence < 0 || confidence > 1) {
    return null;
  }
  return { formal, emotional, confidence };
}

function voiceTonePrimaryLabel(formal: number, emotional: number): string {
  if (formal >= 0.65 && emotional < 0.45) return "Professional & Direct";
  if (formal < 0.45 && emotional >= 0.55) return "Warm & Empathetic";
  if (formal >= 0.55 && emotional >= 0.55) return "Confident & Persuasive";
  if (formal < 0.45 && emotional < 0.45) return "Casual & Straightforward";
  if (formal >= 0.5 && emotional >= 0.45) return "Confident & Helpful";
  return "Balanced & Informative";
}

function voiceToneAttributes(formal: number, emotional: number): string[] {
  const out: string[] = [];
  if (formal >= 0.58) out.push("Formal");
  else if (formal <= 0.42) out.push("Conversational");
  else out.push("Neutral tone");

  if (emotional >= 0.58) out.push("Emotional");
  else if (emotional <= 0.42) out.push("Rational");
  else out.push("Balanced");

  if (formal >= 0.5 && emotional >= 0.52) out.push("Promotional");
  else out.push("Benefit-driven");

  return out.slice(0, 3);
}

function formatDisplayLabel(format: string, videoAds: SidebarScrapedAd[]): string {
  const f = format.toLowerCase().trim();
  if (f === "video") {
    const verticalPlatforms = new Set(["tiktok", "snapchat", "pinterest"]);
    const verticalish = videoAds.filter((a) => verticalPlatforms.has(a.platform.toLowerCase())).length;
    if (videoAds.length > 0 && verticalish / videoAds.length >= 0.35) return "Video · Vertical";
    return "Video";
  }
  if (f === "image") return "Static image";
  if (f === "carousel") return "Carousel";
  if (f === "text") return "Text-led";
  return f.charAt(0).toUpperCase() + f.slice(1);
}

function deriveAgeRange(ads: SidebarScrapedAd[]): string {
  let minAge = Infinity;
  let maxAge = -Infinity;
  let samples = 0;

  for (const ad of ads) {
    const raw = ad.raw_payload;
    if (!raw || typeof raw !== "object") continue;
    const o = raw as Record<string, unknown>;
    const age = o.age_audience;
    if (age && typeof age === "object") {
      const a = age as { min?: number; max?: number };
      if (typeof a.min === "number" && Number.isFinite(a.min)) {
        minAge = Math.min(minAge, a.min);
        samples += 1;
      }
      if (typeof a.max === "number" && Number.isFinite(a.max)) {
        maxAge = Math.max(maxAge, a.max);
        samples += 1;
      }
    }
    const gender = typeof o.gender_audience === "string" ? o.gender_audience.trim() : "";
    if (gender && samples === 0) samples += 1;
  }

  if (samples >= 2 && minAge < Infinity && maxAge > -Infinity) {
    return `${Math.round(minAge)}–${Math.round(maxAge)} years`;
  }
  if (samples >= 1 && minAge < Infinity && maxAge === -Infinity) {
    return `${Math.round(minAge)}+ years`;
  }
  return "Age mix unavailable";
}

function deriveGeo(ads: SidebarScrapedAd[]): string {
  const locCounts = new Map<string, number>();
  let euTargets = 0;

  for (const ad of ads) {
    const raw = ad.raw_payload;
    if (!raw || typeof raw !== "object") continue;
    const o = raw as Record<string, unknown>;
    if (o.targets_eu === true) euTargets += 1;
    const locs = o.location_audience;
    if (!Array.isArray(locs)) continue;
    for (const entry of locs) {
      if (!entry || typeof entry !== "object") continue;
      const e = entry as { name?: string; excluded?: boolean };
      const name = typeof e.name === "string" ? e.name.trim() : "";
      if (!name || e.excluded) continue;
      locCounts.set(name, (locCounts.get(name) ?? 0) + 1);
    }
  }

  const top = [...locCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2);
  if (top.length === 1) return top[0]![0];
  if (top.length >= 2) return `${top[0]![0]} · ${top[1]![0]}`;
  if (euTargets >= Math.max(2, Math.floor(ads.length * 0.2))) return "EU-focused (inferred)";
  return "Multi-region (inferred)";
}

function deriveAudienceInterests(ads: SidebarScrapedAd[]): string[] {
  const catCounts = new Map<AngleCardCategory, number>();
  for (const ad of ads) {
    const ang = ad.ai_extracted_angle?.trim();
    if (!ang || ang === "Unclassified") continue;
    const cat = categoryFromAngle(ang);
    catCounts.set(cat, (catCounts.get(cat) ?? 0) + 1);
  }

  const ranked = [...catCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  if (ranked.length === 0) {
    return ["Category shoppers", "Platform-native engagers", "Offer seekers"];
  }

  return ranked.map(([cat, n]) => `${CATEGORY_LABEL[cat]} (${n} ad${n === 1 ? "" : "s"})`);
}

function deriveTopAngles(ads: SidebarScrapedAd[]): StrategyMapPayload["topAngles"] {
  const enriched = ads.filter((a) => (a.ai_extracted_angle ?? "").trim() && (a.ai_extracted_angle ?? "").trim() !== "Unclassified");
  const byHook = new Map<string, { count: number; raw: string; category: AngleCardCategory }>();

  for (const ad of enriched) {
    const raw = ad.ai_extracted_angle!.trim();
    const parsed = parseAngleForDisplay(raw);
    const category = categoryFromAngle(raw);
    const key = `${category}::${parsed.hook.toLowerCase().slice(0, 80)}`;
    const prev = byHook.get(key);
    if (prev) prev.count += 1;
    else byHook.set(key, { count: 1, raw, category });
  }

  const sorted = [...byHook.values()].sort((a, b) => b.count - a.count).slice(0, 5);
  if (sorted.length === 0) {
    return [{ angle: "Product benefits", rank: 1 }];
  }

  return sorted.map((entry, i) => {
    const parsed = parseAngleForDisplay(entry.raw);
    const hook = parsed.hook || parsed.rawHead;
    const label =
      entry.count > 1
        ? `${hook} (${entry.count} ads)`
        : hook;
    return { angle: label.slice(0, 200), rank: i + 1 };
  });
}

export type SidebarInsightsExtras = {
  topAngleCategories: { category: AngleCardCategory; label: string; count: number; sharePct: number }[];
  formatMix: { format: string; label: string; sharePct: number }[];
  voiceConfidence: number | null;
};

export function deriveSidebarInsights(ads: SidebarScrapedAd[]): {
  audienceSignals: AudienceSignals;
  dominantFormat: StrategyMapPayload["dominantFormat"];
  toneOfVoice: StrategyMapPayload["toneOfVoice"];
  topAngles: StrategyMapPayload["topAngles"];
  extras: SidebarInsightsExtras;
} {
  const formatMix = computeFormatMix(ads);
  const topFmt = formatMix[0];
  const videoAds = ads.filter((a) => (a.format ?? "").toLowerCase() === "video");

  const dominantFormat = {
    format: topFmt ? formatDisplayLabel(topFmt.format, videoAds) : "—",
    percentage: topFmt?.sharePct ?? 0,
  };

  const voiceAvg = computeVoiceToneAverage(ads);
  const toneOfVoice = voiceAvg
    ? {
        primary: voiceTonePrimaryLabel(voiceAvg.formal, voiceAvg.emotional),
        attributes: voiceToneAttributes(voiceAvg.formal, voiceAvg.emotional),
      }
    : {
        primary: "Tone pending enrichment",
        attributes: ["Awaiting voice analysis"],
      };

  const topAngles = deriveTopAngles(ads);

  const catCounts = new Map<AngleCardCategory, number>();
  for (const ad of ads) {
    const ang = ad.ai_extracted_angle?.trim();
    if (!ang || ang === "Unclassified") continue;
    const cat = categoryFromAngle(ang);
    catCounts.set(cat, (catCounts.get(cat) ?? 0) + 1);
  }
  const enrichedAngleTotal = [...catCounts.values()].reduce((s, n) => s + n, 0);
  const topAngleCategories = [...catCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([category, count]) => ({
      category,
      label: CATEGORY_LABEL[category].toUpperCase(),
      count,
      sharePct: enrichedAngleTotal > 0 ? Math.round((count / enrichedAngleTotal) * 100) : 0,
    }));

  return {
    audienceSignals: {
      interests: deriveAudienceInterests(ads),
      ageRange: deriveAgeRange(ads),
      geo: deriveGeo(ads),
      targetingType: voiceAvg && voiceAvg.formal >= 0.55 ? ["Interest-based", "Performance"] : ["Broad", "Performance"],
    },
    dominantFormat,
    toneOfVoice,
    topAngles,
    extras: {
      topAngleCategories,
      formatMix: formatMix.slice(0, 3).map((f) => ({
        format: f.format,
        label: formatDisplayLabel(f.format, videoAds),
        sharePct: f.sharePct,
      })),
      voiceConfidence: voiceAvg?.confidence ?? null,
    },
  };
}
