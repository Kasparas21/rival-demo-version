import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "@/lib/supabase/types";

import type { LandingPageChangeAnalysis, LandingPageText } from "./constants";
import {
  AB_TEST_CONFIRM_DAYS,
  LOW_THREAT_MAX,
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

function noiseAnalysis(pixelDiffPct: number): LandingPageChangeAnalysis {
  return {
    change_confidence: "noise",
    what_changed: "No meaningful change detected.",
    strategic_interpretation:
      "Pixel difference is likely from animations, loading states, or screenshot timing — not a real page update.",
    what_to_do: "No action needed.",
    urgency: "low",
    threat_score: 0,
    sections_changed: [],
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
  textChanges: TextChangeFlags;
  prevSnapshot: Database["public"]["Tables"]["landing_page_snapshots"]["Row"] | null;
  aiAnalysis: LandingPageChangeAnalysis;
}): Promise<{ hasMeaningfulChange: boolean; changeAnalysis: LandingPageChangeAnalysis }> {
  const { admin, landingPageId, pixelDiffPct, textChanges, prevSnapshot, aiAnalysis } = params;
  const textChanged = hasAnyTextChange(textChanges);
  const diff = pixelDiffPct ?? 0;
  const threatScore = aiAnalysis.threat_score ?? 0;
  const prevConfidence = parseConfidence(prevSnapshot?.change_analysis ?? null);
  const prevAnalysis = (prevSnapshot?.change_analysis ?? {}) as LandingPageChangeAnalysis;

  // Variant held steady after a suspected A/B test (e.g. red button on capture 2 and 3).
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

  // Time-based confirmation: suspected change still live after a week.
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

  // Skip treating tiny visual-only shifts as changes (animations, shimmer, etc.).
  if (!textChanged && diff < PIXEL_DIFF_NOISE_MAX) {
    return { hasMeaningfulChange: false, changeAnalysis: noiseAnalysis(diff) };
  }

  if (isAnimationNoise(diff, threatScore, textChanged)) {
    return { hasMeaningfulChange: false, changeAnalysis: noiseAnalysis(diff) };
  }

  // Copy or pricing updates are meaningful immediately.
  if (textChanged) {
    return {
      hasMeaningfulChange: true,
      changeAnalysis: withConfidence(aiAnalysis, "confirmed"),
    };
  }

  // Visual-only change — might be an A/B test until it persists.
  return {
    hasMeaningfulChange: true,
    changeAnalysis: withConfidence(
      {
        ...aiAnalysis,
        what_changed:
          aiAnalysis.what_changed ??
          "A visual difference was detected in the hero section.",
        strategic_interpretation:
          aiAnalysis.strategic_interpretation ??
          "This could be an A/B test or a gradual rollout — we will confirm if it persists on the next check.",
        what_to_do:
          aiAnalysis.what_to_do ??
          "Watch for a follow-up capture. If the change sticks, treat it as a real update.",
        urgency: aiAnalysis.urgency ?? "low",
        threat_score: aiAnalysis.threat_score ?? 4,
      },
      "suspected_ab",
    ),
  };
}

export function shouldSkipAiAnalysis(
  pixelDiffPct: number,
  textChanges: TextChangeFlags,
): boolean {
  return !hasAnyTextChange(textChanges) && pixelDiffPct < PIXEL_DIFF_NOISE_MAX;
}
