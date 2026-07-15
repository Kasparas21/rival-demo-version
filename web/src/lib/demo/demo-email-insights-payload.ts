import { computeEmailInsights } from "@/lib/email-intelligence/compute-insights";
import type { EmailMarketingInsights } from "@/lib/email-intelligence/types";
import {
  FROZEN_EMAIL_INBOX_ROWS,
  FROZEN_EMAIL_INSIGHT_ROWS,
  type FrozenEmailInboxRow,
} from "@/lib/demo/frozen/frozen-adidas-emails";

export const DEMO_EMAIL_TRACKER_ADDRESS = "rival-iv0cmb-competitor-a-com@whxila.resend.app";

export type DemoEmailRow = FrozenEmailInboxRow & {
  received_at: string;
  email_type: string;
  preview: string;
  ai_offers: unknown[];
  ai_angle: string | null;
  esp_detected: string | null;
};

export const DEMO_EMAIL_SOURCE_ROWS: DemoEmailRow[] = FROZEN_EMAIL_INBOX_ROWS.map((row) => {
  const insight = FROZEN_EMAIL_INSIGHT_ROWS.find((r) => r.id === row.id);
  const aiOffers = insight?.ai_offers;
  return {
    ...row,
    received_at: insight?.received_at ?? new Date().toISOString(),
    email_type: insight?.email_type ?? row.type,
    preview: row.preview,
    ai_offers: Array.isArray(aiOffers) ? aiOffers : [],
    ai_angle: insight?.ai_angle ?? null,
    esp_detected: insight?.esp_detected ?? null,
  };
});

export const DEMO_EMAILS = FROZEN_EMAIL_INBOX_ROWS;

export function buildDemoEmailInsights(): EmailMarketingInsights {
  return computeEmailInsights(FROZEN_EMAIL_INSIGHT_ROWS);
}
