import { z } from "zod";

import { emailIntelligenceOfferSchema } from "./types";

export const EMAIL_AI_ANALYSIS_VERSION = "v2";

export type EmailDeepAnalysis = {
  email_type:
    | "promotional"
    | "nurture"
    | "cart_abandonment"
    | "reengagement"
    | "newsletter"
    | "transactional"
    | "other";
  ai_angle:
    | "urgency"
    | "social_proof"
    | "scarcity"
    | "curiosity"
    | "value"
    | "authority"
    | "other";
  executive_summary: string;
  funnel_stage: string;
  confidence: "high" | "medium" | "low";
  subject_line: {
    hook: string;
    tactics: string[];
  };
  preheader_role: string | null;
  audience_signals: string[];
  persona_hint: string | null;
  persuasion_triggers: string[];
  emotional_drivers: string[];
  urgency_tactics: string[];
  copy_structure: {
    hook: string;
    body_framework: string[];
    cta_pattern: string;
    secondary_ctas: string[];
  };
  ai_offers: z.infer<typeof emailIntelligenceOfferSchema>[];
  positioning: string;
  what_works: string[];
  weaknesses: string[];
  adaptation_playbook: string[];
  esp_detected:
    | "Klaviyo"
    | "Mailchimp"
    | "HubSpot"
    | "Brevo"
    | "ActiveCampaign"
    | "other"
    | "unknown";
};

export const emailDeepAnalysisSchema: z.ZodType<EmailDeepAnalysis> = z.object({
  email_type: z.enum([
    "promotional",
    "nurture",
    "cart_abandonment",
    "reengagement",
    "newsletter",
    "transactional",
    "other",
  ]),
  ai_angle: z.enum([
    "urgency",
    "social_proof",
    "scarcity",
    "curiosity",
    "value",
    "authority",
    "other",
  ]),
  executive_summary: z.string().min(20),
  funnel_stage: z.string().min(1),
  confidence: z.enum(["high", "medium", "low"]),
  subject_line: z.object({
    hook: z.string(),
    tactics: z.array(z.string()).min(1).max(5),
  }),
  preheader_role: z.string().nullable(),
  audience_signals: z.array(z.string()).min(1).max(5),
  persona_hint: z.string().nullable(),
  persuasion_triggers: z.array(z.string()).min(1).max(5),
  emotional_drivers: z.array(z.string()).min(1).max(5),
  urgency_tactics: z.array(z.string()).max(3),
  copy_structure: z.object({
    hook: z.string(),
    body_framework: z.array(z.string()).min(2).max(4),
    cta_pattern: z.string(),
    secondary_ctas: z.array(z.string()).max(3),
  }),
  ai_offers: z.array(emailIntelligenceOfferSchema),
  positioning: z.string(),
  what_works: z.array(z.string()).min(1).max(5),
  weaknesses: z.array(z.string()).max(3),
  adaptation_playbook: z.array(z.string()).min(3).max(5),
  esp_detected: z.enum([
    "Klaviyo",
    "Mailchimp",
    "HubSpot",
    "Brevo",
    "ActiveCampaign",
    "other",
    "unknown",
  ]),
});

export function emailNeedsDeepAnalysis(row: {
  ai_analysis_version?: string | null;
  ai_deep_analysis?: unknown;
}): boolean {
  if (!row.ai_deep_analysis) return true;
  return row.ai_analysis_version !== EMAIL_AI_ANALYSIS_VERSION;
}

export function legacySummaryFromDeep(deep: EmailDeepAnalysis): string {
  const text = deep.executive_summary.trim();
  if (text.length <= 320) return text;
  const cut = text.slice(0, 317);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 200 ? cut.slice(0, lastSpace) : cut).trim() + "…";
}
