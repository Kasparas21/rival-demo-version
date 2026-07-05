import { z } from "zod";

export const emailIntelligenceOfferSchema = z.object({
  type: z.enum(["discount", "free_trial", "free_shipping", "gift", "other"]),
  value: z.string(),
  code: z.string().nullable(),
});

export const emailIntelligenceAnalysisSchema = z.object({
  email_type: z.enum([
    "promotional",
    "nurture",
    "cart_abandonment",
    "reengagement",
    "newsletter",
    "transactional",
    "other",
  ]),
  ai_summary: z.string(),
  ai_offers: z.array(emailIntelligenceOfferSchema),
  ai_cta: z.string().nullable(),
  ai_angle: z.enum([
    "urgency",
    "social_proof",
    "scarcity",
    "curiosity",
    "value",
    "authority",
    "other",
  ]),
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

export type EmailIntelligenceAnalysis = z.infer<typeof emailIntelligenceAnalysisSchema>;

export type CompetitorEmailRow = {
  id: string;
  tracker_id: string;
  user_id: string;
  competitor_id: string;
  from_email: string | null;
  from_name: string | null;
  subject: string | null;
  preview_text: string | null;
  html_body: string | null;
  plain_text: string | null;
  received_at: string;
  esp_detected: string | null;
  email_type: string | null;
  ai_summary: string | null;
  ai_offers: unknown;
  ai_cta: string | null;
  ai_angle: string | null;
  ai_processed_at: string | null;
  ai_analysis_error: string | null;
  ai_analysis_attempts: number;
  ai_deep_analysis: unknown;
  ai_analysis_version: string | null;
  created_at: string;
};

export type EmailRowForInsights = Pick<
  CompetitorEmailRow,
  "id" | "received_at" | "subject" | "email_type" | "ai_offers" | "ai_angle" | "esp_detected"
>;

export type EmailMarketingInsightsOffer = {
  email_id: string;
  value: string;
  code: string | null;
  type: string;
  received_at: string;
};

export type EmailMarketingInsightsSubjectLine = {
  email_id: string;
  subject: string;
  received_at: string;
  email_type: string;
};

export type EmailMarketingInsights = {
  total_emails: number;
  emails_per_week: number;
  most_active_day: string;
  avg_days_between_emails: number;
  type_breakdown: Record<string, number>;
  most_common_type: string;
  total_emails_with_offers: number;
  offer_frequency_days: number | null;
  most_common_offer_type: string | null;
  all_offers: EmailMarketingInsightsOffer[];
  avg_subject_length: number;
  emoji_usage_percent: number;
  subject_lines: EmailMarketingInsightsSubjectLine[];
  angle_breakdown: Record<string, number>;
  most_common_angle: string | null;
  esp_detected: string | null;
};
