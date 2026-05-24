import { z } from "zod";

import type { CopyStructureResult } from "@/lib/comparison/copy-structure-types";

export type AdPreviewPsychologicalScores = {
  empowerment: number;
  urgency: number;
  security: number;
  authority: number;
  esteem: number;
  engagement: number;
};

export type AdPreviewAnalysis = {
  psychological_scores: AdPreviewPsychologicalScores;
  content_style: {
    label: string;
    description: string;
  };
  creative_targeting: {
    summary: string;
    audience_segments: string[];
  };
  persona: {
    age_range: string | null;
    gender: string | null;
    psychographics: string | null;
  };
  funnel_stage: string | null;
  marketing_angle: string | null;
  offer_mechanics: string | null;
  emotional_drivers: string[];
  persuasion_triggers: string[];
  scroll_stopper: string | null;
  visual_storytelling: string | null;
  competitive_moats: string[];
  risk_flags: string[];
  adaptation_playbook: string[];
  copy_structure: CopyStructureResult;
  confidence: "high" | "medium" | "low";
};

const score = z.number().min(0).max(100);

export const copyStructureSchema: z.ZodType<CopyStructureResult> = z.object({
  hook: z.string(),
  body_framework: z.array(z.string()).min(2).max(4),
  cta_pattern: z.string(),
  emotional_register: z.string(),
  adapt_for_your_brand: z.string(),
});

export const adPreviewAnalysisSchema: z.ZodType<AdPreviewAnalysis> = z.object({
  psychological_scores: z.object({
    empowerment: score,
    urgency: score,
    security: score,
    authority: score,
    esteem: score,
    engagement: score,
  }),
  content_style: z.object({
    label: z.string(),
    description: z.string(),
  }),
  creative_targeting: z.object({
    summary: z.string(),
    audience_segments: z.array(z.string()).min(1).max(5),
  }),
  persona: z.object({
    age_range: z.string().nullable(),
    gender: z.string().nullable(),
    psychographics: z.string().nullable(),
  }),
  funnel_stage: z.string().nullable(),
  marketing_angle: z.string().nullable(),
  offer_mechanics: z.string().nullable(),
  emotional_drivers: z.array(z.string()).min(1).max(5),
  persuasion_triggers: z.array(z.string()).min(1).max(5),
  scroll_stopper: z.string().nullable(),
  visual_storytelling: z.string().nullable(),
  competitive_moats: z.array(z.string()).max(4),
  risk_flags: z.array(z.string()).max(4),
  adaptation_playbook: z.array(z.string()).min(2).max(5),
  copy_structure: copyStructureSchema,
  confidence: z.enum(["high", "medium", "low"]),
});

export const PSYCHOLOGICAL_SCORE_LABELS: { key: keyof AdPreviewPsychologicalScores; label: string }[] = [
  { key: "empowerment", label: "Empowerment" },
  { key: "urgency", label: "Urgency" },
  { key: "security", label: "Security" },
  { key: "authority", label: "Authority" },
  { key: "esteem", label: "Esteem" },
  { key: "engagement", label: "Engagement" },
];
