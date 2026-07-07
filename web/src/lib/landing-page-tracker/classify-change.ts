import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "@/lib/supabase/types";

import type { LandingPageChangeAnalysis, LandingPageText } from "./constants";
import {
  AB_TEST_CONFIRM_DAYS,
  LOW_THREAT_MAX,
  MASK_NOISE_OVERLAP_THRESHOLD,
  PIXEL_DIFF_NOISE_MAX,
  PIXEL_DIFF_THRESHOLD,
} from "./constants";

export type ChangeConfidence = "noise" | "suspected_ab" | "confirmed";

export type TextChangeFlags = {
  headline: boolean;
  cta: boolean;
  pricing: boolean;
};

export function detectLandingPageTextChanges(
  prev: LandingPageText,
  next: LandingPageText,
): TextChangeFlags {
  return {
    headline: (prev.headline?.trim() ?? "") !== (next.headline?.trim() ?? ""),
    cta: (prev.cta_text?.trim() ?? "") !== (next.cta_text?.trim() ?? ""),
    pricing:
      JSON.stringify(prev.pricing_tiers ?? []) !== JSON.stringify(next.pricing_tiers ?? []),
  };
}

export function hasAnyTextChange(flags: TextChangeFlags): boolean {
  return flags.headline || flags.cta || flags.pricing;
}

function parseConfidence(raw: Json | null | undefined): ChangeConfidence | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const value = (raw as Record<string, unknown>).change_confidence;
  if (value === "noise" || value === "suspected_ab" || value === "confirmed") return value;
  return null;
}

export function isAnimationNoise(
  pixelDiffPct: number,
  threatScore: number,
  textChanged: boolean,
): boolean {
  if (textChanged) return false;
  return pixelDiffPct < PIXEL_DIFF_NOISE_MAX && threatScore <= LOW_THREAT_MAX;
}

function noiseAnalysis(pixelDiffPct: number, maskOverlapPct?: number): LandingPageChangeAnalysis {
  const carouselNote =
    (maskOverlapPct ?? 0) >= MASK_NOISE_OVERLAP_THRESHOLD * 100
      ? " The difference was mostly inside a calibrated animated area (e.g. logo carousel)."
      : "";
  return {
    change_confidence: "noise",
    what_changed: "No meaningful change detected.",
    strategic_interpretation:
      `Pixel difference is likely from animations, loading states, or screenshot timing — not a real page update.${carouselNote}`,
    what_to_do: "No action needed.",
    urgency: "low",
    threat_score: 0,
    sections_changed: [],
    mask_overlap_pct: maskOverlapPct,
    ignored_animation: (maskOverlapPct ?? 0) >= MASK_NOISE_OVERLAP_THRESHOLD * 100,
  };
}

function confirmedFromAbAnalysis(
  prevAnalysis: LandingPageChangeAnalysis,
  pixelDiffPct: number,
): LandingPageChangeAnalysis {
  return {
    ...prevAnalysis,
    change_confidence: "confirmed",
    what_changed:
      prevAnalysis.what_changed ??
      "The visual change seen earlier is still live — likely a permanent update or winning A/B variant.",
    strategic_interpretation:
      prevAnalysis.strategic_interpretation ??
      "This variant has persisted across multiple checks, so it is probably intentional rather than a transient test.",
    what_to_do:
      prevAnalysis.what_to_do ?? "Review the change and decide if you need to respond competitively.",
    urgency: prevAnalysis.urgency ?? "medium",
    threat_score: Math.max(prevAnalysis.threat_score ?? 4, 4),
  };
}

function withConfidence(
  analysis: LandingPageChangeAnalysis,
  confidence: ChangeConfidence,
): LandingPageChangeAnalysis {
  return { ...analysis, change_confidence: confidence };
}

async function findFirstSuspectedAb(
  admin: SupabaseClient<Database>,
  landingPageId: string,
): Promise<{ taken_at: string } | null> {
  const { data } = await admin
    .from("landing_page_snapshots")
    .select("taken_at, change_analysis")
    .eq("landing_page_id", landingPageId)
    .eq("status", "ok")
    .order("taken_at", { ascending: false })
    .limit(12);

  for (const row of data ?? []) {
    if (parseConfidence(row.change_analysis) === "suspected_ab") {
      return { taken_at: row.taken_at };
    }
  }
  return null;
}

export async function classifyLandingPageChange(params: {
  admin: SupabaseClient<Database>;
  landingPageId: string;
  pixelDiffPct: number | null;
  maskOverlapPct?: number;
  textChanges: TextChangeFlags;
  prevSnapshot: Database["public"]["Tables"]["landing_page_snapshots"]["Row"] | null;
  aiAnalysis: LandingPageChangeAnalysis;
}): Promise<{ hasMeaningfulChange: boolean; changeAnalysis: LandingPageChangeAnalysis }> {
  const { admin, landingPageId, pixelDiffPct, maskOverlapPct, textChanges, prevSnapshot, aiAnalysis } =
    params;
  const textChanged = hasAnyTextChange(textChanges);
  const diff = pixelDiffPct ?? 0;
  const threatScore = aiAnalysis.threat_score ?? 0;
  const prevConfidence = parseConfidence(prevSnapshot?.change_analysis ?? null);
  const prevAnalysis = (prevSnapshot?.change_analysis ?? {}) as LandingPageChangeAnalysis;
  const overlap = maskOverlapPct ?? aiAnalysis.mask_overlap_pct ?? 0;
  const enrichedAi = {
    ...aiAnalysis,
    mask_overlap_pct: overlap,
    ignored_animation: overlap >= MASK_NOISE_OVERLAP_THRESHOLD * 100 && !textChanged,
  };

  if (
    prevSnapshot &&
    diff < PIXEL_DIFF_THRESHOLD &&
    prevConfidence === "suspected_ab"
  ) {
    return {
      hasMeaningfulChange: true,
      changeAnalysis: confirmedFromAbAnalysis(prevAnalysis, diff),
    };
  }

  if (prevSnapshot && diff < PIXEL_DIFF_THRESHOLD) {
    const firstSuspected = await findFirstSuspectedAb(admin, landingPageId);
    if (firstSuspected) {
      const days =
        (Date.now() - Date.parse(firstSuspected.taken_at)) / (1000 * 60 * 60 * 24);
      if (days >= AB_TEST_CONFIRM_DAYS) {
        return {
          hasMeaningfulChange: true,
          changeAnalysis: confirmedFromAbAnalysis(prevAnalysis, diff),
        };
      }
    }
  }

  if (diff < PIXEL_DIFF_THRESHOLD) {
    return { hasMeaningfulChange: false, changeAnalysis: {} };
  }

  if (!textChanged && overlap >= MASK_NOISE_OVERLAP_THRESHOLD * 100) {
    return { hasMeaningfulChange: false, changeAnalysis: noiseAnalysis(diff, overlap) };
  }

  if (!textChanged && diff < PIXEL_DIFF_NOISE_MAX) {
    return { hasMeaningfulChange: false, changeAnalysis: noiseAnalysis(diff, overlap) };
  }

  if (isAnimationNoise(diff, threatScore, textChanged)) {
    return { hasMeaningfulChange: false, changeAnalysis: noiseAnalysis(diff, overlap) };
  }

  if (textChanged) {
    return {
      hasMeaningfulChange: true,
      changeAnalysis: withConfidence(enrichedAi, "confirmed"),
    };
  }

  return {
    hasMeaningfulChange: true,
    changeAnalysis: withConfidence(
      {
        ...enrichedAi,
        what_changed:
          enrichedAi.what_changed ??
          "A visual difference was detected outside calibrated animated areas.",
        strategic_interpretation:
          enrichedAi.strategic_interpretation ??
          "This could be an A/B test or a gradual rollout — we will confirm if it persists on the next check.",
        what_to_do:
          enrichedAi.what_to_do ??
          "Watch for a follow-up capture. If the change sticks, treat it as a real update.",
        urgency: enrichedAi.urgency ?? "low",
        threat_score: enrichedAi.threat_score ?? 4,
      },
      "suspected_ab",
    ),
  };
}

export function shouldSkipAiAnalysis(
  pixelDiffPct: number,
  textChanges: TextChangeFlags,
  maskOverlapPct?: number,
): boolean {
  if (hasAnyTextChange(textChanges)) return false;
  if ((maskOverlapPct ?? 0) >= MASK_NOISE_OVERLAP_THRESHOLD * 100) return true;
  return pixelDiffPct < PIXEL_DIFF_NOISE_MAX;
}
