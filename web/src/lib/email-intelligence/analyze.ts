import { llmFast } from "@/lib/llm/anthropic";
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
import {
  detectNonMarketingEmail,
  SKIPPED_TRANSACTIONAL_ANALYSIS_VERSION,
  type NonMarketingEmailDetection,
} from "./detect-non-marketing-email";
import {
  EMAIL_AI_ANALYSIS_VERSION,
  emailDeepAnalysisSchema,
  emailNeedsDeepAnalysis,
  legacySummaryFromDeep,
  type EmailDeepAnalysis,
} from "./email-deep-analysis-types";

const SYSTEM_PROMPT = `You are a senior competitive intelligence analyst specializing in email marketing.

Study the competitor email like a strategist: subject line hooks, preheader role, funnel stage, audience signals, persuasion and urgency tactics, copy structure, offers, positioning, what works, weaknesses, and an adaptation playbook the user can apply to their own campaigns.

Return ONLY a valid JSON object. No markdown, no preamble, no explanation.`;

export type AnalyzeCompetitorEmailResult =
  | { ok: true }
  | { ok: false; error: string; quotaExceeded?: boolean; attemptsExhausted?: boolean };

export { EMAIL_AI_ANALYSIS_VERSION, emailNeedsDeepAnalysis };

export function stripJsonFences(text: string): string {
  let t = text.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
  }
  return t.trim();
}

function normalizeEspInJson(json: Record<string, unknown>): void {
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
}

export function parseEmailDeepAnalysisFromLlmText(text: string): EmailDeepAnalysis {
  const json = JSON.parse(stripJsonFences(text)) as Record<string, unknown>;
  normalizeEspInJson(json);
  return emailDeepAnalysisSchema.parse(json);
}

/** @deprecated Use parseEmailDeepAnalysisFromLlmText — kept for legacy tests */
export function parseEmailIntelligenceAnalysisFromLlmText(text: string) {
  const deep = parseEmailDeepAnalysisFromLlmText(text);
  return {
    email_type: deep.email_type,
    ai_summary: legacySummaryFromDeep(deep),
    ai_offers: deep.ai_offers,
    ai_cta: deep.copy_structure.cta_pattern || null,
    ai_angle: deep.ai_angle,
    esp_detected: deep.esp_detected,
  };
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
  preview_text: string | null;
  from_name: string | null;
  from_email: string | null;
  body: string;
}): string {
  const subject = args.subject?.trim() || "(no subject)";
  const preheader = args.preview_text?.trim() || "(none)";
  const fromName = args.from_name?.trim() || "";
  const fromEmail = args.from_email?.trim() || "";
  const fromLine =
    fromName && fromEmail ? `${fromName} <${fromEmail}>` : fromEmail || fromName || "unknown";

  return `Analyze this competitor marketing email and return JSON.

Subject: ${subject}
Preheader / preview text: ${preheader}
From: ${fromLine}

Body:

${args.body}

Return this exact JSON shape:

{
  "email_type": "promotional|nurture|cart_abandonment|reengagement|newsletter|transactional|other",
  "ai_angle": "urgency|social_proof|scarcity|curiosity|value|authority|other",
  "executive_summary": "3-4 sentences on strategy, offer, and competitive positioning",
  "funnel_stage": "awareness|consideration|conversion|retention|winback",
  "confidence": "high|medium|low",
  "subject_line": { "hook": "what makes the subject work or fail", "tactics": ["2-4 specific tactics"] },
  "preheader_role": "how preview text supports the subject or null",
  "audience_signals": ["2-4 inferred audience segments or intents"],
  "persona_hint": "likely persona or null",
  "persuasion_triggers": ["2-4 triggers e.g. social proof, exclusivity"],
  "emotional_drivers": ["2-3 emotions targeted"],
  "urgency_tactics": ["0-3 urgency/scarcity devices"],
  "copy_structure": {
    "hook": "opening hook pattern",
    "body_framework": ["2-4 structural beats in order"],
    "cta_pattern": "primary CTA wording or pattern",
    "secondary_ctas": ["0-3 secondary CTAs"]
  },
  "ai_offers": [{ "type": "discount|free_trial|free_shipping|gift|other", "value": "string", "code": "string or null" }],
  "positioning": "how the brand positions itself vs alternatives",
  "what_works": ["2-4 strengths worth studying"],
  "weaknesses": ["0-3 gaps or risks"],
  "adaptation_playbook": ["3-5 actionable bullets for the user's own campaigns"],
  "esp_detected": "Klaviyo|Mailchimp|HubSpot|Brevo|ActiveCampaign|other|unknown"
}

If no offers exist, return ai_offers as [].`;
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

async function markSkippedNonMarketingEmail(
  emailId: string,
  detection: NonMarketingEmailDetection,
  existingEsp: string | null,
): Promise<void> {
  const admin = createSupabaseAdminClient();
  await admin
    .from("competitor_emails")
    .update({
      email_type: "transactional",
      ai_summary: detection.summary,
      ai_offers: [],
      ai_cta: null,
      ai_angle: null,
      esp_detected: existingEsp?.trim() || "Unknown",
      ai_deep_analysis: null,
      ai_analysis_version: SKIPPED_TRANSACTIONAL_ANALYSIS_VERSION,
      ai_processed_at: new Date().toISOString(),
      ai_analysis_error: null,
      ai_analysis_attempts: 0,
    })
    .eq("id", emailId);
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
      ai_deep_analysis: null,
      ai_analysis_version: null,
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
      "id, user_id, competitor_id, subject, preview_text, from_name, from_email, plain_text, html_body, esp_detected, ai_processed_at, ai_analysis_attempts, ai_analysis_error, ai_analysis_version, ai_deep_analysis, received_at",
    )
    .eq("id", emailId)
    .maybeSingle();

  if (fetchErr || !row) {
    return { ok: false, error: fetchErr?.message ?? "Email not found" };
  }

  let body = row.plain_text?.trim() || "";
  if (!body && row.html_body?.trim()) {
    body = stripHtmlToPlainText(row.html_body);
  }
  body = body.slice(0, 6000);

  const nonMarketing = detectNonMarketingEmail({
    subject: row.subject,
    preview_text: row.preview_text,
    body,
  });

  if (nonMarketing) {
    const alreadySkipped =
      row.ai_processed_at &&
      row.ai_analysis_version === SKIPPED_TRANSACTIONAL_ANALYSIS_VERSION;
    if (!alreadySkipped) {
      await markSkippedNonMarketingEmail(emailId, nonMarketing, row.esp_detected);
    }
    return { ok: true };
  }

  const needsUpgrade = emailNeedsDeepAnalysis(row);

  if (row.ai_processed_at && !needsUpgrade) {
    return { ok: true };
  }

  if (needsUpgrade && row.ai_processed_at) {
    await admin
      .from("competitor_emails")
      .update({ ai_analysis_error: null, ai_analysis_attempts: 0 })
      .eq("id", emailId);
  } else if ((row.ai_analysis_attempts ?? 0) >= MAX_AI_ANALYSIS_ATTEMPTS) {
    return {
      ok: false,
      error: row.ai_analysis_error ?? "Analysis failed after multiple attempts",
      attemptsExhausted: true,
    };
  }

  const billing = await getBillingEntitlement(admin, row.user_id);
  if (billing.isAdminSuspended) {
    return { ok: false, error: "Account suspended — AI analysis is disabled.", quotaExceeded: true };
  }
  const usedThisMonth = await loadEmailAiAnalysisUsage(admin, row.user_id);
  const quotaCheck = canRunEmailAiAnalysis(billing, usedThisMonth);
  if (!quotaCheck.ok) {
    return { ok: false, error: quotaCheck.error, quotaExceeded: true };
  }

  const res = await llmFast({
    task: "email_intelligence",
    systemPrompt: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: buildUserPrompt({
          subject: row.subject,
          preview_text: row.preview_text,
          from_name: row.from_name,
          from_email: row.from_email,
          body: body || "(empty body)",
        }),
      },
    ],
    maxTokens: 2200,
  });

  if (!res.ok) {
    await recordAnalysisFailure(emailId, row.ai_analysis_attempts ?? 0, res.error);
    return { ok: false, error: res.error };
  }

  let parsed: EmailDeepAnalysis;
  try {
    parsed = parseEmailDeepAnalysisFromLlmText(res.text);
  } catch {
    const msg = "Invalid AI JSON response";
    await recordAnalysisFailure(emailId, row.ai_analysis_attempts ?? 0, msg);
    return { ok: false, error: msg };
  }

  const espDetected = normalizeEspForDb(parsed.esp_detected, row.esp_detected);
  const aiSummary = legacySummaryFromDeep(parsed);
  const aiCta = parsed.copy_structure.cta_pattern?.trim() || null;

  const { error: updateErr } = await admin
    .from("competitor_emails")
    .update({
      email_type: parsed.email_type,
      ai_summary: aiSummary,
      ai_offers: parsed.ai_offers as Json,
      ai_cta: aiCta,
      ai_angle: parsed.ai_angle,
      esp_detected: espDetected,
      ai_deep_analysis: parsed as Json,
      ai_analysis_version: EMAIL_AI_ANALYSIS_VERSION,
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
        ai_summary: aiSummary,
        ai_offers: parsed.ai_offers,
        ai_angle: parsed.ai_angle,
        received_at: row.received_at,
      },
    });
  } catch (err) {
    console.error("[analyze] alert generation failed", err);
  }

  try {
    const { fetchEmailForAgent } = await import("@/lib/agent/fetch-scrape-deltas");
    const { runAgentForUserCompetitor } = await import("@/lib/agent/run-agent");
    const emailForAgent = await fetchEmailForAgent(admin, emailId);
    if (emailForAgent) {
      await runAgentForUserCompetitor(admin, {
        userId: row.user_id,
        competitorId: row.competitor_id,
        scrapeResults: { newEmails: [emailForAgent] },
      });
    }
  } catch (err) {
    console.error("[analyze] rival-agent failed", err);
  }

  return { ok: true };
}
