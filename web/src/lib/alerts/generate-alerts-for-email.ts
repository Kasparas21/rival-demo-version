import type { SupabaseClient } from "@supabase/supabase-js";

import {
  buildAlertBody,
  buildAlertTitle,
  buildCompetitorEmailDedupeKey,
  DEFAULT_SEVERITY,
  MARKETING_EMAIL_ALERT_TYPES,
  type AlertCopyParams,
} from "@/lib/alerts/alert-types";
import { resolveRuleForType } from "@/lib/alerts/seed-default-rules";
import { getBillingEntitlement } from "@/lib/billing/entitlements";
import type { Database, Json } from "@/lib/supabase/types";

type EmailForAlert = {
  id: string;
  competitor_id: string;
  subject: string | null;
  email_type: string | null;
  ai_summary: string | null;
  ai_offers: unknown;
  ai_angle: string | null;
  received_at: string;
};

export async function generateAlertsForEmail(params: {
  supabase: SupabaseClient<Database>;
  userId: string;
  competitorId: string;
  email: EmailForAlert;
}): Promise<void> {
  const emailType = params.email.email_type?.trim();
  if (!emailType || !MARKETING_EMAIL_ALERT_TYPES.has(emailType)) {
    return;
  }

  const [billing, compRes, rulesRes] = await Promise.all([
    getBillingEntitlement(params.supabase, params.userId),
    params.supabase
      .from("saved_competitors")
      .select("name, brand_name")
      .eq("id", params.competitorId)
      .eq("user_id", params.userId)
      .maybeSingle(),
    params.supabase.from("alert_rules").select("*").eq("user_id", params.userId),
  ]);

  const canCustomizeRules = billing.limits.allowAlertRules === true;
  const rules = rulesRes.data ?? [];
  if (canCustomizeRules) {
    const rule = resolveRuleForType(rules, "competitor_email", params.competitorId);
    if (rule && rule.enabled === false) return;
  }

  const competitorName =
    compRes.data?.brand_name?.trim() || compRes.data?.name?.trim() || "Competitor";

  const copyParams: AlertCopyParams = {
    competitorName,
    emailType,
    emailSubject: params.email.subject,
  };

  const detectedAt =
    params.email.received_at && !Number.isNaN(Date.parse(params.email.received_at))
      ? new Date(params.email.received_at).toISOString()
      : new Date().toISOString();

  const { error } = await params.supabase.from("competitor_alerts").upsert(
    {
      user_id: params.userId,
      competitor_id: params.competitorId,
      alert_type: "competitor_email",
      severity: DEFAULT_SEVERITY.competitor_email,
      title: buildAlertTitle("competitor_email", copyParams),
      body: buildAlertBody("competitor_email", copyParams),
      metadata: {
        emailId: params.email.id,
        email_type: emailType,
        subject: params.email.subject,
        ai_summary: params.email.ai_summary,
        ai_offers: params.email.ai_offers,
        ai_angle: params.email.ai_angle,
      } as Json,
      detected_at: detectedAt,
      source_scrape_batch_id: null,
      dedupe_key: buildCompetitorEmailDedupeKey(params.competitorId, params.email.id),
      is_read: false,
    },
    { onConflict: "user_id,competitor_id,dedupe_key", ignoreDuplicates: true },
  );

  if (error) {
    console.error("[generate-alerts-for-email] insert failed", error.message);
  }
}
