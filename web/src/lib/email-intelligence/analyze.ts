import { anthropicHaiku } from "@/lib/llm/anthropic";
import { generateAlertsForEmail } from "@/lib/alerts/generate-alerts-for-email";
import { getBillingEntitlement } from "@/lib/billing/entitlements";
import {
  canRunEmailAiAnalysis,
  incrementEmailAiAnalysisUsage,
  loadEmailAiAnalysisUsage,
} from "@/lib/billing/usage-quotas";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/types";

import { MAX_AI_ANALYSIS_ATTEMPTS } from "./constants";
import { emailIntelligenceAnalysisSchema } from "./types";

const SYSTEM_PROMPT = `You are a competitive intelligence analyst specializing in email marketing.

Return ONLY a valid JSON object. No markdown, no preamble, no explanation.`;

export type AnalyzeCompetitorEmailResult =
  | { ok: true }
  | { ok: false; error: string; quotaExceeded?: boolean; attemptsExhausted?: boolean };

export function stripJsonFences(text: string): string {
  let t = text.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
  }
  return t.trim();
}

export function parseEmailIntelligenceAnalysisFromLlmText(text: string) {
  const json = JSON.parse(stripJsonFences(text)) as Record<string, unknown>;
  if (typeof json.esp_detected === "string") {
    const espMap: Record<string, string> = {
      klaviyo: "Klaviyo",
      mailchimp: "Mailchimp",
      hubspot: "HubSpot",
      brevo: "Brevo",
      activecampaign: "ActiveCampaign",
      unknown: "unknown",
      other: "other",
    };
    const key = json.esp_detected.trim().toLowerCase();
    json.esp_detected = espMap[key] ?? json.esp_detected;
  }
  return emailIntelligenceAnalysisSchema.parse(json);
}

export function stripHtmlToPlainText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildUserPrompt(args: {
  subject: string | null;
  from_name: string | null;
  from_email: string | null;
  body: string;
}): string {
  const subject = args.subject?.trim() || "(no subject)";
  const fromName = args.from_name?.trim() || "";
  const fromEmail = args.from_email?.trim() || "";
  const fromLine =
    fromName && fromEmail ? `${fromName} <${fromEmail}>` : fromEmail || fromName || "unknown";

  return `Analyze this competitor marketing email and return JSON.
Subject: ${subject}

From: ${fromLine}
Body:

${args.body}

Return this exact JSON shape:

{
  "email_type": "promotional|nurture|cart_abandonment|reengagement|newsletter|transactional|other",
  "ai_summary": "2 sentences max describing what this email does and how",
  "ai_offers": [{ "type": "discount|free_trial|free_shipping|gift|other", "value": "string", "code": "string or null" }],
  "ai_cta": "main call to action text or null",
  "ai_angle": "urgency|social_proof|scarcity|curiosity|value|authority|other",
  "esp_detected": "Klaviyo|Mailchimp|HubSpot|Brevo|ActiveCampaign|other|unknown"
}

If no offers exist, return ai_offers as an empty array [].`;
}

function normalizeEspForDb(aiEsp: string, existingEsp: string | null): string {
  const normalized = aiEsp.trim();
  if (!normalized || normalized.toLowerCase() === "unknown") {
    return existingEsp?.trim() || "Unknown";
  }
  if (normalized.toLowerCase() === "other") {
    return existingEsp?.trim() || "Unknown";
  }
  return normalized;
}

async function recordAnalysisFailure(
  emailId: string,
  currentAttempts: number,
  errorMessage: string,
): Promise<void> {
  const admin = createSupabaseAdminClient();
  const nextAttempts = currentAttempts + 1;
  await admin
    .from("competitor_emails")
    .update({
      ai_analysis_attempts: nextAttempts,
      ai_analysis_error: errorMessage.slice(0, 500),
    })
    .eq("id", emailId);
}

export async function resetEmailAnalysisForRetry(emailId: string): Promise<{ ok: boolean; error?: string }> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("competitor_emails")
    .update({
      ai_analysis_error: null,
      ai_analysis_attempts: 0,
      ai_processed_at: null,
    })
    .eq("id", emailId);

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function analyzeCompetitorEmail(emailId: string): Promise<AnalyzeCompetitorEmailResult> {
  const admin = createSupabaseAdminClient();

  const { data: row, error: fetchErr } = await admin
    .from("competitor_emails")
    .select(
      "id, user_id, competitor_id, subject, from_name, from_email, plain_text, html_body, esp_detected, ai_processed_at, ai_analysis_attempts, ai_analysis_error, received_at",
    )
    .eq("id", emailId)
    .maybeSingle();

  if (fetchErr || !row) {
    return { ok: false, error: fetchErr?.message ?? "Email not found" };
  }

  if (row.ai_processed_at) {
    return { ok: true };
  }

  if ((row.ai_analysis_attempts ?? 0) >= MAX_AI_ANALYSIS_ATTEMPTS) {
    return {
      ok: false,
      error: row.ai_analysis_error ?? "Analysis failed after multiple attempts",
      attemptsExhausted: true,
    };
  }

  const billing = await getBillingEntitlement(admin, row.user_id);
  const usedThisMonth = await loadEmailAiAnalysisUsage(admin, row.user_id);
  const quotaCheck = canRunEmailAiAnalysis(billing, usedThisMonth);
  if (!quotaCheck.ok) {
    return { ok: false, error: quotaCheck.error, quotaExceeded: true };
  }

  let body = row.plain_text?.trim() || "";
  if (!body && row.html_body?.trim()) {
    body = stripHtmlToPlainText(row.html_body);
  }
  body = body.slice(0, 3000);

  const res = await anthropicHaiku({
    systemPrompt: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: buildUserPrompt({
          subject: row.subject,
          from_name: row.from_name,
          from_email: row.from_email,
          body: body || "(empty body)",
        }),
      },
    ],
    maxTokens: 1024,
  });

  if (!res.ok) {
    await recordAnalysisFailure(emailId, row.ai_analysis_attempts ?? 0, res.error);
    return { ok: false, error: res.error };
  }

  let parsed: ReturnType<typeof emailIntelligenceAnalysisSchema.parse>;
  try {
    parsed = parseEmailIntelligenceAnalysisFromLlmText(res.text);
  } catch {
    const msg = "Invalid AI JSON response";
    await recordAnalysisFailure(emailId, row.ai_analysis_attempts ?? 0, msg);
    return { ok: false, error: msg };
  }

  const espDetected = normalizeEspForDb(parsed.esp_detected, row.esp_detected);

  const { error: updateErr } = await admin
    .from("competitor_emails")
    .update({
      email_type: parsed.email_type,
      ai_summary: parsed.ai_summary,
      ai_offers: parsed.ai_offers as Json,
      ai_cta: parsed.ai_cta,
      ai_angle: parsed.ai_angle,
      esp_detected: espDetected,
      ai_processed_at: new Date().toISOString(),
      ai_analysis_error: null,
    })
    .eq("id", emailId);

  if (updateErr) {
    await recordAnalysisFailure(emailId, row.ai_analysis_attempts ?? 0, updateErr.message);
    return { ok: false, error: updateErr.message };
  }

  try {
    await incrementEmailAiAnalysisUsage(admin, row.user_id);
  } catch (err) {
    console.error("[analyze] usage increment failed", err);
  }

  try {
    await generateAlertsForEmail({
      supabase: admin,
      userId: row.user_id,
      competitorId: row.competitor_id,
      email: {
        id: emailId,
        competitor_id: row.competitor_id,
        subject: row.subject,
        email_type: parsed.email_type,
        ai_summary: parsed.ai_summary,
        ai_offers: parsed.ai_offers,
        ai_angle: parsed.ai_angle,
        received_at: row.received_at,
      },
    });
  } catch (err) {
    console.error("[analyze] alert generation failed", err);
  }

  return { ok: true };
}
